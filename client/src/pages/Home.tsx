import { useState, useMemo, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { useProducts } from "@/hooks/use-products";
import { Loader2, Filter, Search, X } from "lucide-react";
import { motion } from "framer-motion";

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
    search: searchQuery
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
    
    window.addEventListener('search-products', handleSearch);
    window.addEventListener('sort-products', handleSort);
    return () => {
      window.removeEventListener('search-products', handleSearch);
      window.removeEventListener('sort-products', handleSort);
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

  // Categories derived from mock data logic or hardcoded for UI
  const categories = [
    { id: "all", label: "All" },
    { id: "Clothing", label: "Clothing" },
    { id: "Accessories", label: "Accessories" },
    { id: "Footwear", label: "Footwear" },
  ];

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navigation />
      <CartDrawer />

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center px-4 pt-20 overflow-hidden bg-[#0a0a0b]">
        {/* Dark Wash Hero Image Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover opacity-60"
            alt="Hero Background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#0a0a0b]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-6xl md:text-8xl font-bold text-white mb-6 leading-[1.1]">
              Elevate Your <br />
              <span className="text-white/90 italic font-medium">Daily Rituals</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
              Experience a meticulously curated collection of premium essentials. 
              Refined by design, guided by intelligence.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <button 
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-10 py-4 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
            >
              Explore Collection
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-clerk'))}
              className="px-10 py-4 glass text-white rounded-full font-medium hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
            >
              Consult the Clerk
            </button>
          </motion.div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col space-y-12">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-border/50 pb-12">
            <div className="space-y-4 max-w-md">
              <h2 className="text-4xl font-bold">The Catalog</h2>
              <p className="text-muted-foreground">Filter by category or search our refined inventory.</p>
              
              <div className="relative group">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFilterSource("user");
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-muted/50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:font-light"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setFilterSource("user");
                  }}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              <div className="h-6 w-px bg-border/50 mx-2" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setFilterSource("user");
                }}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer hover:text-primary transition-colors pr-2"
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
                  className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-muted/70 hover:bg-muted text-muted-foreground"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-[400px] animate-pulse border border-border/50 p-4 shadow-sm">
                <div className="bg-muted h-[250px] rounded-xl mb-4" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border">
            <h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">We couldn't load the products.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border">
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 gap-y-12">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="font-display font-bold text-2xl mb-4">Shopkeeper</div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Premium essentials for the modern lifestyle. 
              Quality curated by AI, delivered by humans.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Shop</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>All Products</li>
              <li>New Arrivals</li>
              <li>Featured</li>
              <li>Discounts</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>FAQ</li>
              <li>Shipping & Returns</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Newsletter</h4>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="px-4 py-2 bg-primary rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
