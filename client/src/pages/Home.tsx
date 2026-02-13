import { useState, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { AIChat } from "@/components/AIChat";
import { CartDrawer } from "@/components/CartDrawer";
import { useProducts } from "@/hooks/use-products";
import { Loader2, Filter, Search, X } from "lucide-react";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: products, isLoading, error } = useProducts({
    category: activeCategory,
    sort: sortBy,
    search: searchQuery
  });

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
      <AIChat />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-48 md:pb-32 px-4 overflow-hidden">
        {/* Background Blob */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute top-20 left-10 w-[300px] h-[300px] bg-accent/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight text-balance">
            Curated Essentials for <br />
            <span className="text-primary relative inline-block">
              Modern Living
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Discover our collection of premium goods. Not sure what you need? 
            Chat with our AI Clerk for personalized recommendations.
          </p>
          
          {/* Aesthetic Search Bar */}
          <div className="max-w-xl mx-auto relative mb-12 group">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-colors" />
            <div className="relative flex items-center bg-white border border-border rounded-2xl shadow-sm hover:shadow-md focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary transition-all overflow-hidden p-1">
              <div className="pl-4 flex items-center text-muted-foreground">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search premium goods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-foreground text-background rounded-xl font-semibold hover:bg-foreground/90 transition-all hover:scale-105 shadow-lg active:scale-95"
            >
              Start Browsing
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-clerk'))}
              className="px-8 py-4 bg-white border border-border rounded-xl font-semibold hover:bg-muted transition-all text-foreground shadow-sm hover:scale-105 active:scale-95"
            >
              Talk to Clerk
            </button>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap hover:scale-105 active:scale-95 ${
                  activeCategory === cat.id
                    ? "bg-foreground text-background shadow-lg scale-105"
                    : "bg-white text-muted-foreground hover:bg-muted border border-border shadow-sm"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="relative group min-w-[180px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none pl-10 pr-10 py-2.5 bg-white border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 cursor-pointer hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
              >
                <option value="featured">✨ Featured</option>
                <option value="price_asc">💰 Price: Low to High</option>
                <option value="price_desc">🏷️ Price: High to Low</option>
              </select>
              <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
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
