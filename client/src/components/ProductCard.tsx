import { useLocation } from "wouter";
import { type Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag, Star } from "lucide-react";
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

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [, setLocation] = useLocation();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col h-full premium-card rounded-2xl p-2 cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={() => setLocation(`/product/${product.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setLocation(`/product/${product.id}`);
        }
      }}
    >
      {/* Image Container */}
      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-muted relative mb-4">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-in-out"
        />
        
        {/* Quick Add Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addToCart(product);
          }}
          className="absolute bottom-4 right-4 w-12 h-12 glass rounded-full flex items-center justify-center text-foreground translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 hover:bg-primary hover:text-white"
        >
          <ShoppingBag className="w-5 h-5" />
        </button>

        {/* Badge */}
        {Number(product.rating) >= 4.8 && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold tracking-widest uppercase rounded-full border border-white/10 shadow-xl">
            Exclusive
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pb-4 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-4 mb-2">
          <h3 className="font-display font-bold text-xl leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
            {product.name}
          </h3>
          <span className="font-sans font-semibold text-lg text-primary">
            ${Number(product.price).toFixed(0)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          {product.colors.slice(0, 3).map((color) => (
            <span
              key={color}
              title={color}
              className="inline-block w-4 h-4 rounded-full border border-border/70"
              style={{ background: colorToCss(color) }}
            />
          ))}
          {product.colors.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{product.colors.length - 3}</span>
          )}
        </div>
        
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-primary text-primary" />
            <span className="text-xs font-bold text-foreground">{product.rating}</span>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">{product.category}</span>
        </div>
      </div>
    </motion.div>
  );
}
