import { useLocation } from "wouter";
import { type Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag, Star, ArrowUpRight } from "lucide-react";
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
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.6rem] border border-[#dbe1eb] bg-white shadow-[0_20px_55px_-40px_rgba(18,24,38,0.95)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_75px_-38px_rgba(18,24,38,0.8)]"
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
      <div className="relative mb-4 aspect-[4/5] overflow-hidden bg-[#ecf0f6]">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f1420]/55 via-transparent to-transparent opacity-70" />

        {Number(product.rating) >= 4.8 && (
          <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-[#121826]/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
            Exclusive
          </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addToCart(product);
          }}
          className="absolute bottom-4 right-4 flex h-11 w-11 translate-y-3 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white opacity-0 backdrop-blur-md transition-all duration-500 hover:bg-[#be8451] group-hover:translate-y-0 group-hover:opacity-100"
          aria-label={`Add ${product.name} to cart`}
        >
          <ShoppingBag className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 flex-1 font-display text-xl font-semibold leading-tight text-[#161c2c] transition-colors group-hover:text-[#0e1422]">
            {product.name}
          </h3>
          <span className="text-lg font-semibold text-[#a86f3d]">${Number(product.price).toFixed(0)}</span>
        </div>

        <div className="mb-4 flex items-center gap-1.5">
          {product.colors.slice(0, 3).map((color) => (
            <span
              key={color}
              title={color}
              className="inline-block h-4 w-4 rounded-full border border-[#ced5e3]"
              style={{ background: colorToCss(color) }}
            />
          ))}
          {product.colors.length > 3 && (
            <span className="text-[10px] font-medium text-[#7a869d]">+{product.colors.length - 3}</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[#e4e9f2] pt-3.5">
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-[#c38a55] text-[#c38a55]" />
            <span className="text-xs font-semibold text-[#1f2940]">{product.rating}</span>
          </div>
          <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a869d]">
            {product.category}
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
