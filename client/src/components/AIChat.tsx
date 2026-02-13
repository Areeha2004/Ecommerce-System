import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, ShoppingBag, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | null;
  tool_calls?: any[];
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm The Clerk, your personal shopper. How can I help you today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const { addToCart, applyDiscount } = useCart();
  const [, setLocation] = useLocation();

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", { message });
      return res.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.content,
        tool_calls: data.tool_calls
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.tool_calls) {
        data.tool_calls.forEach((call: any) => {
          const args = JSON.parse(call.function.arguments);
          if (call.function.name === "search_products") {
            window.dispatchEvent(new CustomEvent('search-products', { detail: args }));
          } else if (call.function.name === "add_to_cart") {
            const productId = parseInt(args.productId);
            // Search through all products to find the right one
            if (allProducts) {
              const product = allProducts.find(p => p.id === productId);
              if (product) {
                for (let i = 0; i < (args.quantity || 1); i++) {
                  addToCart(product);
                }
              }
            }
          } else if (call.function.name === "sort_products") {
            window.dispatchEvent(new CustomEvent('sort-products', { detail: args.sortBy === 'price_low' ? 'price_asc' : 'price_desc' }));
          } else if (call.function.name === "apply_coupon") {
            setDiscount(args.code, args.discount);
          }
        });
      }
    }
  });

  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const { data: allProducts } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.tool_calls && allProducts) {
      const searchCall = lastMessage.tool_calls.find(c => c.function.name === "search_products");
      if (searchCall) {
        const args = JSON.parse(searchCall.function.arguments);
        const query = args.query?.toLowerCase() || "";
        const filtered = allProducts.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
        ).slice(0, 3);
        setRecommendedProducts(filtered);
      } else {
        setRecommendedProducts([]);
      }
    } else {
      setRecommendedProducts([]);
    }
  }, [messages, allProducts]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(inputValue);
    setInputValue("");
  };

  const toggleClerk = () => setIsOpen(!isOpen);

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
                  <p className="text-[10px] font-bold tracking-widest uppercase text-primary">Neural Intelligence</p>
                </div>
              </div>
              <button onClick={toggleClerk} className="p-2 hover:bg-black/5 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-4">
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm ${
                      msg.role === 'user' ? 'bg-primary text-white' : 'bg-white/80 dark:bg-muted/50 border shadow-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                  
                  {msg.role === "assistant" && recommendedProducts.length > 0 && messages[messages.length-1].id === msg.id && (
                    <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2">
                      {recommendedProducts.map(product => (
                        <div key={product.id} className="bg-white/90 dark:bg-muted/80 border rounded-2xl p-3 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
                          <img src={product.image} className="w-20 h-20 object-cover rounded-xl" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm truncate">{product.name}</h4>
                            <div className="flex items-center gap-2 text-xs mt-1 text-muted-foreground">
                              <div className="flex items-center gap-1 text-primary"><Star className="w-3 h-3 fill-current" /> {product.rating}</div>
                              <span>•</span>
                              <span>{product.category}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-primary">${Number(product.price)}</span>
                              <div className="flex gap-2">
                                <Link href={`/product/${product.id}`} className="text-[10px] font-bold uppercase tracking-widest hover:text-primary">View</Link>
                                <button onClick={() => addToCart(product)} className="text-primary"><ShoppingBag className="w-4 h-4" /></button>
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
                  <div className="bg-white/50 border px-5 py-3 rounded-2xl animate-pulse">Thinking...</div>
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
                  placeholder="Inquire with the Clerk..."
                  className="w-full pl-6 pr-14 py-4 glass border rounded-2xl text-sm outline-none"
                />
                <button type="submit" disabled={!inputValue.trim() || chatMutation.isPending} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl">
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
