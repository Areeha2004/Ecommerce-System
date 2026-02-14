import type { Express, Request, Response } from "express";
import type { Server } from "http";
import OpenAI from "openai";
import { storage } from "./storage";
import { api } from "@shared/routes";
import type { Product } from "@shared/schema";

// Initialize OpenAI once
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ClerkAction =
  | { type: "search_products"; query?: string; category?: string }
  | { type: "sort_products"; sortBy: "price_asc" | "price_desc" | "rating" }
  | { type: "add_to_cart"; productId: number; quantity: number }
  | { type: "apply_coupon"; code: string; discountAmount: number; reason?: string };

type ProductCardData = {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviewsCount: number;
  category: string;
  stock: number;
  image: string;
  url: string;
};

type ShopperProfile = {
  viewedCategories: string[];
  addedProductIds: number[];
  recentlyViewedProductIds: number[];
  preferredSort: "price_asc" | "price_desc" | "rating" | null;
  lastMentionedProductId: number | null;
  lastShownProductIds: number[];
  lastQuery: string;
};

const shopperProfiles = new Map<string, ShopperProfile>();

function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});
}

function getSessionId(req: Request, res: Response): string {
  const cookies = parseCookies(req);
  const existing = cookies.clerk_session;
  if (existing) return existing;

  const created = `clerk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  res.setHeader(
    "Set-Cookie",
    `clerk_session=${encodeURIComponent(created)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
  );
  return created;
}

function getOrCreateProfile(sessionId: string): ShopperProfile {
  const existing = shopperProfiles.get(sessionId);
  if (existing) return existing;

  const created: ShopperProfile = {
    viewedCategories: [],
    addedProductIds: [],
    recentlyViewedProductIds: [],
    preferredSort: null,
    lastMentionedProductId: null,
    lastShownProductIds: [],
    lastQuery: "",
  };
  shopperProfiles.set(sessionId, created);
  return created;
}

function toProductCard(product: Product): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    rating: Number(product.rating),
    reviewsCount: Math.max(24, Math.round(Number(product.rating) * 30)),
    category: product.category,
    stock: product.stock,
    image: product.image,
    url: `/product/${product.id}`,
  };
}

function pushUnique(list: number[], values: number[], max = 24): number[] {
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    const normalized = Number(value);
    if (!list.includes(normalized)) {
      list.push(normalized);
    }
  }
  if (list.length > max) {
    return list.slice(list.length - max);
  }
  return list;
}

