import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { items, toggleCart } = useCart();
  
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const links = [
    { href: "/", label: "Shop" },
    { href: "/?category=clothing", label: "Clothing" },
    { href: "/?category=accessories", label: "Accessories" },
    { href: "/?category=electronics", label: "Electronics" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
                S
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">
                Shopkeeper
              </span>
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8">
            {links.map((link) => (
              <Link 
                key={link.label} 
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === link.href ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
              <Search className="w-5 h-5" />
            </button>
            
            <button 
              onClick={toggleCart}
              className="relative p-2 text-muted-foreground hover:text-primary transition-colors group"
            >
              <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-[10px] font-bold text-white rounded-full flex items-center justify-center shadow-sm animate-in zoom-in">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-foreground"
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border bg-background"
          >
            <div className="px-4 py-6 space-y-4">
              {links.map((link) => (
                <Link 
                  key={link.label} 
                  href={link.href}
                  className="block text-lg font-medium text-foreground py-2"
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
