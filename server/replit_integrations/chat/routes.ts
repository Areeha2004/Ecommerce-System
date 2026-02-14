import type { Express, Request, Response } from "express";
import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// In-memory chat storage for sessions
const chatSessions = new Map<number, { id: number, title: string, messages: any[] }>();
let nextSessionId = 1;

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    res.json(Array.from(chatSessions.values()));
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const conversation = chatSessions.get(id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    res.json(conversation);
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    const { title } = req.body;
    const id = nextSessionId++;
    const conversation = { id, title: (title as string) || "New Chat", messages: [] };
    chatSessions.set(id, conversation);
    res.status(201).json(conversation);
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    chatSessions.delete(id);
    res.status(204).send();
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id as string);
      const { content } = req.body;
      const conversation = chatSessions.get(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Save user message
      conversation.messages.push({ role: "user", content });

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream response from OpenAI
      const stream = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: conversation.messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant message
      conversation.messages.push({ role: "assistant", content: fullResponse });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

