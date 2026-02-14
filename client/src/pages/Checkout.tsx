import { useCart } from "@/hooks/use-cart";
import { Navigation } from "@/components/Navigation";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check, CreditCard, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const { items, finalTotal, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      clearCart();
      toast({
        title: "Order Placed!",
        description: "Thank you for your purchase.",
      });
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="font-display text-4xl font-bold mb-4">Order Confirmed!</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Your order has been placed successfully. You will receive an email confirmation shortly.
        </p>
        <Link href="/">
          <button className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors">
            Continue Shopping
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <Navigation />

      <main className="pt-32 max-w-4xl mx-auto px-4">
        <h1 className="font-display text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-2 space-y-6">
            {/* Shipping */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-border">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">1</span>
                Shipping Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input type="text" className="w-full p-2.5 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input type="text" className="w-full p-2.5 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input type="text" className="w-full p-2.5 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-border">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">2</span>
                Payment
              </h2>
              <div className="p-4 border border-primary/20 bg-primary/5 rounded-xl mb-4 flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Payments are secure and encrypted</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Card Number</label>
                  <div className="relative">
                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full p-2.5 pl-10 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <CreditCard className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiry</label>
                    <input type="text" placeholder="MM/YY" className="w-full p-2.5 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CVC</label>
                    <input type="text" placeholder="123" className="w-full p-2.5 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border sticky top-24">
              <h3 className="font-bold text-lg mb-4">Order Summary</h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-2">
                {items.map(item => (
                  <div key={`${item.id}-${item.selectedColor}`} className="flex gap-3 text-sm">
                    <div className="w-12 h-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      <img src={item.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium line-clamp-1">{item.name}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${finalTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border mt-2">
                  <span>Total</span>
                  <span>${finalTotal().toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full mt-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  `Pay $${finalTotal().toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
