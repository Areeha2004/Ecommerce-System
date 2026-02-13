import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Product } from "@shared/schema";

export function useProducts(filters?: { category?: string; sort?: string; search?: string }) {
  const queryKey = [api.products.list.path, filters];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category && filters.category !== "all") params.append("category", filters.category);
      if (filters?.sort && filters.sort !== "featured") params.append("sort", filters.sort);
      if (filters?.search) params.append("search", filters.search);
      
      const queryString = params.toString();
      const url = queryString ? `${api.products.list.path}?${queryString}` : api.products.list.path;
        
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      
      const data = await res.json();
      return api.products.list.responses[200].parse(data);
    },
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: [api.products.get.path, id],
    queryFn: async () => {
      if (isNaN(id)) return null;
      const url = buildUrl(api.products.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      
      const data = await res.json();
      return api.products.get.responses[200].parse(data);
    },
    enabled: !!id,
  });
}
