import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Product } from '@shared/schema';

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  discountCode: string | null;
  discountAmount: number;
  addToCart: (product: Product, quantity?: number, color?: string) => void;
  removeFromCart: (productId: number, color?: string) => void;
  updateQuantity: (productId: number, quantity: number, color?: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setDiscount: (code: string, amount: number) => void;
  cartTotal: () => number;
  finalTotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      discountCode: null,
      discountAmount: 0,
      
      addToCart: (product, quantity = 1, color) => set((state) => {
        const resolvedColor = color?.trim() || product.colors?.[0] || undefined;
        const existingItem = state.items.find(item => item.id === product.id && item.selectedColor === resolvedColor);
        
        if (existingItem) {
          return {
            items: state.items.map(item => 
              (item.id === product.id && item.selectedColor === resolvedColor)
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
            isOpen: true, // Open cart on add
          };
        }
        
        return {
          items: [...state.items, { ...product, quantity, selectedColor: resolvedColor }],
          isOpen: true,
        };
      }),
      
      removeFromCart: (productId, color) => set((state) => ({
        items: state.items.filter(item => {
          if (item.id !== productId) return true;
          if (typeof color === "string") return item.selectedColor !== color;
          return false;
        })
      })),
      
      updateQuantity: (productId, quantity, color) => set((state) => ({
        items: state.items.map(item => {
          const isTargetProduct = item.id === productId;
          const isTargetColor = typeof color === "string" ? item.selectedColor === color : true;
          if (isTargetProduct && isTargetColor) {
            return { ...item, quantity: Math.max(0, quantity) };
          }
          return item;
        }).filter(item => item.quantity > 0)
      })),
      
      clearCart: () => set({ items: [], discountCode: null, discountAmount: 0 }),
      
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      setDiscount: (code, amount) => {
        set({ discountCode: code, discountAmount: amount });
        // Trigger a toast or some feedback if possible, but we don't have access to useToast here
      },
      
      cartTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);
      },
      
      finalTotal: () => {
        const total = get().cartTotal();
        const discount = get().discountAmount;
        // Discount amount is percentage (e.g., 20 for 20%)
        return total * (1 - (discount / 100));
      }
    }),
    {
      name: 'shopkeeper-cart',
    }
  )
);
