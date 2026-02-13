import { z } from 'zod';
import { insertProductSchema, products, insertCartItemSchema } from './schema';

// Shared error schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      input: z.object({
        category: z.string().optional(),
        sort: z.enum(['price_asc', 'price_desc']).optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  chat: {
    message: {
      method: 'POST' as const,
      path: '/api/chat' as const,
      input: z.object({
        message: z.string(),
        context: z.any().optional(), // Current cart, page, etc.
      }),
      responses: {
        200: z.object({
          message: z.string(),
          action: z.any().optional(), // 'update_filter', 'add_to_cart', 'apply_discount'
          data: z.any().optional(),
        }),
      },
    },
  },
  negotiate: {
    offer: {
      method: 'POST' as const,
      path: '/api/negotiate' as const,
      input: z.object({
        message: z.string(),
        cartTotal: z.number(),
      }),
      responses: {
        200: z.object({
          message: z.string(),
          discountCode: z.string().nullable(),
          discountAmount: z.number().optional(),
        }),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
