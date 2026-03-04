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
  const isHome = location === "/";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { href: "/", label: "Catalog" },
    { href: "/?category=Clothing", label: "Clothing" },
    { href: "/?category=Accessories", label: "Accessories" },
    { href: "/?category=Footwear", label: "Footwear" },
  ];

  const showLightText = isHome && !isScrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "py-3" : "py-6"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between rounded-full border px-4 py-2.5 shadow-[0_10px_40px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-500 sm:px-6 ${
            showLightText
              ? "border-white/15 bg-white/8"
              : "border-[#d9dfe9] bg-white/85"
          }`}
        >
          <Link href="/" className="flex items-center gap-2">
            <span
              className={`font-display text-2xl font-bold tracking-tight sm:text-3xl ${
                showLightText ? "text-white" : "text-[#121826]"
              }`}
            >
              Shopkeeper
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) => {
              const isCatalogLink = link.href === "/" && location === "/";
              const isActive = isCatalogLink || location === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    isActive
                      ? showLightText
                        ? "text-white"
                        : "text-[#131a2a]"
                      : showLightText
                        ? "text-white/70 hover:text-white"
                        : "text-[#5c6780] hover:text-[#131a2a]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              className={`rounded-full p-2.5 transition-colors ${
                showLightText
                  ? "text-white/80 hover:bg-white/15"
                  : "text-[#526078] hover:bg-[#eef2f8]"
              }`}
              aria-label="Search"
            >
              <Search className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={toggleCart}
              className={`group relative rounded-full p-2.5 transition-colors ${
                showLightText
                  ? "text-white/80 hover:bg-white/15"
                  : "text-[#526078] hover:bg-[#eef2f8]"
              }`}
              aria-label="Open cart"
            >
              <ShoppingBag className="h-4.5 w-4.5 transition-transform group-hover:scale-105" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#be8451] text-[10px] font-bold text-white"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              className={`hidden items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all sm:inline-flex ${
                showLightText
                  ? "bg-white text-[#121826] hover:bg-[#f2f4f8]"
                  : "bg-[#121826] text-white hover:bg-[#1f2a42]"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Sign In
            </button>

            <button
              className={`rounded-full p-2.5 transition-colors md:hidden ${
                showLightText
                  ? "text-white hover:bg-white/15"
                  : "text-[#131a2a] hover:bg-[#eef2f8]"
              }`}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute left-4 right-4 top-full mt-2 rounded-3xl border border-[#d9dfe9] bg-white/95 p-5 shadow-xl backdrop-blur-xl md:hidden"
          >
            <div className="space-y-2">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#2d364a] transition-colors hover:bg-[#f2f5fb]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <button className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#121826] px-4 py-3 text-sm font-semibold text-white">
                <User className="h-4 w-4" />
                Sign In
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
