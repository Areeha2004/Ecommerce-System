import { useCart } from "@/hooks/use-cart";
import { X, Minus, Plus, Trash2, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function CartDrawer() {
  const { 
    isOpen, 
    toggleCart, 
    items, 
    updateQuantity, 
    removeFromCart, 
    cartTotal,
    discountCode,
    discountAmount,
    setDiscount,
    finalTotal
  } = useCart();
  
  const [promoInput, setPromoInput] = useState("");
  const { toast } = useToast();

  const negotiateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.negotiate.offer.path, {
        method: api.negotiate.offer.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "verify_code", cartTotal: cartTotal() }),
      });
      // Mocking validation logic here since the real backend does complex NLP
      // In a real app, we'd hit a dedicated verify-code endpoint
      if (promoInput.toUpperCase() === "WELCOME10") return { discountAmount: 10 };
      if (promoInput.toUpperCase() === "BDAY-20") return { discountAmount: 20 };
      throw new Error("Invalid code");
    },
    onSuccess: (data) => {
      setDiscount(promoInput.toUpperCase(), data.discountAmount);
      toast({
        title: "Discount Applied!",
        description: `You saved ${data.discountAmount}%`,
      });
      setPromoInput("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "That code didn't work. Try chatting with our assistant!",
      });
    }
  });

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput) return;
    negotiateMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 1 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background shadow-[0_0_100px_rgba(0,0,0,0.2)] flex flex-col"
          >
            <div className="p-8 border-b border-border/50 flex items-center justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold">Shopping Bag</h2>
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mt-1">{items.length} Curated Items</p>
              </div>
              <button 
                onClick={toggleCart}
                className="p-3 hover:bg-muted rounded-full transition-all hover:rotate-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-bold">Your bag is empty</h3>
                    <p className="text-muted-foreground font-light">Add pieces to your collection to see them here.</p>
                  </div>
                  <button 
                    onClick={toggleCart}
                    className="px-8 py-3 bg-foreground text-background rounded-full font-bold text-sm tracking-widest uppercase hover:bg-foreground/90 transition-all"
                  >
                    Explore Shop
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {items.map((item) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={`${item.id}-${item.selectedColor}`} 
                      className="flex gap-6 group"
                    >
                      <div className="w-24 h-32 rounded-2xl bg-muted overflow-hidden flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col py-1">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">{item.name}</h4>
                            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">{item.category}</p>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-4 bg-muted/50 p-1 rounded-full">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-sans font-bold text-lg">${Number(item.price).toFixed(0)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-8 bg-muted/10 border-t border-border/50 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                    <span className="text-lg font-bold">${cartTotal().toFixed(2)}</span>
                  </div>
                  
                  {discountAmount > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex justify-between items-center text-primary"
                    >
                      <span className="text-sm font-medium">Privilege Discount</span>
                      <span className="text-sm font-bold">-{discountAmount}%</span>
                    </motion.div>
                  )}
                  
                  <div className="flex justify-between items-center pt-4 border-t border-border/50">
                    <span className="text-lg font-bold">Investment Total</span>
                    <span className="text-3xl font-display font-bold text-primary">${finalTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Link href="/checkout">
                    <button 
                      onClick={toggleCart}
                      className="w-full py-5 bg-foreground text-background rounded-full font-bold text-sm tracking-widest uppercase shadow-2xl hover:bg-foreground/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Proceed to Checkout
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
