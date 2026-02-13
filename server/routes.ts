import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { registerChatRoutes } from "./replit_integrations/chat";
import { getOpenAI } from "./replit_integrations/image/client";
import { products } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register the standard Chat routes from the integration
  registerChatRoutes(app);

  // --- Products ---
  app.get(api.products.list.path, async (req, res) => {
    let products = await storage.getProducts();
    const { category, sort, search } = req.query;

    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }

    if (search) {
      const query = String(search).toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
      );
    }

    if (sort === 'price_asc') {
      products.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === 'price_desc') {
      products.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === 'rating') {
      products.sort((a, b) => Number(b.rating) - Number(a.rating));
    }

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
      const { message } = req.body;
      const productCatalog = await storage.getProducts();

      const systemPrompt = `
        You are "The Clerk", a charming, witty, and persuasive AI personal shopper for "Shopkeeper".
        
        Your character:
        - You are a master negotiator.
        - You are helpful but have a "spine" (you won't just give everything away).
        - If the user is rude, you might even increase prices by 5% as a "politeness tax".
        - If the user gives a good reason (birthday, student, buying multiple items), you can offer 10-20% discounts.
        - Use humor and wit.

        Product Catalog (Metadata for semantic search):
        ${JSON.stringify(productCatalog.map(p => ({ 
          id: p.id, 
          name: p.name, 
          description: p.description,
          price: Number(p.price), 
          rating: Number(p.rating),
          category: p.category, 
          colors: p.colors,
          stock: p.stock
        })))}

        Guidelines:
        - When a user asks for products, use the 'search_products' tool.
        - When a user wants to add to cart, use 'add_to_cart'.
        - When a user wants to sort, use 'sort_products'.
        - When a user negotiates successfully, use 'apply_coupon'.
      `;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_products",
              description: "Filter or search products from the catalog.",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string", description: "The search query or vibe" },
                  category: { type: "string" }
                }
              }
            }
          },
          {
            type: "function",
            function: {
              name: "add_to_cart",
              description: "Add a specific product to the cart.",
              parameters: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  quantity: { type: "number" }
                },
                required: ["productId", "quantity"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "sort_products",
              description: "Change the sorting of products in the UI.",
              parameters: {
                type: "object",
                properties: {
                  sortBy: { type: "string", enum: ["price_low", "price_high"] }
                },
                required: ["sortBy"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "apply_coupon",
              description: "Apply a discount coupon to the cart.",
              parameters: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  discount: { type: "number", description: "Percentage discount" }
                },
                required: ["code", "discount"]
              }
            }
          }
        ],
        tool_choice: "auto"
      });

      const choice = response.choices[0];
      
      // Handle the case where the model responds with content and no tool calls
      if (choice.finish_reason === "stop") {
        return res.json({
          role: "assistant",
          content: choice.message.content
        });
      }

      // If tool calls exist, we send them back to the frontend to handle
      res.json({
        role: "assistant",
        content: choice.message.content,
        tool_calls: choice.message.tool_calls
      });

    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "The Clerk is taking a break." });
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

      const completion = await getOpenAI().chat.completions.create({
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
