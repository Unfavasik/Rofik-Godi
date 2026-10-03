import { useCallback, useEffect, useState } from 'react';
import type { CartItem, Product, UserProfile } from '../types';
import { canReconcileCartFromCatalog, refreshCartFromCatalog } from '../lib/cart';

interface OwnedCart {
  ownerId: string;
  items: CartItem[];
}

export function useCart(user: Pick<UserProfile, 'id' | 'isGuest'>, catalogProducts: Product[], catalogLoaded: boolean, catalogError: Error | null) {
  const [ownedCart, setOwnedCart] = useState<OwnedCart>({ ownerId: 'guest-user', items: [] });
  const cart = ownedCart.ownerId === user.id ? ownedCart.items : [];

  useEffect(() => {
    if (ownedCart.ownerId === user.id) return;
    let savedCart: CartItem[] = [];
    if (!user.isGuest) {
      try {
        const stored = localStorage.getItem(`work-app:${user.id}:cart`);
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        if (Array.isArray(parsed)) savedCart = parsed as CartItem[];
      } catch {
        // Malformed or unavailable storage starts this account with an empty cart.
      }
    }
    setOwnedCart({ ownerId: user.id, items: savedCart });
  }, [ownedCart.ownerId, user.id, user.isGuest]);

  useEffect(() => {
    if (ownedCart.ownerId !== user.id || user.isGuest || !canReconcileCartFromCatalog(catalogLoaded, catalogError, catalogProducts)) return;
    setOwnedCart((state) => state.ownerId === user.id
      ? { ...state, items: refreshCartFromCatalog(state.items, catalogProducts) }
      : state);
  }, [catalogError, catalogLoaded, catalogProducts, ownedCart.ownerId, user.id, user.isGuest]);

  useEffect(() => {
    if (ownedCart.ownerId !== user.id || user.isGuest) return;
    try {
      localStorage.setItem(`work-app:${user.id}:cart`, JSON.stringify(ownedCart.items));
    } catch {
      // In-memory cart state remains available when storage is blocked or full.
    }
  }, [ownedCart, user.id, user.isGuest]);

  const setCart = useCallback((next: CartItem[] | ((current: CartItem[]) => CartItem[])) => {
    setOwnedCart((state) => {
      const current = state.ownerId === user.id ? state.items : [];
      return { ownerId: user.id, items: typeof next === 'function' ? next(current) : next };
    });
  }, [user.id]);

  const clearCart = useCallback(() => setCart([]), [setCart]);

  return { cart, setCart, clearCart };
}
