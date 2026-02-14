import { useParams } from "wouter";
import { useProduct } from "@/hooks/use-products";
import { useCart } from "@/hooks/use-cart";
import { Navigation } from "@/components/Navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { Loader2, Star, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function colorToCss(color: string): string {
  const normalized = color.trim().toLowerCase();
  const map: Record<string, string> = {
    white: "#f5f5f5",
    black: "#111111",
    beige: "#d5c3a1",
    navy: "#1f2a44",
    olive: "#708238",
    khaki: "#c3b091",
    brown: "#7a4e2d",
    tan: "#d2b48c",
    red: "#c62828",
    blue: "#1e5aa8",
    pink: "#d86f9f",
    grey: "#7a7a7a",
    gray: "#7a7a7a",
    gold: "#b08d57",
    silver: "#a8a8a8",
    natural: "#d8c3a5",
    striped: "repeating-linear-gradient(45deg, #1f2a44 0 8px, #f5f5f5 8px 16px)",
    tortoise: "#6d4c41",
    cognac: "#9a5a31",
    camel: "#c19a6b",
    "light wash": "#8bb5d9",
    "dark wash": "#2a3f5f",
    "light blue": "#8ab6e8",
    "floral red": "linear-gradient(135deg, #b73a3a, #f5b3b3)",
    "floral blue": "linear-gradient(135deg, #2f5ea8, #a9c8f2)",
    "silver/black": "linear-gradient(135deg, #c0c0c0 0 50%, #111111 50% 100%)",
    "gold/brown": "linear-gradient(135deg, #b08d57 0 50%, #7a4e2d 50% 100%)",
  };

  if (map[normalized]) return map[normalized];
  return "#9aa0a6";
}

export default function ProductDetails() {
  const { id } = useParams();
  const { data: product, isLoading, error } = useProduct(Number(id));
  const { addToCart } = useCart();
  
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>("");

  useEffect(() => {
    if (!product) return;

    try {
      const raw = window.localStorage.getItem("clerk-activity");
      const parsed = raw ? JSON.parse(raw) : {};
      const current: number[] = Array.isArray(parsed.recentlyViewedProductIds)
        ? parsed.recentlyViewedProductIds
        : [];
      const updated = [...current.filter((id) => id !== product.id), product.id].slice(-15);

      window.localStorage.setItem(
        "clerk-activity",
        JSON.stringify({
          recentlyViewedProductIds: updated,
        }),
      );
    } catch {
      // Ignore localStorage failures.
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    if (!selectedColor && product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
  }, [product, selectedColor]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h2 className="text-2xl font-display font-bold">Product not found</h2>
        <a href="/" className="text-primary hover:underline">Return Home</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      <CartDrawer />

      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* Image Gallery Side */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="aspect-[4/5] bg-muted rounded-3xl overflow-hidden border border-border">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            {/* Thumbnails (Mock) */}
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-muted rounded-xl border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  <img src={product.image} alt="Thumbnail" className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Details Side */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col justify-center"
          >
            <div className="mb-2 flex items-center gap-2">
               <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                 {product.category}
               </span>
               <div className="flex items-center text-yellow-400 gap-1">
                 <Star className="w-4 h-4 fill-current" />
                 <span className="text-foreground text-sm font-bold">{product.rating}</span>
                 <span className="text-muted-foreground text-sm font-normal">(124 reviews)</span>
               </div>
            </div>

            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              {product.name}
            </h1>

            <div className="text-3xl font-medium text-primary mb-8">
              ${Number(product.price).toFixed(2)}
            </div>

            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              {product.description}
            </p>

            {/* Colors */}
            <div className="mb-8">
              <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
                Select Color: <span className="text-foreground">{selectedColor}</span>
              </label>
              <div className="flex gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedColor === color ? "border-primary scale-110" : "border-transparent hover:scale-105"
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full border border-border shadow-sm"
                      style={{ background: colorToCss(color) }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mb-10">
              <div className="flex items-center border border-border rounded-xl bg-white px-2">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-muted-foreground hover:text-foreground"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 text-muted-foreground hover:text-foreground"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => addToCart(product, quantity, selectedColor)}
                className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                Add to Cart - ${(Number(product.price) * quantity).toFixed(2)}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 py-6 border-t border-border">
              <div className="text-center">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-2 text-foreground">
                  <Truck className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold">Free Shipping</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-2 text-foreground">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold">2 Year Warranty</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-2 text-foreground">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold">30 Day Returns</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
