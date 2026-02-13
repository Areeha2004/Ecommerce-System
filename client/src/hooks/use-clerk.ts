import { create } from 'zustand';
import { api } from '@shared/routes';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ClerkState {
  messages: Message[];
  isTyping: boolean;
  isOpen: boolean;
  addMessage: (role: Message['role'], content: string) => void;
  sendMessage: (content: string, context?: any) => Promise<void>;
  toggleClerk: () => void;
  clearHistory: () => void;
}

export const useClerk = create<ClerkState>((set, get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your personal shopping assistant. I can help you find products, check stock, or answer questions. How can I help today?",
      timestamp: Date.now(),
    }
  ],
  isTyping: false,
  isOpen: false, // Default closed
  
  addMessage: (role, content) => set((state) => ({
    messages: [...state.messages, {
      id: Math.random().toString(36).substring(7),
      role,
      content,
      timestamp: Date.now(),
    }]
  })),
  
  sendMessage: async (content, context = {}) => {
    const { addMessage } = get();
    
    // Add user message immediately
    addMessage('user', content);
    set({ isTyping: true });
    
    try {
      const res = await fetch(api.chat.message.path, {
        method: api.chat.message.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, context }),
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      
      const data = await res.json();
      const response = api.chat.message.responses[200].parse(data);
      
      addMessage('assistant', response.message);
      
      // Handle actions if any (this would be where we trigger navigation filters etc)
      if (response.action) {
        console.log('Clerk triggered action:', response.action);
        // Dispatch custom event for app-wide listening
        window.dispatchEvent(new CustomEvent('clerk-action', { detail: response.action }));
      }
      
    } catch (error) {
      console.error('Clerk error:', error);
      addMessage('system', "I'm having trouble connecting right now. Please try again.");
    } finally {
      set({ isTyping: false });
    }
  },
  
  toggleClerk: () => set((state) => ({ isOpen: !state.isOpen })),
  clearHistory: () => set({ messages: [] }),
}));
