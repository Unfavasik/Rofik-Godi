import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { PRODUCTS } from '../data/products';
import { loadPublicProducts } from '../lib/supabaseProducts';
import { CATALOG_CHANGED_EVENT, readPublicCatalogCache, writePublicCatalogCache } from '../lib/localCache';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
const REFRESH_THROTTLE_MS = 20_000;
const isRefreshRoute = (pathname: string) => ['/shop', '/home', '/search'].includes(pathname) || /^\/shop\/products\/[^/]+$/.test(pathname);
export function useCatalog(pathname = '/') {
  const [products, setProducts] = useState<Product[]>(() => readPublicCatalogCache() ?? PRODUCTS);
  const [isLoaded, setIsLoaded] = useState(true);
  const [isFresh, setIsFresh] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);
  const lastThrottledRefreshRef = useRef(0);
  const productsRef = useRef(products);
  productsRef.current = products;
  const load = useCallback((throttled = false) => {
    const now = Date.now();
    if (throttled && now - lastThrottledRefreshRef.current < REFRESH_THROTTLE_MS) return;
    if (throttled) lastThrottledRefreshRef.current = now;
    const requestId = ++requestIdRef.current;
    setIsLoading(false);
    void loadPublicProducts().then((loadedProducts) => {
      if (requestId !== requestIdRef.current) return;
      setProducts(loadedProducts); productsRef.current = loadedProducts; writePublicCatalogCache(loadedProducts); setError(null);
    }).catch((loadError: unknown) => {
      if (requestId !== requestIdRef.current) return;
      if (!readPublicCatalogCache() && productsRef.current.length === 0) setError(loadError instanceof Error ? loadError : new Error('Unable to load the product catalog.'));
    }).finally(() => {
      if (requestId === requestIdRef.current) { setIsLoaded(true); setIsFresh(true); setIsLoading(false); }
    });
  }, []);
  const retry = useCallback(() => { setError(null); load(false); }, [load]);
  useEffect(() => {
    load(false);
    const refresh = () => load(true);
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    const onCatalogChanged = () => load(false);
    window.addEventListener(CATALOG_CHANGED_EVENT, onCatalogChanged);
    window.addEventListener('focus', refresh); window.addEventListener('pageshow', refresh); document.addEventListener('visibilitychange', onVisibility);
    let removeResume: (() => void) | null = null;
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); }).then((listener) => { removeResume = () => { void listener.remove(); }; }).catch(() => {});
    const channel = supabase?.channel('public-products-catalog').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => load(false)).subscribe();
    return () => { window.removeEventListener(CATALOG_CHANGED_EVENT, onCatalogChanged); window.removeEventListener('focus', refresh); window.removeEventListener('pageshow', refresh); document.removeEventListener('visibilitychange', onVisibility); removeResume?.(); if (channel) void supabase?.removeChannel(channel); };
  }, [load]);
  useEffect(() => { if (isRefreshRoute(pathname)) load(true); }, [pathname, load]);
  return { products, isLoaded, isFresh, isLoading, error, retry };
}
