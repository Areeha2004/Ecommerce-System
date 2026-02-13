import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { registerChatRoutes } from "./replit_integrations/chat";
import { openai } from "./replit_integrations/image/client"; // Use the exported instance from image client
import { products } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register the standard Chat routes from the integration
  registerChatRoutes(app);

  // --- Products ---
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    // In a real DB we would filter here. For mock, we filter in memory if needed or just return all.
    // Frontend handles filtering/sorting mostly for this "Client-side" feel.
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  // --- Specialized Chat/Action Endpoint (The "Clerk") ---
  app.post(api.chat.message.path, async (req, res) => {
    try {
      const { message, context } = req.body;
      const productCatalog = await storage.getProducts();
      
      // System prompt to define the Clerk's persona and capabilities
      const systemPrompt = `
        You are "The Clerk", a helpful, witty, and knowledgeable AI personal shopper for "Shopkeeper".
        
        Your capabilities:
        1.  **Semantic Search**: Recommend products based on vibe/occasion.
        2.  **Inventory Check**: You know the product catalog.
        3.  **Actions**: You can trigger actions on the UI.
        
        Product Catalog: ${JSON.stringify(productCatalog.map(p => ({ id: p.id, name: p.name, price: p.price, category: p.category, colors: p.colors })))}
        
        Output Format:
        You must return a JSON object (NOT markdown, just raw JSON) with this structure:
        {
          "message": "Your text response to the user...",
          "action": "OPTIONAL_ACTION_NAME",
          "data": { ...optional action data... }
        }
        
        Supported Actions:
        - "update_filter": If user wants specific category or price range. Data: { category: string, sort: 'price_asc' | 'price_desc' }
        - "recommend_product": If user asks for specific recommendations. Data: { productIds: [1, 2] }
        - "negotiate": If user asks for a discount or says "too expensive". Data: { intent: "start_negotiation" }
        
        Tone: Professional but friendly. If the user mentions a specific occasion, be enthusiastic.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `User says: "${message}". Context: ${JSON.stringify(context || {})}` }
        ],
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0].message.content;
      const parsedResponse = JSON.parse(responseContent || "{}");

      res.json(parsedResponse);

    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "The Clerk is taking a nap." });
    }
  });

  // --- Negotiation Endpoint ---
  app.post(api.negotiate.offer.path, async (req, res) => {
    try {
      const { message, cartTotal } = req.body;
      
      const systemPrompt = `
        You are a negotiation bot for "Shopkeeper". You have a hidden "Bottom Price" (which is 80% of the cart total).
        Cart Total: $${cartTotal}.
        Max Discount: 20%.
        
        Rules:
        1. If user gives a good reason (birthday, bulk buy, funny story), offer a discount code.
        2. If user is rude or lowballs too hard without reason, refuse.
        3. If convinced, generate a code like "DEAL-15" (15% off) or "BDAY-20" (20% off).
        4. Be witty. "Haggle Mode" is a game.
        
        Output JSON:
        {
          "message": "Your response...",
          "discountCode": "CODE" or null,
          "discountAmount": number (percentage, e.g. 15) or null
        }
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" }
      });

      const parsedResponse = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(parsedResponse);

    } catch (error) {
       console.error("Negotiation error:", error);
       res.status(500).json({ message: "I can't haggle right now." });
    }
  });

  return httpServer;
}
