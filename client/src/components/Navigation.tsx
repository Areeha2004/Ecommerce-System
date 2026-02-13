import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag, Search, Menu, X, User } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const { items, toggleCart } = useCart();
  
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { href: "/", label: "Catalog" },
    { href: "/?category=Clothing", label: "Clothing" },
    { href: "/?category=Accessories", label: "Accessories" },
    { href: "/?category=Footwear", label: "Footwear" },
  ];

  const navItemClasses = isScrolled 
    ? "text-muted-foreground hover:text-primary" 
    : "text-white/70 hover:text-white";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? "py-4" : "py-8"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`transition-all duration-500 rounded-full px-6 py-2 flex items-center justify-between ${
          isScrolled 
            ? "glass shadow-2xl shadow-black/10 border-border/50" 
            : "bg-transparent border-transparent"
        }`}>
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <span className={`font-display font-bold text-3xl tracking-tighter transition-colors ${
                isScrolled ? "text-foreground" : "text-white"
              }`}>
                Shopkeeper
              </span>
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-10">
            {links.map((link) => (
              <Link 
                key={link.label} 
                href={link.href}
                className={`text-xs font-bold tracking-widest uppercase transition-colors ${navItemClasses}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className={`p-2 transition-colors rounded-full ${
              isScrolled ? "text-muted-foreground hover:bg-muted" : "text-white/70 hover:bg-white/10"
            }`}>
              <Search className="w-5 h-5" />
            </button>
            
            <button 
              onClick={toggleCart}
              className={`relative p-2 transition-colors rounded-full group ${
                isScrolled ? "text-muted-foreground hover:bg-muted" : "text-white/70 hover:bg-white/10"
              }`}
            >
              <ShoppingBag className="w-5 h-5 transition-transform group-hover:scale-110" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1 right-1 w-4 h-4 bg-primary text-[10px] font-bold text-white rounded-full flex items-center justify-center shadow-lg"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <div className={`h-4 w-px mx-2 ${isScrolled ? "bg-border/50" : "bg-white/20"}`} />

            <button className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-xs tracking-wider uppercase transition-all ${
              isScrolled 
                ? "bg-foreground text-background hover:bg-foreground/90" 
                : "bg-white text-black hover:bg-white/90"
            }`}>
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>

            {/* Mobile Menu Button */}
            <button 
              className={`md:hidden p-2 transition-colors rounded-full ${
                isScrolled ? "text-foreground" : "text-white"
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-4 right-4 mt-2 glass rounded-3xl overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {links.map((link) => (
                <Link 
                  key={link.label} 
                  href={link.href}
                  className="block text-lg font-bold text-foreground py-2 border-b border-border/20 last:border-0"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
