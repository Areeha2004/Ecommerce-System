import { type User, type InsertUser, type Product } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Product methods
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.currentId = 1;
    this.initializeMockProducts();
  }

  private initializeMockProducts() {
    const MOCK_PRODUCTS: any[] = [
      {
        id: 1,
        name: "Classic White Linen Shirt",
        description: "Breathable 100% linen shirt, perfect for summer weddings and casual outings. Features a relaxed fit and mother-of-pearl buttons.",
        price: "89.99",
        rating: "4.8",
        category: "Clothing",
        colors: ["White", "Beige", "Light Blue"],
        stock: 50,
        image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 2,
        name: "Italian Silk Tie - Navy",
        description: "Handmade in Como, Italy. This 100% silk tie adds a touch of elegance to any suit.",
        price: "120.00",
        rating: "4.9",
        category: "Accessories",
        colors: ["Navy", "Burgundy", "Black"],
        stock: 25,
        image: "https://images.unsplash.com/photo-1589756823695-278bc923f962?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 3,
        name: "Tortoiseshell Sunglasses",
        description: "Vintage-inspired acetate frames with polarized lenses. UV400 protection.",
        price: "150.00",
        rating: "4.7",
        category: "Accessories",
        colors: ["Tortoise", "Black", "Clear"],
        stock: 30,
        image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 4,
        name: "Summer Chinos",
        description: "Lightweight cotton chinos with a tapered fit. Essential for the modern gentleman's wardrobe.",
        price: "95.00",
        rating: "4.6",
        category: "Clothing",
        colors: ["Khaki", "Navy", "Olive"],
        stock: 45,
        image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 5,
        name: "Leather Loafers",
        description: "Full-grain leather loafers with a comfortable cushioned insole. Hand-stitched details.",
        price: "180.00",
        rating: "4.8",
        category: "Footwear",
        colors: ["Brown", "Black", "Tan"],
        stock: 20,
        image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 6,
        name: "Floral Summer Dress",
        description: "Flowy maxi dress with a vibrant floral print. Perfect for garden parties and beach weddings.",
        price: "110.00",
        rating: "4.9",
        category: "Clothing",
        colors: ["Floral Red", "Floral Blue"],
        stock: 40,
        image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 7,
        name: "Straw Fedora Hat",
        description: "Classic straw fedora with a grosgrain ribbon band. Provides stylish sun protection.",
        price: "45.00",
        rating: "4.5",
        category: "Accessories",
        colors: ["Natural", "White"],
        stock: 60,
        image: "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 8,
        name: "Linen Blazer",
        description: "Unstructured linen blazer for a smart-casual look. Breathable and lightweight.",
        price: "250.00",
        rating: "4.7",
        category: "Clothing",
        colors: ["Beige", "Blue", "Sage"],
        stock: 15,
        image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 9,
        name: "Leather Weekend Bag",
        description: "Premium leather duffel bag. Spacious enough for a 3-day trip.",
        price: "299.00",
        rating: "4.9",
        category: "Accessories",
        colors: ["Cognac", "Dark Brown"],
        stock: 10,
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 10,
        name: "Espadrilles",
        description: "Classic canvas espadrilles with jute soles. The ultimate summer shoe.",
        price: "55.00",
        rating: "4.4",
        category: "Footwear",
        colors: ["Navy", "Striped", "Black"],
        stock: 70,
        image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=600"
      },
       {
        id: 11,
        name: "Minimalist Watch",
        description: "Clean dial design with a genuine leather strap. Water-resistant to 30m.",
        price: "135.00",
        rating: "4.6",
        category: "Accessories",
        colors: ["Silver/Black", "Gold/Brown"],
        stock: 40,
        image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 12,
        name: "Denim Jacket",
        description: "Vintage wash denim jacket. A versatile layer for cooler summer evenings.",
        price: "85.00",
        rating: "4.7",
        category: "Clothing",
        colors: ["Light Wash", "Dark Wash"],
        stock: 35,
        image: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 13,
        name: "Silk Scarf",
        description: "Printed silk scarf. Can be worn around the neck, hair, or bag handle.",
        price: "65.00",
        rating: "4.8",
        category: "Accessories",
        colors: ["Geometric", "Floral"],
        stock: 50,
        image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 14,
        name: "Canvas Tote Bag",
        description: "Durable cotton canvas tote with leather handles. Perfect for the market or beach.",
        price: "40.00",
        rating: "4.5",
        category: "Accessories",
        colors: ["Cream", "Navy"],
        stock: 100,
        image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 15,
        name: "Oxford Shirt",
        description: "Classic cotton oxford shirt. A wardrobe staple that gets better with age.",
        price: "75.00",
        rating: "4.6",
        category: "Clothing",
        colors: ["Blue", "White", "Pink"],
        stock: 60,
        image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 16,
        name: "Leather Belt",
        description: "Full-grain leather belt with a solid brass buckle.",
        price: "50.00",
        rating: "4.7",
        category: "Accessories",
        colors: ["Brown", "Black"],
        stock: 55,
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 17,
        name: "Aviator Sunglasses",
        description: "Classic aviator style with gold frames and green lenses.",
        price: "160.00",
        rating: "4.8",
        category: "Accessories",
        colors: ["Gold"],
        stock: 25,
        image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 18,
        name: "Cashmere Sweater",
        description: "Luxuriously soft cashmere crewneck sweater.",
        price: "195.00",
        rating: "4.9",
        category: "Clothing",
        colors: ["Grey", "Navy", "Camel"],
        stock: 20,
        image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 19,
        name: "Chelsea Boots",
        description: "Suede Chelsea boots with elastic side panels.",
        price: "145.00",
        rating: "4.7",
        category: "Footwear",
        colors: ["Sand", "Brown", "Black"],
        stock: 30,
        image: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: 20,
        name: "Wool Fedora",
        description: "Wide-brim wool fedora hat. Adds a sophisticated touch to any outfit.",
        price: "80.00",
        rating: "4.6",
        category: "Accessories",
        colors: ["Black", "Grey"],
        stock: 40,
        image: "https://images.unsplash.com/photo-1533827432537-70133748f5c8?auto=format&fit=crop&q=80&w=600"
      }
    ];

    MOCK_PRODUCTS.forEach(p => {
      this.products.set(p.id, p);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
}

export const storage = new MemStorage();
