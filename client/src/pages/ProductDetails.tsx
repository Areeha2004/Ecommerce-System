import { useParams } from "wouter";
import { useProduct } from "@/hooks/use-products";
import { useCart } from "@/hooks/use-cart";
import { Navigation } from "@/components/Navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { Loader2, Star, ShieldCheck, Truck, RotateCcw, Sparkles, BadgeCheck } from "lucide-react";
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

const assuranceItems = [
  {
    title: "Free Express Shipping",
    icon: Truck,
    copy: "Delivered in premium packaging within 2-4 business days.",
  },
  {
    title: "Verified Authenticity",
    icon: ShieldCheck,
    copy: "Every product is quality checked and verified by our team.",
  },
  {
    title: "Easy 30-Day Returns",
    icon: RotateCcw,
    copy: "Simple return and exchange process with concierge support.",
  },
];

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
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <Loader2 className="h-8 w-8 animate-spin text-[#b17642]" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f3f4f6] text-center">
        <h2 className="font-display text-3xl font-bold text-[#161c2c]">Product not found</h2>
        <a href="/" className="rounded-full bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white">
          Return Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f4f6] pb-20 text-[#161c2c]">
      <Navigation />
      <CartDrawer />

      <main className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#d9dee8] bg-white shadow-[0_28px_80px_-44px_rgba(16,23,38,0.85)]">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#5b86a0]/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#c49363]/20 blur-3xl" />

          <div className="relative grid grid-cols-1 gap-10 p-5 sm:p-8 lg:grid-cols-2 lg:gap-14 lg:p-10">
            <motion.div
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55 }}
              className="space-y-4"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#edf2f8]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#101728]/45 to-transparent" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-[#d8deea] bg-[#edf2f8]"
                  >
                    <img
                      src={product.image}
                      alt="Product alternate preview"
                      className="h-full w-full object-cover opacity-80 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100"
                    />
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="flex flex-col"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-[#e4c6a6] bg-[#f8efe5] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9b6634]">
                  {product.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d9dee8] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4f5f79]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Premium Quality
                </span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-tight text-[#121a2a] sm:text-5xl">
                {product.name}
              </h1>

              <div className="mt-4 flex items-center gap-4">
                <p className="text-3xl font-semibold text-[#ab723f]">${Number(product.price).toFixed(2)}</p>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f6fb] px-3 py-1.5 text-sm text-[#44506a]">
                  <Star className="h-4 w-4 fill-[#c58e5d] text-[#c58e5d]" />
                  <span className="font-semibold">{product.rating}</span>
                  <span className="text-[#6f7d96]">(124 reviews)</span>
                </div>
              </div>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#58657b]">{product.description}</p>

              <div className="mt-8">
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.18em] text-[#7a859c]">
                  Selected color: <span className="text-[#121a2a]">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      title={color}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                        selectedColor === color
                          ? "scale-105 border-[#ab723f] shadow-[0_10px_25px_-18px_rgba(171,114,63,0.9)]"
                          : "border-[#d6dce8] hover:scale-105"
                      }`}
                    >
                      <span
                        className="h-7 w-7 rounded-full border border-[#d5dae6]"
                        style={{ background: colorToCss(color) }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <div className="inline-flex items-center justify-between rounded-xl border border-[#d7deea] bg-[#f7f9fd] px-2 sm:min-w-[140px]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="rounded-lg px-3 py-3 text-[#637089] transition-colors hover:text-[#121a2a]"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-[#1f2940]">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="rounded-lg px-3 py-3 text-[#637089] transition-colors hover:text-[#121a2a]"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => addToCart(product, quantity, selectedColor)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#121a2a] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_18px_36px_-26px_rgba(18,26,42,1)] transition-all hover:-translate-y-0.5 hover:bg-[#1d2940]"
                >
                  <Sparkles className="h-4 w-4" />
                  Add To Cart  ${(Number(product.price) * quantity).toFixed(2)}
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {assuranceItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-[#dde3ed] bg-[#fbfcff] p-4"
                    >
                      <Icon className="h-4.5 w-4.5 text-[#8e5c31]" />
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#2d364d]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[#6a7891]">{item.copy}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
