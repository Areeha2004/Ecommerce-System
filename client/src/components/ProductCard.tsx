import { Link } from "wouter";
import { type Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag, Star } from "lucide-react";
import { motion } from "framer-motion";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col h-full premium-card rounded-2xl p-2"
    >
      {/* Image Container */}
      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-muted relative mb-4">
        <Link href={`/product/${product.id}`}>
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-in-out"
          />
        </Link>
        
        {/* Quick Add Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            addToCart(product);
          }}
          className="absolute bottom-4 right-4 w-12 h-12 glass rounded-full flex items-center justify-center text-foreground translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 hover:bg-primary hover:text-white"
        >
          <ShoppingBag className="w-5 h-5" />
        </button>

        {/* Badge */}
        {Number(product.rating) >= 4.8 && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold tracking-widest uppercase rounded-full border border-white/10 shadow-xl">
            Exclusive
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pb-4 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-4 mb-2">
          <Link href={`/product/${product.id}`} className="block flex-1">
            <h3 className="font-display font-bold text-xl leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>
          <span className="font-sans font-semibold text-lg text-primary">
            ${Number(product.price).toFixed(0)}
          </span>
        </div>
        
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-primary text-primary" />
            <span className="text-xs font-bold text-foreground">{product.rating}</span>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">{product.category}</span>
        </div>
      </div>
    </motion.div>
  );
}
