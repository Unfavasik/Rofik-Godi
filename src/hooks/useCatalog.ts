import { useEffect, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { isSupabaseConfigured } from '../lib/supabase';
import { loadPublicProducts } from '../lib/supabaseProducts';
import type { Product } from '../types';

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>(isSupabaseConfigured ? [] : PRODUCTS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    void loadPublicProducts().then((loadedProducts) => {
      if (active) {
        setProducts(loadedProducts);
        setError(null);
        setIsLoaded(true);
      }
    }).catch((loadError: unknown) => {
      if (active) {
        setError(loadError instanceof Error ? loadError : new Error('Unable to load the product catalog.'));
        setIsLoaded(true);
      }
    });
    return () => { active = false; };
  }, []);

  return { products, isLoaded, error };
}
