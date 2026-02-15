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
  | { type: "navigate_checkout" }
  | { type: "apply_coupon"; code: string; discountAmount: number; reason?: string };

type ProductCardData = {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviewsCount: number;
  category: string;
  vibes: string[];
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
  awaitingCheckoutConfirmation: boolean;
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
    awaitingCheckoutConfirmation: false,
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
    vibes: inferProductVibes(product),
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
      const productTypes = inferProductTypes(product);
      const productVibes = inferProductVibes(product);

      for (const token of tokens) {
        if (haystack.includes(token)) score += 2;
        if (productTypes.some((t) => t.includes(token) || token.includes(t))) score += 2.5;
        if (productVibes.some((v) => v.includes(token) || token.includes(v))) score += 2;
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

type IntentSignals = {
  wantsProducts: boolean;
  category?: string;
  productTypes: string[];
  vibes: string[];
};

const CATEGORY_SYNONYMS: Record<string, string> = {
  footwear: "Footwear",
  footware: "Footwear",
  foorwear: "Footwear",
  fotwear: "Footwear",
  fowear: "Footwear",
  shoe: "Footwear",
  shoes: "Footwear",
  shoez: "Footwear",
  sneaker: "Footwear",
  sneakers: "Footwear",
  boot: "Footwear",
  boots: "Footwear",
  loafer: "Footwear",
  loafers: "Footwear",
  sandal: "Footwear",
  sandals: "Footwear",
  clothing: "Clothing",
  clothes: "Clothing",
  cloths: "Clothing",
  clohtes: "Clothing",
  apparel: "Clothing",
  outfit: "Clothing",
  outfits: "Clothing",
  wear: "Clothing",
  accessory: "Accessories",
  accessories: "Accessories",
  accessorie: "Accessories",
  accecories: "Accessories",
  accesorries: "Accessories",
  bag: "Accessories",
  bags: "Accessories",
  tie: "Accessories",
  ties: "Accessories",
  belt: "Accessories",
  belts: "Accessories",
  watch: "Accessories",
  watches: "Accessories",
  sunglasses: "Accessories",
  sunglass: "Accessories",
  shades: "Accessories",
  shade: "Accessories",
};

const VIBE_KEYWORDS: Record<string, string> = {
  formal: "formal",
  classy: "formal",
  elegant: "formal",
  premium: "luxury",
  luxury: "luxury",
  casual: "casual",
  everyday: "casual",
  smart: "smart-casual",
  smartcasual: "smart-casual",
  minimal: "minimal",
  minimalist: "minimal",
  summer: "summer",
  wedding: "occasion",
};

function inferProductTypes(product: Product): string[] {
  const haystack = normalizeText(`${product.name} ${product.description}`);
  const pairs: Array<[string, RegExp]> = [
    ["boots", /\bboot(s)?\b/],
    ["loafers", /\bloafer(s)?\b/],
    ["espadrilles", /\bespadrille(s)?\b/],
    ["sunglasses", /\bsunglass(es)?\b/],
    ["shirts", /\bshirt(s)?\b/],
    ["dress", /\bdress(es)?\b/],
    ["blazer", /\bblazer(s)?\b/],
    ["chinos", /\bchino(s)?\b/],
    ["tie", /\btie(s)?\b/],
    ["belt", /\bbelt(s)?\b/],
    ["watch", /\bwatch(es)?\b/],
    ["hat", /\bhat(s)?\b|fedora(s)?\b/],
    ["bag", /\bbag(s)?\b|tote(s)?\b|duffel\b/],
  ];
  const matches = pairs.filter(([, regex]) => regex.test(haystack)).map(([type]) => type);
  if (matches.length > 0) return matches;
  if (product.category === "Footwear") return ["shoes"];
  if (product.category === "Clothing") return ["clothing"];
  if (product.category === "Accessories") return ["accessories"];
  return [];
}

function inferProductVibes(product: Product): string[] {
  const haystack = normalizeText(`${product.name} ${product.description}`);
  const vibes = new Set<string>();
  if (/\b(silk|italian|handmade|luxury|premium|cashmere|suede|full grain|leather)\b/.test(haystack)) vibes.add("luxury");
  if (/\b(formal|elegant|classic|suit|wedding|oxford|blazer|tie)\b/.test(haystack)) vibes.add("formal");
  if (/\b(casual|everyday|relaxed|weekend|denim|canvas)\b/.test(haystack)) vibes.add("casual");
  if (/\b(minimal|clean|minimalist)\b/.test(haystack)) vibes.add("minimal");
  if (/\b(summer|linen|lightweight|breathable)\b/.test(haystack)) vibes.add("summer");
  if (/\b(smart casual|smart-casual|versatile)\b/.test(haystack)) vibes.add("smart-casual");
  if (vibes.size === 0) {
    if (product.category === "Footwear") vibes.add("smart-casual");
    if (product.category === "Clothing") vibes.add("casual");
    if (product.category === "Accessories") vibes.add("minimal");
  }
  return Array.from(vibes);
}

function detectIntentSignals(message: string, catalog: Product[]): IntentSignals {
  const normalizedMessage = normalizeText(message);
  const tokens = tokenizeSearchQuery(normalizedMessage);
  const categories = new Set(catalog.map((product) => product.category));
  let category: string | undefined;
  const productTypes = new Set<string>();
  const vibes = new Set<string>();

  for (const token of tokens) {
    const c = CATEGORY_SYNONYMS[token];
    if (c && categories.has(c)) category = c;
    const vibe = VIBE_KEYWORDS[token];
    if (vibe) vibes.add(vibe);
  }

  const typeAliases: Record<string, string[]> = {
    boots: ["boots", "boot"],
    loafers: ["loafers", "loafer"],
    shoes: ["shoes", "shoe", "shoez", "footwear", "footware", "fowear", "sneakers", "sneaker", "espadrilles", "espadrille"],
    ties: ["ties", "tie"],
    shirts: ["shirts", "shirt", "oxford shirt"],
    dress: ["dress", "dresses"],
    blazer: ["blazer", "blazers"],
    chinos: ["chinos", "chino"],
    sunglasses: ["sunglasses", "sunglass", "sun glasses", "shade", "shades", "aviator"],
    watch: ["watch", "watches"],
    bag: ["bag", "bags", "tote", "duffel"],
  };
  for (const [type, aliases] of Object.entries(typeAliases)) {
    if (aliases.some((alias) => normalizedMessage.includes(alias))) {
      productTypes.add(type);
    }
  }

  const wantsProducts = /(need|want|show|find|looking|search|recommend|suggest|shop|browse|see)/i.test(normalizedMessage) ||
    Boolean(category) ||
    productTypes.size > 0 ||
    vibes.size > 0;

  return {
    wantsProducts,
    category,
    productTypes: Array.from(productTypes),
    vibes: Array.from(vibes),
  };
}

function filterProductsByIntent(catalog: Product[], intent: IntentSignals, limit = 4): Product[] {
  let filtered = [...catalog];
  if (intent.category) {
    filtered = filtered.filter((product) => product.category === intent.category);
  }
  if (intent.productTypes.length > 0) {
    const next = filtered.filter((product) => {
      const productTypes = inferProductTypes(product);
      return intent.productTypes.some((type) => productTypes.includes(type));
    });
    if (next.length > 0) filtered = next;
  }
  if (intent.vibes.length > 0) {
    const next = filtered.filter((product) => {
      const productVibes = inferProductVibes(product);
      return intent.vibes.some((vibe) => productVibes.includes(vibe));
    });
    if (next.length > 0) filtered = next;
  }

  return filtered
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, limit);
}

function buildCatalogQueryFromIntent(rawMessage: string, intent: IntentSignals): string {
  const genericTypes = new Set(["shoes", "clothing", "accessories"]);
  const specificType = intent.productTypes.find((type) => !genericTypes.has(type));

  if (specificType) return specificType;
  if (intent.category) return "";
  if (intent.vibes.length > 0) return intent.vibes[0];
  return rawMessage.trim();
}

function tokenizeSearchQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function productMatchesTokens(product: Product, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const haystack = normalizeText(`${product.name} ${product.description} ${product.category}`);
  return tokens.some((token) => {
    if (haystack.includes(token)) return true;
    if (token.endsWith("es") && token.length > 3) {
      const singular = token.slice(0, -2);
      if (haystack.includes(singular)) return true;
    }
    if (token.endsWith("s") && token.length > 3) {
      const singular = token.slice(0, -1);
      if (haystack.includes(singular)) return true;
    }
    return false;
  });
}

function dominantCategory(products: Product[]): string | undefined {
  if (!products.length) return undefined;
  const counts = new Map<string, number>();
  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  counts.forEach((count, category) => {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  });
  return best;
}

function normalizeCategoryFromCatalog(category: string | undefined, catalog: Product[]): string | undefined {
  if (!category) return undefined;
  const normalized = category.trim().toLowerCase();
  if (!normalized) return undefined;
  const match = catalog.find((product) => product.category.toLowerCase() === normalized);
  return match?.category;
}

async function aiSelectProducts(
  catalog: Product[],
  query: string,
  options?: { limit?: number; category?: string; productTypes?: string[]; vibes?: string[] },
): Promise<{ products: Product[]; category?: string; usedCategoryFallback: boolean }> {
  const limit = options?.limit ?? 4;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { products: [], usedCategoryFallback: false };
  }

  const catalogCategories = Array.from(new Set(catalog.map((product) => product.category)));
  const compactCatalog = catalog.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    productTypes: inferProductTypes(product),
    vibes: inferProductVibes(product),
    price: Number(product.price),
    rating: Number(product.rating),
  }));

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a product matcher. Choose up to the requested limit of product IDs that best match the shopper query. " +
          "If the query strongly implies a category, return the closest category from the catalog list. " +
          "Respond with JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          query: trimmedQuery,
          limit,
          categoryHint: options?.category ?? null,
          productTypeHint: options?.productTypes ?? [],
          vibeHint: options?.vibes ?? [],
          categories: catalogCategories,
          catalog: compactCatalog,
        }),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  let parsed: any = {};
  try {
    parsed = JSON.parse(completion.choices[0].message.content || "{}");
  } catch {
    parsed = {};
  }

  const ids: unknown[] = Array.isArray(parsed.productIds) ? parsed.productIds : [];
  const normalizedIds: number[] = ids
    .map((id: unknown) => Number(id))
    .filter((id: number) => Number.isFinite(id));

  const catalogMap = new Map(catalog.map((product) => [product.id, product]));
  let products = normalizedIds
    .map((id) => catalogMap.get(id))
    .filter((product): product is Product => Boolean(product));

  const modelCategory = normalizeCategoryFromCatalog(
    typeof parsed.category === "string" ? parsed.category : undefined,
    catalog,
  );
  const explicitCategory = normalizeCategoryFromCatalog(options?.category, catalog);
  const category = explicitCategory ?? modelCategory;

  if (category) {
    products = products.filter((product) => product.category === category);
  }

  if (options?.productTypes && options.productTypes.length > 0) {
    const constrained = products.filter((product) => {
      const types = inferProductTypes(product);
      return options.productTypes?.some((type) => types.includes(type));
    });
    if (constrained.length > 0) products = constrained;
  }

  if (options?.vibes && options.vibes.length > 0) {
    const constrained = products.filter((product) => {
      const vibes = inferProductVibes(product);
      return options.vibes?.some((vibe) => vibes.includes(vibe));
    });
    if (constrained.length > 0) products = constrained;
  }

  let usedCategoryFallback = false;
  if (products.length === 0 && category) {
    products = catalog
      .filter((product) => product.category === category)
      .sort((a, b) => Number(b.rating) - Number(a.rating))
      .slice(0, limit);
    usedCategoryFallback = products.length > 0;
  }

  return { products, category, usedCategoryFallback };
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

