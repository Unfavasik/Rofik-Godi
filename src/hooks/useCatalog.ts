import { useEffect, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { isSupabaseConfigured } from '../lib/supabase';
import { loadPublicProducts } from '../lib/supabaseProducts';
import type { Product } from '../types';

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>(isSupabaseConfigured ? [] : PRODUCTS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPublicProducts().then((loadedProducts) => {
      if (active) {
        setProducts(loadedProducts);
        setIsLoaded(true);
      }
    }).catch(() => {
      // Keep the bundled catalog available if the public API is temporarily unavailable.
      if (active) setIsLoaded(true);
    });
    return () => { active = false; };
  }, []);

  return { products, isLoaded };
}
