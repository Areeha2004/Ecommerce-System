import { pgTable, serial, text, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

// --- Products ---
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  rating: decimal("rating", { precision: 3, scale: 1 }).notNull(),
  category: text("category").notNull(),
  colors: jsonb("colors").$type<string[]>().notNull(),
  stock: integer("stock").notNull(),
  image: text("image").notNull(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// --- Cart ---
// Simple session-based cart stored in memory/client state for this demo, 
// but we define schema for potential persistence or order creation
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(), // For linking to user/session
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  color: text("color"),
});
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;


// --- Chat/Negotiation ---
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  // For context:
  sessionId: text("session_id").notNull(),
});
export type ChatMessage = typeof chatMessages.$inferSelect;

// --- Orders (Simple) ---
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  discountCode: text("discount_code"),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Order = typeof orders.$inferSelect;
