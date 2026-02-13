import { Link } from "wouter";
import { type Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag, Star } from "lucide-react";
import { motion } from "framer-motion";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
    >
      {/* Image Container */}
      <div className="aspect-[4/5] overflow-hidden bg-muted relative">
        <Link href={`/product/${product.id}`}>
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        </Link>
        
        {/* Quick Add Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            addToCart(product);
          }}
          className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-foreground shadow-lg translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary hover:text-white"
        >
          <ShoppingBag className="w-5 h-5" />
        </button>

        {/* Badge example */}
        {Number(product.rating) >= 4.5 && (
          <div className="absolute top-4 left-4 px-2 py-1 bg-white/90 backdrop-blur text-[10px] font-bold tracking-wider uppercase rounded-sm shadow-sm">
            Top Rated
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <Link href={`/product/${product.id}`} className="block">
            <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          <span className="font-sans font-medium text-foreground">
            ${Number(product.price).toFixed(2)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center text-yellow-400">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="ml-1 text-xs font-medium text-muted-foreground">{product.rating}</span>
          </div>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground capitalize">{product.category}</span>
        </div>
      </div>
    </motion.div>
  );
}
