import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { useProducts } from "@/hooks/use-products";
import { Search, ArrowUpRight, Sparkles, Gem, ShieldCheck, Truck } from "lucide-react";
import { motion } from "framer-motion";

const highlightItems = [
  {
    title: "Editor Curated",
    text: "Pieces selected weekly by our in-house style board.",
    icon: Gem,
  },
  {
    title: "Certified Craft",
    text: "Materials and finish quality verified before listing.",
    icon: ShieldCheck,
  },
  {
    title: "Priority Delivery",
    text: "Fast, careful shipping with premium packaging.",
    icon: Truck,
  },
];

const lookbookCards = [
  {
    title: "Urban Minimal",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1200",
    copy: "Clean silhouettes and neutral layers for daily wear.",
  },
  {
    title: "Resort Tailored",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=1200",
    copy: "Light textures, polished tones, and elevated details.",
  },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<"user" | "ai">("user");

  const normalizeCategory = (raw: string): string => {
    const value = raw.trim().toLowerCase();
    if (value === "all") return "all";
    if (value === "clothing") return "Clothing";
    if (value === "accessories") return "Accessories";
    if (value === "footwear") return "Footwear";
    return "all";
  };

  const hasActiveFilters =
    activeCategory !== "all" || sortBy !== "featured" || searchQuery.trim().length > 0;

  const { data: products, isLoading, error } = useProducts({
    category: activeCategory,
    sort: sortBy,
    search: searchQuery,
  });

  useEffect(() => {
    const handleSearch = (e: any) => {
      if (Object.prototype.hasOwnProperty.call(e.detail, "query")) {
        setSearchQuery(String(e.detail.query ?? ""));
      }
      if (Object.prototype.hasOwnProperty.call(e.detail, "category")) {
        setActiveCategory(normalizeCategory(String(e.detail.category ?? "all")));
      }
      setFilterSource(e.detail?.source === "ai" ? "ai" : "user");
    };

    const handleSort = (e: any) => {
      const detail = e.detail;
      const nextSort = typeof detail === "string" ? detail : detail?.sortBy;
      if (nextSort) {
        setSortBy(nextSort);
      }
      setFilterSource(detail?.source === "ai" ? "ai" : "user");
    };

    window.addEventListener("search-products", handleSearch);
    window.addEventListener("sort-products", handleSort);

    return () => {
      window.removeEventListener("search-products", handleSearch);
      window.removeEventListener("sort-products", handleSort);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("clerk-activity");
      const parsed = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem(
        "clerk-activity",
        JSON.stringify({
          ...parsed,
          activeCategory,
          preferredSort: sortBy,
        }),
      );
    } catch {
      // Ignore localStorage failures.
    }
  }, [activeCategory, sortBy]);

  useEffect(() => {
    if (isLoading || error || filterSource !== "ai") return;
    if (!products) return;
    if (products.length > 0) return;

    if (searchQuery.trim()) {
      setSearchQuery("");
      return;
    }
    if (activeCategory !== "all") {
      setActiveCategory("all");
      return;
    }
    if (sortBy !== "featured") {
      setSortBy("featured");
    }
  }, [products, isLoading, error, filterSource, searchQuery, activeCategory, sortBy]);

  const filteredProducts = products || [];

  const categories = [
    { id: "all", label: "All" },
    { id: "Clothing", label: "Clothing" },
    { id: "Accessories", label: "Accessories" },
    { id: "Footwear", label: "Footwear" },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#161a23] overflow-x-hidden">
      <Navigation />
      <CartDrawer />

      <section className="relative isolate min-h-[92vh] px-4 pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=2000"
            alt="Fashion editorial backdrop"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(8,11,20,0.88),rgba(8,11,20,0.62)_42%,rgba(176,106,52,0.35))]" />
        </div>

        <div className="absolute -left-16 top-28 h-72 w-72 rounded-full bg-[#d6a36f]/30 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-[#5f8ea3]/30 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/90 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Spring 2026 Collection
            </div>
            <h1 className="mt-8 text-5xl font-bold leading-[1.04] text-white sm:text-6xl lg:text-7xl">
              Luxury Essentials
              <br />
              Engineered for Modern Living
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Discover refined fashion and lifestyle pieces from premium houses, curated with
              intelligent recommendations and elevated visual storytelling.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-[#121722] transition-all hover:scale-[1.03]"
              >
                Shop The Drop
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("toggle-clerk"))}
                className="inline-flex items-center justify-center rounded-full border border-white/45 bg-white/10 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white backdrop-blur-md transition-all hover:bg-white/20"
              >
                Open AI Stylist
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {highlightItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl"
                >
                  <Icon className="h-5 w-5 text-white" />
                  <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/70">{item.text}</p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-[#d8dce5] bg-white/85 p-4 shadow-[0_24px_80px_-32px_rgba(13,17,28,0.55)] backdrop-blur-xl sm:p-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {lookbookCards.map((card, idx) => (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className="group relative overflow-hidden rounded-[1.6rem]"
              >
                <img
                  src={card.image}
                  alt={card.title}
                  className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090d17]/85 via-[#090d17]/20 to-transparent" />
                <div className="absolute bottom-0 p-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">Lookbook</p>
                  <h3 className="mt-2 text-2xl font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm text-white/75">{card.copy}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-[#d7dbe4] bg-white/85 p-6 shadow-[0_22px_70px_-40px_rgba(21,27,43,0.8)] backdrop-blur-xl sm:p-10">
          <div className="flex flex-col gap-8 border-b border-[#e4e7ef] pb-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b0763f]">Collections</p>
              <h2 className="mt-3 text-4xl font-bold text-[#101522]">Curated Product Gallery</h2>
              <p className="mt-3 text-sm text-[#556074] sm:text-base">
                Use search, categories, and sort controls to find exact pieces from the premium catalog.
              </p>

              <div className="relative mt-6">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a869d]" />
                <input
                  type="text"
                  placeholder="Search by name, style, or material"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFilterSource("user");
                  }}
                  className="w-full rounded-2xl border border-[#d6dce8] bg-white py-3 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-[#8f9bb0] focus:border-[#b0763f] focus:ring-4 focus:ring-[#b0763f]/15"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setFilterSource("user");
                  }}
                  className={`rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                    activeCategory === cat.id
                      ? "bg-[#131a2a] text-white shadow-lg"
                      : "border border-[#d6dce8] bg-white text-[#4f5b71] hover:border-[#b0763f]/60 hover:text-[#131a2a]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}

              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setFilterSource("user");
                }}
                className="rounded-full border border-[#d6dce8] bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#4f5b71] outline-none transition-colors hover:border-[#b0763f]/60"
              >
                <option value="featured">Featured</option>
                <option value="price_asc">Price: Low-High</option>
                <option value="price_desc">Price: High-Low</option>
                <option value="rating">Top Rated</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setActiveCategory("all");
                    setSortBy("featured");
                    setSearchQuery("");
                    setFilterSource("user");
                  }}
                  className="rounded-full border border-[#e2c9ad] bg-[#f8f0e7] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#8d5d2f] transition-colors hover:bg-[#f3e6d9]"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="mt-10">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="h-[390px] animate-pulse rounded-3xl border border-[#d8deea] bg-white p-4"
                  >
                    <div className="mb-4 h-[240px] rounded-2xl bg-[#edf1f7]" />
                    <div className="h-4 w-3/4 rounded bg-[#edf1f7]" />
                    <div className="mt-3 h-4 w-1/4 rounded bg-[#edf1f7]" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-dashed border-[#d8deea] bg-[#f6f8fc] py-16 text-center">
                <h3 className="text-xl font-semibold text-[#131a2a]">Unable to load products</h3>
                <p className="mt-2 text-[#60708a]">Refresh once to reconnect to the catalog.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-6 rounded-full bg-[#131a2a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f2a42]"
                >
                  Reload
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#d8deea] bg-[#f6f8fc] py-16 text-center">
                <h3 className="text-xl font-semibold text-[#131a2a]">No products matched</h3>
                <p className="mt-2 text-[#60708a]">Try a broader search or switch categories.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d8dce6] bg-[#101521] py-14 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.23em] text-[#c9a47a]">Shopkeeper</p>
            <h3 className="mt-3 text-2xl font-semibold">Premium Commerce House</h3>
            <p className="mt-3 text-sm text-white/65">
              Elevated catalog experiences with intelligent discovery and contemporary design.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/85">Explore</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li>New Arrivals</li>
              <li>Editorial Picks</li>
              <li>Trending This Week</li>
              <li>Gift Guide</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/85">Support</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li>Contact</li>
              <li>Shipping & Returns</li>
              <li>Warranty</li>
              <li>Privacy</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/85">Private Access</h4>
            <p className="mt-4 text-sm text-white/60">Get first access to drops and premium offers.</p>
            <div className="mt-4 flex gap-2">
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#c9a47a]"
              />
              <button className="rounded-full bg-[#c9a47a] px-4 py-2.5 text-sm font-semibold text-[#111726] hover:bg-[#d8b48f]">
                Join
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
