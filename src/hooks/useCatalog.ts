import { useCallback, useEffect, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { isSupabaseConfigured } from '../lib/supabase';
import { loadPublicProducts } from '../lib/supabaseProducts';
import type { Product } from '../types';

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>(isSupabaseConfigured ? [] : PRODUCTS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setReloadVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let active = true;

    void loadPublicProducts()
      .then((loadedProducts) => {
        if (!active) return;
        setProducts(loadedProducts);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError : new Error('Unable to load the product catalog.'));
      })
      .finally(() => {
        if (!active) return;
        setIsLoaded(true);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadVersion]);

  return { products, isLoaded, isLoading, error, retry };
}
