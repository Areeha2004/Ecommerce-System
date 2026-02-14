import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, ShoppingBag, Star } from "lucide-react";
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
  stock: number;
  image: string;
  url: string;
};

type ChatAction =
  | { type: "search_products"; query?: string; category?: string }
  | { type: "sort_products"; sortBy: "price_asc" | "price_desc" | "rating" }
  | { type: "add_to_cart"; productId: number; quantity: number }
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

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Yo, I’m The Clerk. Tell me your vibe and I’ll find the best picks and add them to cart for you.",
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
        window.dispatchEvent(new CustomEvent("search-products", { detail: { query: action.query, category: action.category } }));
      } else if (action.type === "sort_products") {
        window.dispatchEvent(new CustomEvent("sort-products", { detail: action.sortBy }));
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
          });
        }
      } else if (action.type === "apply_coupon") {
        setDiscount(action.code, action.discountAmount);
        toast({
          title: action.discountAmount >= 0 ? "Coupon applied" : "Price adjusted",
          description:
            action.discountAmount >= 0
              ? `${action.code} saved ${action.discountAmount}%`
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

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || chatMutation.isPending) return;

    const outgoing = inputValue.trim();
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

  const toggleClerk = () => setIsOpen((prev) => !prev);

  return (
    <>
      <motion.button
        onClick={toggleClerk}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-colors ${
          isOpen ? "bg-secondary text-white" : "bg-primary text-white hover:bg-primary/90"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="button-toggle-chat"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-[60] w-[420px] max-w-[calc(100vw-48px)] h-[650px] max-h-[calc(100vh-140px)] glass rounded-[2.5rem] shadow-2xl border-white/20 flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-border/10 bg-black/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-xl rotate-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl">The Clerk</h3>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-primary">Action Assistant</p>
                </div>
              </div>
              <button onClick={toggleClerk} className="p-2 hover:bg-black/5 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-4">
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm ${
                        msg.role === "user" ? "bg-primary text-white" : "bg-white/80 dark:bg-muted/50 border shadow-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>

                  {msg.role === "assistant" && Array.isArray(msg.products) && msg.products.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2">
                      {msg.products.map((product) => (
                        <div
                          key={product.id}
                          className="bg-white/90 dark:bg-muted/80 border rounded-2xl p-3 flex gap-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <button
                            className="block"
                            onClick={() => navigateToProduct(product)}
                            aria-label={`Open ${product.name}`}
                          >
                            <img src={product.image} className="w-20 h-20 object-cover rounded-xl" alt={product.name} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => navigateToProduct(product)}
                              className="text-left"
                            >
                              <h4 className="font-bold text-sm truncate hover:text-primary">{product.name}</h4>
                            </button>
                            <div className="flex items-center gap-2 text-xs mt-1 text-muted-foreground">
                              <div className="flex items-center gap-1 text-primary">
                                <Star className="w-3 h-3 fill-current" /> {product.rating}
                              </div>
                              <span>•</span>
                              <span>{product.category}</span>
                            </div>
                            <div className="text-[11px] mt-1 text-muted-foreground">{product.reviewsCount} reviews</div>
                            <div className="text-[11px] mt-1 text-muted-foreground">Stock: {product.stock}</div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-primary">${Number(product.price).toFixed(2)}</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => navigateToProduct(product)}
                                  className="text-[10px] font-bold uppercase tracking-widest hover:text-primary"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    const found = allProducts?.find((p) => p.id === product.id);
                                    if (found) addToCart(found);
                                  }}
                                  className="text-primary"
                                  aria-label={`Add ${product.name} to cart`}
                                >
                                  <ShoppingBag className="w-4 h-4" />
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
                  <div className="bg-white/50 border px-5 py-3 rounded-2xl animate-pulse">Working on it...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-6 pt-2">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask for products, deals, or add items..."
                  className="w-full pl-6 pr-14 py-4 glass border rounded-2xl text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || chatMutation.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
