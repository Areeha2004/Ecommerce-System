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
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background shadow-2xl flex flex-col"
          >
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/10">
              <h2 className="font-display text-xl font-bold">Your Bag ({items.length})</h2>
              <button 
                onClick={toggleCart}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                    <Tag className="w-8 h-8" />
                  </div>
                  <p className="text-muted-foreground">Your bag is empty.</p>
                  <button 
                    onClick={toggleCart}
                    className="text-primary font-medium hover:underline"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.id}-${item.selectedColor}`} className="flex gap-4">
                    <div className="w-20 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-foreground line-clamp-1">{item.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {item.selectedColor && (
                          <p className="text-sm text-muted-foreground capitalize mt-1">
                            Color: {item.selectedColor}
                          </p>
                        )}
                        <p className="font-medium mt-1">${Number(item.price).toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-5 bg-muted/10 border-t border-border space-y-4">
                {/* Discount Code */}
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Discount code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button 
                    type="submit"
                    disabled={!promoInput || negotiateMutation.isPending}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50"
                  >
                    Apply
                  </button>
                </form>

                {discountCode && (
                  <div className="flex justify-between items-center text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      Code <strong>{discountCode}</strong> applied
                    </span>
                    <button 
                      onClick={() => setDiscount("", 0)}
                      className="text-xs font-medium hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${cartTotal().toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{discountAmount}%</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span>${finalTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Link href="/checkout">
                  <button 
                    onClick={toggleCart}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    Checkout
                  </button>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
