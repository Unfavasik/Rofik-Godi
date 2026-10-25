import type { Product } from '../types';

const PUBLIC_CATALOG_KEY = 'rofik-godi:public-catalog:v1';
const NOTIFICATION_CACHE_VERSION = 1;
const NOTIFICATION_LIMIT = 50;

export type CachedCustomerNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  action_url: string | null;
  image_url?: string | null;
  read_at: string | null;
  created_at: string;
  expires_at?: string | null;
};

const notificationListKey = (userId: string) => `rofik-godi:user:${userId}:notifications:v${NOTIFICATION_CACHE_VERSION}`;
const notificationCountKey = (userId: string) => `rofik-godi:user:${userId}:notification-count:v${NOTIFICATION_CACHE_VERSION}`;

export function readPublicCatalogCache(): Product[] | null {
  try {
    const raw = localStorage.getItem(PUBLIC_CATALOG_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || !('products' in parsed) || !Array.isArray(parsed.products)) return null;
    const products = parsed.products.filter((item): item is Product =>
      item !== null && typeof item === 'object' &&
      'id' in item && typeof item.id === 'string' &&
      'title' in item && typeof item.title === 'string' &&
      'slug' in item && typeof item.slug === 'string',
    );
    return products;
  } catch {
    return null;
  }
}

export function writePublicCatalogCache(products: Product[]) {
  try {
    localStorage.setItem(PUBLIC_CATALOG_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), products }));
  } catch {
    // The live catalog remains available when browser storage is full or disabled.
  }
}

export function readCustomerNotificationCache(userId: string): CachedCustomerNotification[] {
  try {
    const raw = localStorage.getItem(notificationListKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((item): item is CachedCustomerNotification => {
      if (item === null || typeof item !== 'object') return false;
      const row = item as Record<string, unknown>;
      if (typeof row.id !== 'string' || typeof row.kind !== 'string' || typeof row.title !== 'string' ||
          typeof row.body !== 'string' || typeof row.created_at !== 'string') return false;
      if (typeof row.expires_at === 'string' && Date.parse(row.expires_at) <= now) return false;
      return true;
    }).slice(0, NOTIFICATION_LIMIT);
  } catch {
    return [];
  }
}

export function writeCustomerNotificationCache(userId: string, notifications: CachedCustomerNotification[]) {
  try {
    const safeRows = notifications.slice(0, NOTIFICATION_LIMIT).map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      body: item.body,
      action_url: item.action_url || null,
      image_url: item.image_url || null,
      read_at: item.read_at || null,
      created_at: item.created_at,
      expires_at: item.expires_at || null,
    }));
    localStorage.setItem(notificationListKey(userId), JSON.stringify(safeRows));
  } catch {
    // Realtime and server data remain authoritative when local storage is unavailable.
  }
}

export function readCustomerNotificationCountCache(userId: string): number | null {
  try {
    const raw = localStorage.getItem(notificationCountKey(userId));
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeCustomerNotificationCountCache(userId: string, count: number) {
  try {
    localStorage.setItem(notificationCountKey(userId), String(Math.max(0, Math.floor(count))));
  } catch {
    // The unread badge will be recalculated from Supabase on the next load.
  }
}

export function clearCustomerNotificationCache(userId: string) {
  try {
    localStorage.removeItem(notificationListKey(userId));
    localStorage.removeItem(notificationCountKey(userId));
  } catch {
    // Sign-out should continue even if browser storage cannot be cleared.
  }
}
