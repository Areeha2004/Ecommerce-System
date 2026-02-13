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
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
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
        const existingItem = state.items.find(item => item.id === product.id && item.selectedColor === color);
        
        if (existingItem) {
          return {
            items: state.items.map(item => 
              (item.id === product.id && item.selectedColor === color)
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
            isOpen: true, // Open cart on add
          };
        }
        
        return {
          items: [...state.items, { ...product, quantity, selectedColor: color }],
          isOpen: true,
        };
      }),
      
      removeFromCart: (productId) => set((state) => ({
        items: state.items.filter(item => item.id !== productId)
      })),
      
      updateQuantity: (productId, quantity) => set((state) => ({
        items: state.items.map(item => 
          item.id === productId 
            ? { ...item, quantity: Math.max(0, quantity) }
            : item
        ).filter(item => item.quantity > 0)
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
