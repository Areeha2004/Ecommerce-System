import { useState, useRef, useEffect } from "react";
import { useClerk } from "@/hooks/use-clerk";
import { MessageCircle, X, Send, Sparkles, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import { useLocation } from "wouter";

export function AIChat() {
  const { messages, isTyping, isOpen, sendMessage, toggleClerk } = useClerk();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { items } = useCart();
  const [location] = useLocation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const message = inputValue;
    setInputValue("");
    
    // Provide context to the clerk
    const context = {
      currentPage: location,
      cartItems: items.map(i => i.name),
      cartTotal: items.reduce((acc, i) => acc + (Number(i.price) * i.quantity), 0)
    };

    await sendMessage(message, context);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        onClick={toggleClerk}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-colors ${
          isOpen ? "bg-secondary text-white" : "bg-primary text-white hover:bg-primary/90"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Shop Assistant</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Online & Ready to help
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted p-4 rounded-2xl rounded-bl-sm flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-border bg-white">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask for recommendations..."
                  className="w-full pl-4 pr-12 py-3 bg-muted/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setInputValue("Suggest a summer outfit")}
                  className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground transition-colors"
                >
                  Summer Outfit
                </button>
                <button
                  type="button"
                  onClick={() => setInputValue("Any discounts available?")}
                  className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground transition-colors"
                >
                  Discounts?
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
