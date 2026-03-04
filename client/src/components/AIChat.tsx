import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, ShoppingBag, Star, Bot, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

type ChatProductCard = {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviewsCount: number;
  category: string;
  vibes?: string[];
  stock: number;
  image: string;
  url: string;
};

type ChatAction =
  | { type: "search_products"; query?: string; category?: string }
  | { type: "sort_products"; sortBy: "price_asc" | "price_desc" | "rating" }
  | { type: "add_to_cart"; productId: number; quantity: number }
  | { type: "navigate_checkout" }
  | { type: "apply_coupon"; code: string; discountAmount: number; reason?: string };

type ChatResponse = {
  message?: string;
  content?: string;
  products?: ChatProductCard[];
  actions?: ChatAction[];
};

function looksStructuredResponse(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return true;
  if (/\n\s*\d+\.\s/.test(trimmed)) return true;
  if (/https?:\/\//i.test(trimmed)) return true;
  return false;
}

function getChatContext(
  cartProductIds: number[],
  cartTotal: number,
  lastSuggestedProductId: number | null,
  lastSuggestedProductIds: number[],
) {
  const params = new URLSearchParams(window.location.search);
  let activeCategory = params.get("category") || "all";
  let preferredSort = params.get("sort") || "featured";

  let recentlyViewedProductIds: number[] = [];
  try {
    const raw = window.localStorage.getItem("clerk-activity");
    if (raw) {
      const parsed = JSON.parse(raw) as {
        recentlyViewedProductIds?: number[];
        activeCategory?: string;
        preferredSort?: string;
      };
      if (Array.isArray(parsed.recentlyViewedProductIds)) {
        recentlyViewedProductIds = parsed.recentlyViewedProductIds.filter((id) => Number.isFinite(id));
      }
      if (typeof parsed.activeCategory === "string" && parsed.activeCategory.trim()) {
        activeCategory = parsed.activeCategory;
      }
      if (typeof parsed.preferredSort === "string" && parsed.preferredSort.trim()) {
        preferredSort = parsed.preferredSort;
      }
    }
  } catch {
    recentlyViewedProductIds = [];
  }

  return {
    cartTotal,
    cartProductIds,
    activeCategory,
    preferredSort,
    recentlyViewedProductIds,
    lastSuggestedProductId,
    lastSuggestedProductIds,
    currentPath: window.location.pathname,
  };
}

function buildLeadText(products: ChatProductCard[]): string {
  if (!products.length) {
    return "I found some solid options for you.";
  }
  const category = products[0].category.toLowerCase();
  return `Say less. Here are the best ${category} picks right now:`;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  products?: ChatProductCard[];
}

const quickPrompts = [
  "Find premium picks under $120",
  "Show top rated accessories",
  "Build a full outfit for me",
];

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "I am The Clerk. Tell me your vibe and I will find the best picks and add them to cart for you.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const { addToCart, setDiscount, cartTotal, items } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: allProducts } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const navigateToProduct = (product: ChatProductCard) => {
    if (typeof product.id === "number" && Number.isFinite(product.id)) {
      setLocation(`/product/${product.id}`);
      setIsOpen(false);
      return;
    }

    if (typeof product.url === "string" && product.url.startsWith("/product/")) {
      setLocation(product.url);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    window.addEventListener("toggle-clerk", openHandler);
    return () => window.removeEventListener("toggle-clerk", openHandler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const runActions = async (actions: ChatAction[], suggestedProducts: ChatProductCard[]) => {
    for (const action of actions) {
      if (action.type === "search_products") {
        window.dispatchEvent(
          new CustomEvent("search-products", {
            detail: {
              query: action.query,
              category: action.category,
              source: "ai",
            },
          }),
        );
      } else if (action.type === "sort_products") {
        window.dispatchEvent(
          new CustomEvent("sort-products", {
            detail: {
              sortBy: action.sortBy,
              source: "ai",
            },
          }),
        );
      } else if (action.type === "add_to_cart") {
        let product = allProducts?.find((p) => p.id === action.productId);
        if (!product) {
          const fromCards = suggestedProducts.find((p) => p.id === action.productId);
          if (fromCards) {
            try {
              const res = await fetch(`/api/products/${fromCards.id}`);
              if (res.ok) {
                product = (await res.json()) as Product;
              }
            } catch {
              // Ignore fetch failures and fall through to graceful no-op.
            }
          }
        }
        if (product) {
          const quantity = Math.max(1, action.quantity || 1);
          for (let i = 0; i < quantity; i += 1) {
            addToCart(product);
          }
          toast({
            title: "Added to cart",
            description: `${product.name} x${quantity}`,
            className: "border-[#be8451]/40 shadow-2xl",
          });
        }
      } else if (action.type === "navigate_checkout") {
        setLocation("/checkout");
        setIsOpen(false);
      } else if (action.type === "apply_coupon") {
        setDiscount(action.code, action.discountAmount);
        const isDiscount = action.discountAmount > 0;
        const isNoDiscount = action.discountAmount === 0;
        toast({
          title: isDiscount ? "Coupon applied" : isNoDiscount ? "No discount applied" : "Price adjusted",
          description: isDiscount
            ? `${action.code} saved ${action.discountAmount}%`
            : isNoDiscount
              ? "Tone-based policy did not allow a discount."
              : `${action.code} increased price by ${Math.abs(action.discountAmount)}%`,
        });
      }
    }
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const lastAssistantWithProducts = [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && Array.isArray(m.products) && m.products.length > 0);
      const lastSuggestedProductIds = lastAssistantWithProducts?.products?.map((p) => p.id) ?? [];
      const lastSuggestedProductId = lastSuggestedProductIds.length > 0 ? lastSuggestedProductIds[0] : null;

      const res = await apiRequest("POST", "/api/chat", {
        message,
        context: getChatContext(
          items.map((item) => item.id),
          cartTotal(),
          lastSuggestedProductId,
          lastSuggestedProductIds,
        ),
      });
      return (await res.json()) as ChatResponse;
    },
    onSuccess: (data) => {
      const products = Array.isArray(data.products) ? data.products : [];
      let assistantText =
        data.message ||
        data.content ||
        (products.length > 0 ? buildLeadText(products) : "I found some solid options for you.");
      if (products.length > 0 && looksStructuredResponse(assistantText)) {
        assistantText = buildLeadText(products);
      }
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: assistantText,
        products,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (Array.isArray(data.actions) && data.actions.length > 0) {
        void runActions(data.actions, products);
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "system",
          content: "My bad, that one glitched. Try again and I got you.",
        },
      ]);
    },
  });

  const sendMessage = (text: string) => {
    const outgoing = text.trim();
    if (!outgoing || chatMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: outgoing,
      },
    ]);
    setInputValue("");
    chatMutation.mutate(outgoing);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(inputValue);
  };

  const toggleClerk = () => setIsOpen((prev) => !prev);

  return (
    <>
      <motion.button
        onClick={toggleClerk}
        className={`fixed bottom-6 right-6 z-50 rounded-full border p-4 shadow-[0_22px_45px_-25px_rgba(8,11,20,0.9)] transition-all ${
          isOpen
            ? "border-[#c7cedb] bg-white text-[#121826]"
            : "border-[#be8451]/25 bg-[#121826] text-white hover:bg-[#1d2940]"
        }`}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        data-testid="button-toggle-chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            className="fixed bottom-24 right-6 z-[60] flex h-[670px] max-h-[calc(100vh-140px)] w-[430px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[2rem] border border-[#d5dce9] bg-[linear-gradient(180deg,#fbfcff_0%,#f5f7fb_100%)] shadow-[0_35px_95px_-40px_rgba(12,18,29,0.95)]"
          >
            <div className="border-b border-[#dce2ee] bg-white/75 px-5 py-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#121826] text-white shadow-lg">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#131a2a]">The Clerk</h3>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d5d2f]">
                      Premium Assistant
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleClerk}
                  className="rounded-full p-2 text-[#58657c] transition-colors hover:bg-[#eef2f8] hover:text-[#151d2d]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-[#d9dfec] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5d6982] transition-colors hover:border-[#cba173] hover:text-[#8d5d2f]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#121826] text-white"
                          : msg.role === "system"
                            ? "border border-[#f3c5c5] bg-[#fff2f2] text-[#8f2f2f]"
                            : "border border-[#dde3ef] bg-white text-[#1f2940]"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>

                  {msg.role === "assistant" && Array.isArray(msg.products) && msg.products.length > 0 && (
                    <div className="grid grid-cols-1 gap-2.5">
                      {msg.products.map((product) => (
                        <div
                          key={product.id}
                          className="flex gap-3 rounded-2xl border border-[#dce2ee] bg-white p-3 shadow-[0_18px_45px_-40px_rgba(12,18,29,0.9)] transition-all hover:border-[#d0d9e8]"
                        >
                          <button
                            className="block overflow-hidden rounded-xl"
                            onClick={() => navigateToProduct(product)}
                            aria-label={`Open ${product.name}`}
                          >
                            <img src={product.image} className="h-20 w-20 object-cover" alt={product.name} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <button onClick={() => navigateToProduct(product)} className="text-left">
                              <h4 className="truncate text-sm font-semibold text-[#151d2d] hover:text-[#8d5d2f]">
                                {product.name}
                              </h4>
                            </button>
                            <div className="mt-1 flex items-center gap-2 text-xs text-[#6f7b92]">
                              <div className="flex items-center gap-1 text-[#b17642]">
                                <Star className="h-3 w-3 fill-current" /> {product.rating}
                              </div>
                              <span>•</span>
                              <span>{product.category}</span>
                            </div>
                            {Array.isArray(product.vibes) && product.vibes.length > 0 && (
                              <div className="mt-2 flex gap-1">
                                {product.vibes.slice(0, 2).map((vibe) => (
                                  <span
                                    key={`${product.id}-${vibe}`}
                                    className="rounded-full bg-[#f7ecdf] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8d5d2f]"
                                  >
                                    {vibe}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm font-semibold text-[#a66f3e]">
                                ${Number(product.price).toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => navigateToProduct(product)}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#dce2ee] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#44506a] hover:border-[#cba173] hover:text-[#8d5d2f]"
                                >
                                  View <ChevronRight className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    const found = allProducts?.find((p) => p.id === product.id);
                                    if (found) addToCart(found);
                                  }}
                                  className="rounded-full bg-[#121826] p-2 text-white hover:bg-[#1d2940]"
                                  aria-label={`Add ${product.name} to cart`}
                                >
                                  <ShoppingBag className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-[#dde3ef] bg-white px-4 py-3 text-sm text-[#5f6c84]">
                    <Sparkles className="h-4 w-4 text-[#b17642]" /> Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="border-t border-[#dce2ee] bg-white/80 p-4 backdrop-blur-xl">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask for products, deals, or add items"
                  className="w-full rounded-2xl border border-[#d6dce9] bg-white py-3 pl-4 pr-14 text-sm text-[#1b2438] outline-none transition-all placeholder:text-[#97a2b6] focus:border-[#b17642] focus:ring-4 focus:ring-[#b17642]/15"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || chatMutation.isPending}
                  className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#121826] text-white transition-colors hover:bg-[#1d2940] disabled:cursor-not-allowed disabled:bg-[#9aa4b5]"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
