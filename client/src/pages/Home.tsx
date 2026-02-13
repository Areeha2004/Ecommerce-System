import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { AIChat } from "@/components/AIChat";
import { CartDrawer } from "@/components/CartDrawer";
import { useProducts } from "@/hooks/use-products";
import { Loader2, Filter, SlidersHorizontal } from "lucide-react";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  
  // Convert "all" to undefined for the hook
  const filters = {
    category: activeCategory === "all" ? undefined : activeCategory,
    sort: sortBy === "featured" ? undefined : sortBy,
  };

  const { data: products, isLoading, error } = useProducts(filters);

  // Categories derived from mock data logic or hardcoded for UI
  const categories = [
    { id: "all", label: "All Products" },
    { id: "clothing", label: "Clothing" },
    { id: "accessories", label: "Accessories" },
    { id: "electronics", label: "Electronics" },
    { id: "home", label: "Home" },
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
          <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
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
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-foreground text-background rounded-xl font-semibold hover:bg-foreground/90 transition-colors shadow-lg"
            >
              Start Browsing
            </button>
            <button className="px-8 py-4 bg-white border border-border rounded-xl font-semibold hover:bg-muted transition-colors text-foreground shadow-sm">
              Talk to Clerk
            </button>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? "bg-foreground text-background shadow-md"
                    : "bg-white text-muted-foreground hover:bg-muted border border-border"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="relative group">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2 bg-white border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <option value="featured">Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-[400px] animate-pulse border border-border/50 p-4">
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 gap-y-12">
            {products?.map((product) => (
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
