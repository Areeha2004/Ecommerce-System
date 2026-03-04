import { useCart } from "@/hooks/use-cart";
import { X, Minus, Plus, ShoppingBag, Trash2, Tag, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { colorToCss } from "@/lib/color-utils";

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
    finalTotal,
  } = useCart();

  const [promoInput, setPromoInput] = useState("");
  const { toast } = useToast();

  const negotiateMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.negotiate.offer.path, {
        method: api.negotiate.offer.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "verify_code", cartTotal: cartTotal() }),
      });
      if (promoInput.toUpperCase() === "WELCOME10") return { discountAmount: 10 };
      if (promoInput.toUpperCase() === "BDAY-20") return { discountAmount: 20 };
      throw new Error("Invalid code");
    },
    onSuccess: (data) => {
      setDiscount(promoInput.toUpperCase(), data.discountAmount);
      toast({
        title: "Discount applied",
        description: `You saved ${data.discountAmount}%`,
      });
      setPromoInput("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "That code did not work. Try chatting with our assistant.",
      });
    },
  });

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim() || negotiateMutation.isPending) return;
    negotiateMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="fixed inset-0 z-50 bg-[#0a0e17]/55 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 285, mass: 1 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-[#dbe2ef] bg-[linear-gradient(180deg,#fbfcff_0%,#f3f6fb_100%)] shadow-[0_0_120px_-35px_rgba(12,18,29,0.9)]"
          >
            <div className="border-b border-[#dde4ef] bg-white/75 px-6 py-5 backdrop-blur-xl sm:px-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-3xl font-bold text-[#121a2a]">Shopping Bag</h2>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7f8ca4]">
                    {items.length} Curated Items
                  </p>
                </div>
                <button
                  onClick={toggleCart}
                  className="rounded-full p-2.5 text-[#5c6880] transition-all hover:bg-[#edf2f8] hover:text-[#131b2c]"
                  aria-label="Close cart"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6 sm:px-8">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e9eef7] text-[#8a96ab]">
                    <ShoppingBag className="h-9 w-9" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-[#141d2f]">Your bag is empty</h3>
                  <p className="mt-2 max-w-xs text-sm text-[#68758d]">
                    Add premium items to your collection and they will appear here.
                  </p>
                  <button
                    onClick={toggleCart}
                    className="mt-6 rounded-full bg-[#121a2a] px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#1d2940]"
                  >
                    Explore Shop
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {items.map((item) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={`${item.id}-${item.selectedColor}`}
                      className="group flex gap-4 rounded-2xl border border-[#dce3ef] bg-white p-3 shadow-[0_18px_40px_-34px_rgba(12,18,29,0.9)]"
                    >
                      <div className="h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#e9edf6]">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>

                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="line-clamp-1 text-base font-semibold text-[#171f31]">{item.name}</h4>
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a879f]">
                              {item.category}
                            </p>
                            {item.selectedColor && (
                              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#d8dfec] bg-[#f8faff] px-2 py-1">
                                <span
                                  className="h-3.5 w-3.5 rounded-full border border-[#ccd4e3]"
                                  style={{ background: colorToCss(item.selectedColor) }}
                                />
                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#55627a]">
                                  {item.selectedColor}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id, item.selectedColor)}
                            className="rounded-full p-1.5 text-[#7f8ca3] transition-colors hover:bg-[#f9ecea] hover:text-[#b84343]"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-auto flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#dce3ef] bg-[#f6f8fc] p-1">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedColor)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#60708a] transition-colors hover:bg-[#121a2a] hover:text-white"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-semibold text-[#1e2840]">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedColor)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#60708a] transition-colors hover:bg-[#121a2a] hover:text-white"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-lg font-semibold text-[#9c6434]">${Number(item.price).toFixed(0)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[#dde4ef] bg-white/85 px-6 py-5 backdrop-blur-xl sm:px-8">
                <form onSubmit={handleApplyPromo} className="mb-5">
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.17em] text-[#7f8ca4]">
                    Promo Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d99b0]" />
                      <input
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Enter code"
                        className="w-full rounded-xl border border-[#d8dfec] bg-white py-2.5 pl-10 pr-3 text-sm text-[#1a2337] outline-none transition-all placeholder:text-[#97a3b8] focus:border-[#b17642] focus:ring-4 focus:ring-[#b17642]/15"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!promoInput.trim() || negotiateMutation.isPending}
                      className="rounded-xl bg-[#121a2a] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1d2940] disabled:cursor-not-allowed disabled:bg-[#8f9ab0]"
                    >
                      Apply
                    </button>
                  </div>
                  {discountCode && discountAmount > 0 && (
                    <p className="mt-2 text-xs text-[#8d5d2f]">
                      Applied: <span className="font-semibold">{discountCode}</span> ({discountAmount}% off)
                    </p>
                  )}
                </form>

                <div className="space-y-2.5 border-t border-[#e4e9f2] pt-4">
                  <div className="flex items-center justify-between text-sm text-[#64718a]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#1f2940]">${cartTotal().toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between text-sm text-[#8d5d2f]"
                    >
                      <span>Discount</span>
                      <span className="font-semibold">-{discountAmount}%</span>
                    </motion.div>
                  )}
                  <div className="flex items-center justify-between border-t border-[#e4e9f2] pt-3">
                    <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[#33405b]">Total</span>
                    <span className="font-display text-3xl font-bold text-[#b17642]">${finalTotal().toFixed(2)}</span>
                  </div>
                </div>

                <Link href="/checkout">
                  <button
                    onClick={toggleCart}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#121a2a] px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_20px_40px_-30px_rgba(12,18,29,1)] transition-all hover:-translate-y-0.5 hover:bg-[#1d2940]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Proceed to Checkout
                  </button>
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