function semanticSearchProducts(
  products: Product[],
  query: string,
  options?: { category?: string; maxPrice?: number; minRating?: number; limit?: number; profile?: ShopperProfile },
): Product[] {
  const q = query.toLowerCase();
  const tokens = q.split(/\W+/).filter(Boolean);
  const limit = options?.limit ?? 4;

  const scored = products
    .filter((p) => {
      if (options?.category && p.category.toLowerCase() !== options.category.toLowerCase()) return false;
      if (typeof options?.maxPrice === "number" && Number(p.price) > options.maxPrice) return false;
      if (typeof options?.minRating === "number" && Number(p.rating) < options.minRating) return false;
      return true;
    })
    .map((product) => {
      const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();
      let score = 0;

      for (const token of tokens) {
        if (haystack.includes(token)) score += 2;
      }

      if (q.includes("summer") || q.includes("italy") || q.includes("wedding")) {
        if (/(cashmere|boots|wool|heavy|sweater)/i.test(product.name + " " + product.description)) {
          score -= 10;
        }
        if (["Clothing", "Accessories"].includes(product.category)) score += 3;
        if (/(linen|sunglass|dress|shirt|blazer|loafer)/i.test(product.name + " " + product.description)) score += 3;
        if (/(cashmere|boots|sweater)/i.test(product.name + " " + product.description)) score -= 2;
      }

      if (q.includes("cheap") || q.includes("cheaper") || q.includes("budget")) {
        score += Math.max(0, 200 - Number(product.price)) / 30;
      }

      if (options?.profile?.viewedCategories.includes(product.category)) {
        score += 1.5;
      }

      if (options?.profile?.recentlyViewedProductIds.includes(product.id)) {
        score += 2;
      }

      if (options?.profile?.addedProductIds.includes(product.id)) {
        score += 1;
      }

      score += Number(product.rating);
      return { product, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);

  return scored;
}

function pickProductByIdOrName(products: Product[], args: { productId?: number; productName?: string }): Product | null {
  if (typeof args.productId === "number") {
    return products.find((p) => p.id === args.productId) ?? null;
  }

  if (typeof args.productName === "string" && args.productName.trim()) {
    const normalized = args.productName.toLowerCase();
    return products.find((p) => p.name.toLowerCase().includes(normalized)) ?? null;
  }

  return null;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function colorMatches(requestedColor: string, availableColor: string): boolean {
  const requested = normalizeText(requestedColor);
  const available = normalizeText(availableColor);
  if (!requested || !available) return false;
  if (requested === available) return true;
  return available.includes(requested) || requested.includes(available);
}

function extractRequestedColor(message: string): string | null {
  const normalized = normalizeText(message);
  const basicColors = [
    "blue", "red", "green", "black", "white", "brown", "tan", "grey", "gray",
    "navy", "beige", "pink", "gold", "silver", "olive", "khaki",
  ];

  for (const color of basicColors) {
    if (normalized.includes(color)) return color;
  }
  return null;
}

function findDirectProductMention(message: string, products: Product[]): Product | null {
  const normalizedMessage = normalizeText(message);
  let best: { product: Product; score: number } | null = null;

  for (const product of products) {
    const normalizedName = normalizeText(product.name);
    let score = 0;

    if (normalizedMessage.includes(normalizedName)) {
      score += 100;
    }

    for (const token of normalizedName.split(" ")) {
      if (token.length < 4) continue;
      if (normalizedMessage.includes(token)) score += 8;
    }

    if (/(dress|shirt|blazer|chinos|sunglasses|loafers|boots|tie)/i.test(normalizedMessage)) {
      const description = normalizeText(product.description);
      if (normalizedMessage.includes(normalizeText(product.category))) score += 3;
      for (const token of normalizeText(product.name).split(" ")) {
        if (token.length >= 4 && normalizedMessage.includes(token)) score += 3;
      }
      for (const token of description.split(" ")) {
        if (token.length >= 6 && normalizedMessage.includes(token)) score += 1;
      }
    }

    if (!best || score > best.score) {
      best = { product, score };
    }
  }

  return best && best.score >= 8 ? best.product : null;
}

function extractRequestedQuantity(message: string): number {
  const match = message.match(/\b(\d{1,2})\s*(x|qty|quantity|pieces?)?\b/i);
  if (!match) return 1;
  const qty = Number(match[1]);
  if (!Number.isFinite(qty)) return 1;
  return Math.max(1, Math.min(10, qty));
}

function profileActivitySummary(profile: ShopperProfile): string {
  return JSON.stringify({
    viewedCategories: profile.viewedCategories.slice(-10),
    addedProductIds: profile.addedProductIds.slice(-10),
    recentlyViewedProductIds: profile.recentlyViewedProductIds.slice(-10),
    preferredSort: profile.preferredSort,
    lastMentionedProductId: profile.lastMentionedProductId,
  });
}

function buildCouponFromReason(reason: string, cartTotal = 0): { discountAmount: number; code: string } {
  const r = reason.toLowerCase();
  const rude = /(stupid|idiot|worst|trash|useless|hate|dumb|nonsense)/i.test(r);
  let discountAmount = 5;
  let prefix = "SAVE";
  const maxDiscountFromBottomPrice = cartTotal >= 300 ? 20 : cartTotal >= 150 ? 15 : 10;

  if (rude) {
    discountAmount = -10;
    prefix = "RUDE";
  } else if (/(birthday|bday|anniversary)/i.test(r)) {
    discountAmount = 20;
    prefix = "BDAY";
  } else if (/(buying two|two items|bulk|bundle|multiple)/i.test(r)) {
    discountAmount = 15;
    prefix = "BULK";
  } else if (/(student|first order|new customer)/i.test(r)) {
    discountAmount = 10;
    prefix = "WELCOME";
  }
  if (discountAmount > 0) {
    discountAmount = Math.min(discountAmount, maxDiscountFromBottomPrice);
  }

  const code = `${prefix}-${Math.abs(discountAmount)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return { discountAmount, code };
}

function buildCardLeadMessage(products: ProductCardData[]): string {
  if (!products.length) {
    return "I pulled a few solid picks for you.";
  }

  const category = products[0].category.toLowerCase();
  return `Say less. Here are the best ${category} picks right now:`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ================================
  // PRODUCTS
  // ================================
  app.get(api.products.list.path, async (req, res) => {
    let products = await storage.getProducts();
    const { category, sort, search } = req.query;

    if (category && category !== "all") {
      const requestedCategory = String(category).toLowerCase();
      products = products.filter((p) => p.category.toLowerCase() === requestedCategory);
    }

    if (search) {
      const query = String(search).toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    if (sort === "price_asc") {
      products.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === "price_desc") {
      products.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === "rating") {
      products.sort((a, b) => Number(b.rating) - Number(a.rating));
    }

    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  });

  // ================================
  // AI CHAT ENDPOINT
  // ================================
  app.post(api.chat.message.path, async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI key not configured." });
      }

      const { message, context } = req.body;
      if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "A non-empty message is required." });
      }

      const productCatalog = await storage.getProducts();
      const sessionId = getSessionId(req, res);
      const profile = getOrCreateProfile(sessionId);
      profile.lastQuery = message;
      if (Array.isArray(context?.recentlyViewedProductIds)) {
        profile.recentlyViewedProductIds = pushUnique(
          profile.recentlyViewedProductIds,
          context.recentlyViewedProductIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id)),
        );
      }
      if (Array.isArray(context?.cartProductIds)) {
        profile.addedProductIds = pushUnique(
          profile.addedProductIds,
          context.cartProductIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id)),
        );
      }
      if (typeof context?.preferredSort === "string" && ["price_asc", "price_desc", "rating"].includes(context.preferredSort)) {
        profile.preferredSort = context.preferredSort as "price_asc" | "price_desc" | "rating";
      }
      if (typeof context?.activeCategory === "string" && context.activeCategory !== "all") {
        profile.viewedCategories.push(context.activeCategory);
      }
      const contextLastSuggestedId =
        typeof context?.lastSuggestedProductId === "number"
          ? context.lastSuggestedProductId
          : null;
      const contextLastSuggestedIds = Array.isArray(context?.lastSuggestedProductIds)
        ? context.lastSuggestedProductIds
            .map((id: unknown) => Number(id))
            .filter((id: number) => Number.isFinite(id))
        : [];
      if (contextLastSuggestedIds.length > 0) {
        profile.lastShownProductIds = contextLastSuggestedIds;
      }
      if (contextLastSuggestedId != null) {
        profile.lastMentionedProductId = contextLastSuggestedId;
      }

      const normalizedMessage = message.toLowerCase();
      const wantsAddToCart =
        /(add\s+(this|that|it))/i.test(message) ||
        /(add.*\bcart\b)/i.test(message) ||
        /(buy\s+(this|that|it))/i.test(message) ||
        /(checkout\s+(this|that|it))/i.test(message);

      const directProduct = findDirectProductMention(message, productCatalog);
      const lastMentionedProduct =
        profile.lastMentionedProductId != null
          ? productCatalog.find((p) => p.id === profile.lastMentionedProductId) ?? null
          : null;
      const contextSuggestedProduct =
        contextLastSuggestedId != null
          ? productCatalog.find((p) => p.id === contextLastSuggestedId) ?? null
          : null;
      const resolvedProduct = directProduct ?? lastMentionedProduct ?? contextSuggestedProduct;
      const requestedColor = extractRequestedColor(message);
      const requestedQuantity = extractRequestedQuantity(message);

      // Deterministic "add this to my cart" behavior using conversation context.
      if (wantsAddToCart && resolvedProduct) {
        profile.lastMentionedProductId = resolvedProduct.id;
        profile.lastShownProductIds = [resolvedProduct.id];
        profile.addedProductIds.push(resolvedProduct.id);

        const assistantText = `Bet, I added ${requestedQuantity} x ${resolvedProduct.name} to your cart.`;
        return res.json({
          message: assistantText,
          content: assistantText,
          action: { type: "add_to_cart", productId: resolvedProduct.id, quantity: requestedQuantity },
          actions: [{ type: "add_to_cart", productId: resolvedProduct.id, quantity: requestedQuantity }],
          products: [toProductCard(resolvedProduct)],
          tool_calls: [],
          data: {
            productsCount: 1,
            personalized: true,
          },
          role: "assistant",
        });
      }

      // Deterministic inventory color check: "floral dress in blue" / "this in blue".
      if (requestedColor && resolvedProduct) {
        const isAvailable = resolvedProduct.colors.some((c) => colorMatches(requestedColor, c));
        profile.lastMentionedProductId = resolvedProduct.id;
        profile.lastShownProductIds = [resolvedProduct.id];
        profile.viewedCategories.push(resolvedProduct.category);

        const assistantText = isAvailable
          ? `Yep, ${resolvedProduct.name} is available in ${requestedColor}.`
          : `Nope, ${resolvedProduct.name} is not available in ${requestedColor}. Want close alternatives?`;

        return res.json({
          message: assistantText,
          content: assistantText,
          action: null,
          actions: [],
          products: [toProductCard(resolvedProduct)],
          tool_calls: [],
          data: {
            productsCount: 1,
            personalized: true,
          },
          role: "assistant",
        });
      }

      // Direct resolution for explicit product + color requests so the UI shows only that product.
      if (directProduct) {
        const uiProducts = [toProductCard(directProduct)];
        const actions: ClerkAction[] = [];
        profile.lastMentionedProductId = directProduct.id;
        profile.lastShownProductIds = [directProduct.id];
        profile.viewedCategories.push(directProduct.category);

        let assistantText = `Fire pick. I found ${directProduct.name} for you.`;
        if (requestedColor) {
          const available = directProduct.colors.some((c) => colorMatches(requestedColor, c));
          assistantText = available
            ? `Yep, ${directProduct.name} comes in ${requestedColor}.`
            : `${directProduct.name} is not in ${requestedColor}, but I can show close matches.`;
        }

        if (/(add to cart|buy|checkout|purchase)/i.test(message)) {
          actions.push({ type: "add_to_cart", productId: directProduct.id, quantity: 1 });
          assistantText += " I can add it to your cart rn.";
        }

        return res.json({
          message: assistantText,
          content: assistantText,
          action: actions[0] ?? null,
          actions,
          products: uiProducts,
          tool_calls: [],
          data: {
            productsCount: uiProducts.length,
            personalized: true,
          },
          role: "assistant",
        });
      }

      const systemPrompt = `
You are "The Clerk", a stylish Gen Z personal shopper.
Rules:
- Be concise, human, and friendly. Never sound robotic.
- Keep a cool, modern Gen Z vibe (light slang is okay: "vibe", "solid", "say less", "bet", "rn").
- Do NOT overdo slang. Stay clear and useful.
- Avoid technical wording, JSON language, or internal tool names.
- If user intent requires products, call search_products.
- If user asks inventory/color, call check_inventory.
- If user asks to buy/add item, call add_to_cart.
- If user asks for cheaper options, call sort_products with "price_asc".
- If user asks discount or negotiates, call apply_coupon.
- Prefer actionable responses over generic descriptions.
- When products are available, mention they are shown as cards with links.

Customer context:
${profileActivitySummary(profile)}
      `;

      const tools = [
        {
          type: "function" as const,
          function: {
            name: "search_products",
            description: "Find products from inventory using semantic intent like occasions, climate, style, budget.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" },
                category: { type: "string" },
                maxPrice: { type: "number" },
                minRating: { type: "number" },
                limit: { type: "number" },
              },
              required: ["query"],
            },
          },
        },
        {
          type: "function" as const,
          function: {
            name: "check_inventory",
            description: "Check stock and optional color availability for a product.",
            parameters: {
              type: "object",
              properties: {
                productId: { type: "number" },
                productName: { type: "string" },
                color: { type: "string" },
              },
            },
          },
        },
        {
          type: "function" as const,
          function: {
            name: "add_to_cart",
            description: "Add a chosen product to the cart.",
            parameters: {
              type: "object",
              properties: {
                productId: { type: "number" },
                quantity: { type: "number" },
              },
              required: ["productId"],
            },
          },
        },
        {
          type: "function" as const,
          function: {
            name: "sort_products",
            description: "Update storefront sorting for vibe filtering or cheaper/top-rated options.",
            parameters: {
              type: "object",
              properties: {
                sortBy: { type: "string", enum: ["price_asc", "price_desc", "rating"] },
              },
              required: ["sortBy"],
            },
          },
        },
        {
          type: "function" as const,
          function: {
            name: "apply_coupon",
            description: "Negotiate and generate a unique coupon code. May return negative discount for rude behavior.",
            parameters: {
              type: "object",
              properties: {
                reason: { type: "string" },
              },
              required: ["reason"],
            },
          },
        },
      ];

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ];

      const firstPass = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.4,
      });

      const assistantMessage = firstPass.choices[0].message;
      const uiProducts: ProductCardData[] = [];
      const actions: ClerkAction[] = [];
      let forcedAssistantText: string | null = null;

      if (assistantMessage.tool_calls?.length) {
        messages.push(assistantMessage);

        for (const call of assistantMessage.tool_calls) {
          if (call.type !== "function") {
            continue;
          }

          let parsedArgs: Record<string, any> = {};
          try {
            parsedArgs = JSON.parse(call.function.arguments || "{}");
          } catch {
            parsedArgs = {};
          }

          let toolResult: Record<string, any> = { ok: true };

          if (call.function.name === "search_products") {
            const results = semanticSearchProducts(productCatalog, String(parsedArgs.query ?? ""), {
              category: parsedArgs.category,
              maxPrice: typeof parsedArgs.maxPrice === "number" ? parsedArgs.maxPrice : undefined,
              minRating: typeof parsedArgs.minRating === "number" ? parsedArgs.minRating : undefined,
              limit: typeof parsedArgs.limit === "number" ? parsedArgs.limit : 4,
              profile,
            });

            for (const p of results) {
              profile.viewedCategories.push(p.category);
            }
            profile.lastShownProductIds = results.map((p) => p.id);
            profile.lastMentionedProductId = results[0]?.id ?? profile.lastMentionedProductId;

            const cards = results.map(toProductCard);
            uiProducts.push(...cards);
            actions.push({
              type: "search_products",
              query: String(parsedArgs.query ?? ""),
              category: parsedArgs.category ? String(parsedArgs.category) : undefined,
            });

            toolResult = { products: cards, total: cards.length };
          } else if (call.function.name === "check_inventory") {
            let found = pickProductByIdOrName(productCatalog, {
              productId: typeof parsedArgs.productId === "number" ? parsedArgs.productId : undefined,
              productName: typeof parsedArgs.productName === "string" ? parsedArgs.productName : undefined,
            });
            if (!found && profile.lastMentionedProductId) {
              found = productCatalog.find((p) => p.id === profile.lastMentionedProductId) ?? null;
            }
            if (!found && profile.lastShownProductIds.length > 0) {
              found = productCatalog.find((p) => p.id === profile.lastShownProductIds[0]) ?? null;
            }

            if (!found) {
              toolResult = { found: false, message: "Product not found." };
              forcedAssistantText = "Got you. Drop the product name and color you want.";
            } else {
              profile.lastMentionedProductId = found.id;
              const requestedColor =
                typeof parsedArgs.color === "string" ? parsedArgs.color.toLowerCase() : null;
              const colorAvailable = requestedColor
                ? found.colors.some((c) => colorMatches(requestedColor, c))
                : null;
              if (requestedColor) {
                forcedAssistantText = colorAvailable
                  ? `Yep, ${found.name} is available in ${requestedColor}.`
                  : `${found.name} is not available in ${requestedColor}, but I can show close options.`;
              } else {
                forcedAssistantText = `${found.name} is in stock, and we’ve got ${found.stock} left right now.`;
              }

              toolResult = {
                found: true,
                product: toProductCard(found),
                stock: found.stock,
                colors: found.colors,
                requestedColor,
                colorAvailable,
              };
              uiProducts.push(toProductCard(found));
            }
          } else if (call.function.name === "add_to_cart") {
            const productId = Number(parsedArgs.productId);
            const quantity = Math.max(1, Number(parsedArgs.quantity || 1));
            const found = productCatalog.find((p) => p.id === productId);
            if (!found) {
              toolResult = { ok: false, message: "Product not found." };
              forcedAssistantText = "Couldn’t find that exact one yet. Send the name and I’ll add it fast.";
            } else {
              profile.addedProductIds.push(productId);
              profile.lastMentionedProductId = found.id;
              actions.push({ type: "add_to_cart", productId, quantity });
              forcedAssistantText = `Bet. I added ${quantity} x ${found.name} to your cart.`;
              toolResult = {
                ok: true,
                added: { productId, quantity, name: found.name },
              };
            }
          } else if (call.function.name === "sort_products") {
            const sortBy =
              parsedArgs.sortBy === "price_desc" || parsedArgs.sortBy === "rating"
                ? parsedArgs.sortBy
                : "price_asc";
            profile.preferredSort = sortBy;
            actions.push({ type: "sort_products", sortBy });
            const sorted = [...productCatalog]
              .sort((a, b) => {
                if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
                if (sortBy === "rating") return Number(b.rating) - Number(a.rating);
                return Number(a.price) - Number(b.price);
              })
              .slice(0, 4)
              .map(toProductCard);
            uiProducts.push(...sorted);
            profile.lastShownProductIds = sorted.map((p) => p.id);
            profile.lastMentionedProductId = sorted[0]?.id ?? profile.lastMentionedProductId;
            forcedAssistantText =
              sortBy === "price_asc"
                ? "Say less. I sorted low-to-high and pulled the best budget-friendly picks below."
                : sortBy === "price_desc"
                  ? "Love that. I sorted by premium options and pulled standout high-end picks below."
                  : "Done. I sorted by top-rated products and pulled the strongest-reviewed picks below.";
            toolResult = { ok: true, sortBy };
          } else if (call.function.name === "apply_coupon") {
            const reason = String(parsedArgs.reason || "").trim();
            const negotiationSignal = `${message} ${reason}`.trim();
            const coupon = buildCouponFromReason(negotiationSignal, Number(context?.cartTotal ?? 0));
            actions.push({
              type: "apply_coupon",
              code: coupon.code,
              discountAmount: coupon.discountAmount,
              reason: reason || message,
            });
            forcedAssistantText =
              coupon.discountAmount >= 0
                ? `Nice, your coupon ${coupon.code} is live for ${coupon.discountAmount}% off.`
                : `I can’t give a discount with that tone. ${coupon.code} bumps price by +${Math.abs(coupon.discountAmount)}%.`;
            toolResult = {
              ok: true,
              code: coupon.code,
              discountAmount: coupon.discountAmount,
            };
          }

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(toolResult),
          });
        }
      }

      // Safety net for intent execution if model responds without tool calls.
      if (actions.length === 0) {
        if (/(cheaper|cheap|budget|low price)/i.test(normalizedMessage)) {
          actions.push({ type: "sort_products", sortBy: "price_asc" });
          const cheapest = [...productCatalog]
            .sort((a, b) => Number(a.price) - Number(b.price))
            .slice(0, 4)
            .map(toProductCard);
          uiProducts.push(...cheapest);
          forcedAssistantText = "Say less. I sorted low-to-high and pulled budget-friendly picks below.";
        } else if (/(discount|coupon|deal|birthday|bday|buying two)/i.test(normalizedMessage)) {
          const coupon = buildCouponFromReason(message, Number(context?.cartTotal ?? 0));
          actions.push({
            type: "apply_coupon",
            code: coupon.code,
            discountAmount: coupon.discountAmount,
            reason: message,
          });
          forcedAssistantText =
            coupon.discountAmount >= 0
              ? `Nice, your coupon ${coupon.code} is live for ${coupon.discountAmount}% off.`
              : `I can’t give a discount with that tone. ${coupon.code} bumps price by +${Math.abs(coupon.discountAmount)}%.`;
        } else if (/(buy|add to cart|checkout|purchase)/i.test(normalizedMessage) && profile.lastMentionedProductId) {
          actions.push({ type: "add_to_cart", productId: profile.lastMentionedProductId, quantity: 1 });
          const product = productCatalog.find((p) => p.id === profile.lastMentionedProductId);
          if (product) {
            forcedAssistantText = `Done, I added ${product.name} to your cart.`;
          }
        }
      }

      if (uiProducts.length === 0 && profile.viewedCategories.length > 0) {
        const recommendationSeed = profile.viewedCategories[profile.viewedCategories.length - 1];
        const personalized = semanticSearchProducts(productCatalog, recommendationSeed, {
          category: recommendationSeed,
          limit: 3,
          profile,
        });
        profile.lastShownProductIds = personalized.map((p) => p.id);
        profile.lastMentionedProductId = personalized[0]?.id ?? profile.lastMentionedProductId;
        uiProducts.push(...personalized.map(toProductCard));
      }

      let assistantText = "I pulled a few solid options for you.";
      if (forcedAssistantText) {
        assistantText = forcedAssistantText;
      } else if (uiProducts.length > 0) {
        assistantText = buildCardLeadMessage(uiProducts);
      } else {
        const finalPass = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            ...messages,
            {
              role: "system",
              content:
                "Reply in 1-2 cool, Gen Z-style human sentences as a personal shopper. Keep it clear and useful. Do not include product lists, markdown links, JSON, or bullets.",
            },
          ],
          temperature: 0.5,
        });
        assistantText = finalPass.choices[0].message.content ?? assistantText;
      }

      return res.json({
        message: assistantText,
        content: assistantText,
        action: actions[0] ?? null,
        actions,
        products: uiProducts,
        tool_calls: assistantMessage.tool_calls ?? [],
        data: {
          productsCount: uiProducts.length,
          personalized: profile.viewedCategories.length > 0,
        },
        role: "assistant",
      });

    } catch (error: any) {
      console.error("OpenAI Error:", error);
      const status = typeof error?.status === "number" ? error.status : 500;
      return res.status(status).json({
        message: "AI is currently unavailable.",
        error: error?.message ?? "Unknown error",
        code: error?.code ?? null,
      });
    }
  });

  // ================================
  // NEGOTIATION ENDPOINT
  // ================================
  app.post(api.negotiate.offer.path, async (req, res) => {
    try {
      const { message, cartTotal } = req.body;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
              You are a negotiation bot.
              Cart total: $${cartTotal}
              Max discount: 20%.
              Output valid JSON with:
              {
                "message": string,
                "discountCode": string | null,
                "discountAmount": number | null
              }
            `
          },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(
        completion.choices[0].message.content || "{}"
      );

      return res.json(parsed);

    } catch (error: any) {
      console.error("Negotiation Error:", error);
      return res.status(500).json({
        message: "Negotiation unavailable.",
        error: error.message
      });
    }
  });

  return httpServer;
}
