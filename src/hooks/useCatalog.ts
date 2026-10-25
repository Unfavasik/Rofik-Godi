import { useCallback, useEffect, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { isSupabaseConfigured } from '../lib/supabase';
import { loadPublicProducts } from '../lib/supabaseProducts';
import { readPublicCatalogCache, writePublicCatalogCache } from '../lib/localCache';
import type { Product } from '../types';

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>(() => readPublicCatalogCache() ?? (isSupabaseConfigured ? [] : PRODUCTS));
  const [isLoaded, setIsLoaded] = useState(() => readPublicCatalogCache() !== null || !isSupabaseConfigured);
  const [isLoading, setIsLoading] = useState(() => readPublicCatalogCache() === null && isSupabaseConfigured);
  const [error, setError] = useState<Error | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(products.length === 0 && !isLoaded);
    setReloadVersion((version) => version + 1);
  }, [isLoaded, products.length]);

  useEffect(() => {
    let active = true;

    void loadPublicProducts()
      .then((loadedProducts) => {
        if (!active) return;
        setProducts(loadedProducts);
        writePublicCatalogCache(loadedProducts);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        const cachedProducts = readPublicCatalogCache();
        if (cachedProducts) {
          setProducts(cachedProducts);
          setError(null);
        } else {
          setError(loadError instanceof Error ? loadError : new Error('Unable to load the product catalog.'));
        }
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