function isAffirmativeResponse(message: string): boolean {
  const normalized = normalizeText(message);
  return /\b(yes|yeah|yep|yup|sure|ok|okay|proceed|go ahead|lets go|let s go|checkout)\b/i.test(normalized);
}

function isNegativeResponse(message: string): boolean {
  const normalized = normalizeText(message);
  return /\b(no|nah|nope|later|not now|wait|stop|cancel)\b/i.test(normalized);
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
  const rude = /(stupid|idiot|moron|worst|trash|useless|hate|dumb|nonsense|fat|ugly|loser|shut up|fool|jerk)/i.test(r);
  const friendly = /(please|kindly|thanks|thank you|appreciate|could you|would you|can you help|pls)/i.test(r);
  let discountAmount = 5;
  let prefix = "SAVE";
  const maxDiscountFromBottomPrice = cartTotal >= 300 ? 20 : cartTotal >= 150 ? 15 : 10;

  if (rude) {
    discountAmount = 0;
    prefix = "NODEAL";
  } else if (/(birthday|bday|anniversary)/i.test(r)) {
    discountAmount = 20;
    prefix = "BDAY";
  } else if (friendly) {
    discountAmount = 7;
    prefix = "KIND";
  } else {
    discountAmount = 5;
    prefix = "SAVE";
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
    const categorySet = new Set(products.map((product) => product.category.toLowerCase()));

    if (category && category !== "all") {
      const requestedCategory = String(category).toLowerCase();
      if (categorySet.has(requestedCategory)) {
        products = products.filter((p) => p.category.toLowerCase() === requestedCategory);
      }
    }

    if (search) {
      const tokens = tokenizeSearchQuery(String(search));
      if (tokens.length > 0) {
        products = products.filter((product) => productMatchesTokens(product, tokens));
      }
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
      const intentSignals = detectIntentSignals(message, productCatalog);
      if (profile.awaitingCheckoutConfirmation) {
        if (isAffirmativeResponse(message)) {
          profile.awaitingCheckoutConfirmation = false;
          const assistantText = "Perfect. Taking you to checkout now.";
          return res.json({
            message: assistantText,
            content: assistantText,
            action: { type: "navigate_checkout" },
            actions: [{ type: "navigate_checkout" }],
            products: [],
            tool_calls: [],
            data: { productsCount: 0, personalized: true },
            role: "assistant",
          });
        }
        if (isNegativeResponse(message)) {
          profile.awaitingCheckoutConfirmation = false;
          const assistantText = "No problem. Your cart is ready whenever you want to check out.";
          return res.json({
            message: assistantText,
            content: assistantText,
            action: null,
            actions: [],
            products: [],
            tool_calls: [],
            data: { productsCount: 0, personalized: true },
            role: "assistant",
          });
        }
      }
      const wantsAddToCart =
        /(add\s+(this|that|it))/i.test(message) ||
        /(add.*\bcart\b)/i.test(message) ||
        /(buy\s+(this|that|it))/i.test(message) ||
        /(checkout\s+(this|that|it))/i.test(message);
      const wantsDiscount = /(discount|coupon|deal|price\s*off|price cut|negotiat)/i.test(message);
      const referencesCurrentItem = /(this|that|it|same one|that one|last one|the one)/i.test(message);
      const explicitBrowseIntent = /(show|find|looking for|search|recommend|suggest|browse|i need|i want some)/i.test(
        normalizedMessage,
      );

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
        profile.awaitingCheckoutConfirmation = true;

        const assistantText = `Bet, I added ${requestedQuantity} x ${resolvedProduct.name} to your cart. Want to proceed to checkout?`;
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

      // Deterministic follow-up behavior: keep focus on the current item for discount negotiation.
      if (
        wantsDiscount &&
        resolvedProduct &&
        !directProduct &&
        (referencesCurrentItem || !explicitBrowseIntent)
      ) {
        const coupon = buildCouponFromReason(message, Number(context?.cartTotal ?? 0));
        profile.lastMentionedProductId = resolvedProduct.id;
        profile.lastShownProductIds = [resolvedProduct.id];

        const assistantText =
          coupon.discountAmount > 0
            ? `For ${resolvedProduct.name}, your coupon ${coupon.code} is live for ${coupon.discountAmount}% off.`
            : `I can’t apply a discount on ${resolvedProduct.name} with that tone right now.`;

        return res.json({
          message: assistantText,
          content: assistantText,
          action: { type: "apply_coupon", code: coupon.code, discountAmount: coupon.discountAmount, reason: message },
          actions: [
            { type: "apply_coupon", code: coupon.code, discountAmount: coupon.discountAmount, reason: message },
          ],
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
          profile.awaitingCheckoutConfirmation = true;
          assistantText = `Bet, I added ${directProduct.name} to your cart. Want to proceed to checkout?`;
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

      // Deterministic intent path for category/type/vibe requests.
      if (
        intentSignals.wantsProducts &&
        (intentSignals.category || intentSignals.productTypes.length > 0 || intentSignals.vibes.length > 0)
      ) {
        const resolved = filterProductsByIntent(productCatalog, intentSignals, 4);
        if (resolved.length > 0) {
          const cards = resolved.map(toProductCard);
          const actionCategory = intentSignals.category ?? dominantCategory(resolved);
          const actionQuery = buildCatalogQueryFromIntent(message, intentSignals);

          profile.lastShownProductIds = resolved.map((p) => p.id);
          profile.lastMentionedProductId = resolved[0]?.id ?? profile.lastMentionedProductId;
          for (const product of resolved) {
            profile.viewedCategories.push(product.category);
          }

          const assistantText = buildCardLeadMessage(cards);
          return res.json({
            message: assistantText,
            content: assistantText,
            action: { type: "search_products", query: actionQuery, category: actionCategory },
            actions: [{ type: "search_products", query: actionQuery, category: actionCategory }],
            products: cards,
            tool_calls: [],
            data: {
              productsCount: cards.length,
              personalized: true,
            },
            role: "assistant",
          });
        }
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
- When calling search_products, include a category from the inventory when it is clear.

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
            const rawQuery = String(parsedArgs.query ?? "");
            const limit = typeof parsedArgs.limit === "number" ? parsedArgs.limit : 4;
            const toolIntent = detectIntentSignals(rawQuery, productCatalog);
            const requestedCategory =
              normalizeCategoryFromCatalog(
                typeof parsedArgs.category === "string" ? parsedArgs.category : undefined,
                productCatalog,
              ) ?? toolIntent.category;
            let results: Product[] = [];
            let inferredCategory: string | undefined;
            let usedCategoryFallback = false;

            try {
              const aiResult = await aiSelectProducts(productCatalog, rawQuery, {
                limit,
                category: requestedCategory,
                productTypes: toolIntent.productTypes,
                vibes: toolIntent.vibes,
              });
              results = aiResult.products;
              inferredCategory = aiResult.category;
              usedCategoryFallback = aiResult.usedCategoryFallback;
            } catch {
              results = [];
            }

            if (results.length === 0) {
              results = semanticSearchProducts(productCatalog, rawQuery, {
                category: requestedCategory,
                maxPrice: typeof parsedArgs.maxPrice === "number" ? parsedArgs.maxPrice : undefined,
                minRating: typeof parsedArgs.minRating === "number" ? parsedArgs.minRating : undefined,
                limit,
                profile,
              });
              const filtered = filterProductsByIntent(productCatalog, {
                wantsProducts: true,
                category: requestedCategory,
                productTypes: toolIntent.productTypes,
                vibes: toolIntent.vibes,
              }, limit);
              if (filtered.length > 0) {
                results = filtered;
              }
            }

            for (const p of results) {
              profile.viewedCategories.push(p.category);
            }
            profile.lastShownProductIds = results.map((p) => p.id);
            profile.lastMentionedProductId = results[0]?.id ?? profile.lastMentionedProductId;

            const cards = results.map(toProductCard);
            uiProducts.push(...cards);
            const actionCategory =
              normalizeCategoryFromCatalog(requestedCategory, productCatalog) ??
              normalizeCategoryFromCatalog(inferredCategory, productCatalog) ??
              dominantCategory(results) ??
              normalizeCategoryFromCatalog(
                typeof parsedArgs.category === "string" ? parsedArgs.category : undefined,
                productCatalog,
              );
            const actionQuery =
              actionCategory
                ? buildCatalogQueryFromIntent(rawQuery, toolIntent)
                : usedCategoryFallback
                  ? ""
                  : rawQuery;
            actions.push({
              type: "search_products",
              query: actionQuery,
              category: actionCategory,
            });

            toolResult = { products: cards, total: cards.length, category: actionCategory };
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
              profile.awaitingCheckoutConfirmation = true;
              actions.push({ type: "add_to_cart", productId, quantity });
              forcedAssistantText = `Bet. I added ${quantity} x ${found.name} to your cart. Want to proceed to checkout?`;
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
              coupon.discountAmount > 0
                ? `Nice, your coupon ${coupon.code} is live for ${coupon.discountAmount}% off.`
                : "I can’t apply a discount with that tone right now.";
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
        const fallbackQuery = message.trim();
        if (fallbackQuery) {
          try {
            const fallbackIntent = detectIntentSignals(fallbackQuery, productCatalog);
            const aiFallback = await aiSelectProducts(productCatalog, fallbackQuery, {
              limit: 4,
              category: fallbackIntent.category,
              productTypes: fallbackIntent.productTypes,
              vibes: fallbackIntent.vibes,
            });
            if (aiFallback.products.length > 0) {
              const cards = aiFallback.products.map(toProductCard);
              uiProducts.push(...cards);
              const actionCategory =
                normalizeCategoryFromCatalog(fallbackIntent.category, productCatalog) ??
                normalizeCategoryFromCatalog(aiFallback.category, productCatalog) ??
                dominantCategory(aiFallback.products);
              const actionQuery = actionCategory
                ? buildCatalogQueryFromIntent(fallbackQuery, fallbackIntent)
                : aiFallback.usedCategoryFallback
                  ? ""
                  : fallbackQuery;
              actions.push({
                type: "search_products",
                query: actionQuery,
                category: actionCategory,
              });
              forcedAssistantText = buildCardLeadMessage(cards);
            }
          } catch {
            // Ignore AI fallback failures.
          }
        }

        if (actions.length === 0 && /(cheaper|cheap|budget|low price)/i.test(normalizedMessage)) {
          actions.push({ type: "sort_products", sortBy: "price_asc" });
          const cheapest = [...productCatalog]
            .sort((a, b) => Number(a.price) - Number(b.price))
            .slice(0, 4)
            .map(toProductCard);
          uiProducts.push(...cheapest);
          forcedAssistantText = "Say less. I sorted low-to-high and pulled budget-friendly picks below.";
        } else if (actions.length === 0 && /(discount|coupon|deal|birthday|bday|buying two)/i.test(normalizedMessage)) {
          const coupon = buildCouponFromReason(message, Number(context?.cartTotal ?? 0));
          actions.push({
            type: "apply_coupon",
            code: coupon.code,
            discountAmount: coupon.discountAmount,
            reason: message,
          });
          forcedAssistantText =
            coupon.discountAmount > 0
              ? `Nice, your coupon ${coupon.code} is live for ${coupon.discountAmount}% off.`
              : "I can’t apply a discount with that tone right now.";
        } else if (
          actions.length === 0 &&
          /(buy|add to cart|checkout|purchase)/i.test(normalizedMessage) &&
          profile.lastMentionedProductId
        ) {
          profile.awaitingCheckoutConfirmation = true;
          actions.push({ type: "add_to_cart", productId: profile.lastMentionedProductId, quantity: 1 });
          const product = productCatalog.find((p) => p.id === profile.lastMentionedProductId);
          if (product) {
            forcedAssistantText = `Done, I added ${product.name} to your cart. Want to proceed to checkout?`;
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

      // Final guard: ensure product cards are consistent with explicit intent.
      if (
        intentSignals.wantsProducts &&
        (intentSignals.category || intentSignals.productTypes.length > 0 || intentSignals.vibes.length > 0)
      ) {
        const intentResolved = filterProductsByIntent(productCatalog, intentSignals, 4);
        if (intentResolved.length > 0) {
          const allowedIds = new Set(intentResolved.map((p) => p.id));
          const currentlyAligned = uiProducts.filter((card) => allowedIds.has(card.id));
          if (currentlyAligned.length === 0) {
            uiProducts.length = 0;
            uiProducts.push(...intentResolved.map(toProductCard));

            const actionCategory = intentSignals.category ?? dominantCategory(intentResolved);
            const actionQuery = buildCatalogQueryFromIntent(message, intentSignals);
            const searchAction: ClerkAction = {
              type: "search_products",
              query: actionQuery,
              category: actionCategory,
            };

            const searchActionIndex = actions.findIndex((action) => action.type === "search_products");
            if (searchActionIndex >= 0) {
              actions[searchActionIndex] = searchAction;
            } else {
              actions.push(searchAction);
            }

            profile.lastShownProductIds = intentResolved.map((p) => p.id);
            profile.lastMentionedProductId = intentResolved[0]?.id ?? profile.lastMentionedProductId;
            forcedAssistantText = buildCardLeadMessage(uiProducts);
          }
        }
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
