# Replit.md

## Overview

**Shopkeeper** is an AI-powered e-commerce storefront with an integrated conversational shopping assistant ("The Clerk"). Users can browse a curated catalog of premium products, filter/sort/search, view product details, manage a shopping cart, and interact with an AI chatbot that can search products, add items to cart, and apply discounts. The app features a polished, premium UI with animations and a glass-morphism design aesthetic.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter (lightweight client-side router) with three routes: Home (`/`), Product Details (`/product/:id`), Checkout (`/checkout`)
- **State Management**: Zustand with localStorage persistence for the shopping cart (`use-cart.ts`); React Query (`@tanstack/react-query`) for server state (products, chat)
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives, styled with Tailwind CSS and CSS variables for theming
- **Animations**: Framer Motion for page transitions, product card animations, and chat interface
- **Typography**: DM Sans (body) + Playfair Display (headings) via Google Fonts
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework**: Express.js running on Node with TypeScript (compiled via tsx in dev, esbuild for production)
- **API Pattern**: RESTful JSON API under `/api/` prefix. Routes are defined in `shared/routes.ts` with Zod schemas for type-safe contracts between client and server
- **Key endpoints**:
  - `GET /api/products` — list products with optional filtering (category, sort, search)
  - `GET /api/products/:id` — single product detail
  - `POST /api/chat` — AI chat endpoint for the shopping assistant
  - `/api/conversations/*` — conversation CRUD for chat history (Replit integration)
- **Static serving**: In production, serves the built Vite output from `dist/public/`; in development, uses Vite middleware with HMR

### Data Storage
- **Database**: PostgreSQL via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with PostgreSQL dialect. Schema defined in `shared/schema.ts` and `shared/models/chat.ts`
- **Schema push**: Use `npm run db:push` (drizzle-kit push) to sync schema to database — no migration files needed for dev
- **In-memory fallback**: Product data is currently served from `MemStorage` class in `server/storage.ts` with hardcoded mock data. The database tables exist in the schema but products are loaded from memory
- **Key tables**: `products`, `cart_items`, `chat_messages`, `conversations`, `messages`, `users`

### AI Integrations (Replit Integrations)
Located in `server/replit_integrations/`:
- **Chat** (`chat/`): OpenAI-powered conversational AI with conversation persistence in PostgreSQL. Registers CRUD routes for conversations and messages
- **Image** (`image/`): OpenAI image generation (`gpt-image-1`) — available but not actively used in the storefront
- **Audio** (`audio/`): Voice chat capabilities with speech-to-text and text-to-speech via OpenAI — available but not actively used
- **Batch** (`batch/`): Generic batch processing utilities with rate limiting and retries for bulk LLM operations

### Build System
- **Development**: `npm run dev` — runs tsx with Vite dev server middleware
- **Production build**: `npm run build` — Vite builds frontend to `dist/public/`, esbuild bundles server to `dist/index.cjs`
- **Type checking**: `npm run check` — runs TypeScript compiler in noEmit mode

### Client-Server Communication
- The `shared/routes.ts` file defines the API contract with Zod schemas, ensuring type safety across the stack
- The client uses a custom `apiRequest` helper and React Query for data fetching
- The AI chat uses custom events (`window.dispatchEvent`) to trigger UI actions (search, sort, add to cart) from chat responses

## External Dependencies

- **PostgreSQL**: Required database. Connection via `DATABASE_URL` environment variable. Used for chat conversations/messages and schema-defined tables
- **OpenAI API**: Required for AI chat functionality. Connection via `OPENAI_API_KEY` environment variable. Powers the shopping assistant chatbot, and optionally image generation and voice features
- **Unsplash**: Product images are hotlinked from Unsplash CDN (no API key needed, just direct image URLs in mock data)
- **Google Fonts**: DM Sans, Playfair Display, Fira Code, Geist Mono loaded via Google Fonts CDN
- **Key npm packages**: express, drizzle-orm, openai, zustand, framer-motion, wouter, @tanstack/react-query, shadcn/ui (Radix primitives), zod, tailwindcss