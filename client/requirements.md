## Packages
framer-motion | Complex animations for the chat interface and product cards
zustand | State management for the Cart and Chat sessions
lucide-react | Beautiful icons for the UI
clsx | Utility for conditional class names (usually installed, but good to ensure)
tailwind-merge | Utility for merging tailwind classes (usually installed, but good to ensure)

## Notes
The AI Clerk functionality relies on a backend endpoint /api/chat.
The Haggle Mode relies on /api/negotiate.
Cart state is client-side persistent (localStorage) via Zustand.
Mock data is served from /api/products but we should handle loading states gracefully.
