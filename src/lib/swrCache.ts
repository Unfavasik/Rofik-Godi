const SESSION_PREFIX = 'rofik-godi:swr:v1:';
const memoryCache = new Map<string, { data: unknown; savedAt: number }>();
const loadedImageUrls = new Set<string>();

function readSessionEntry<T>(key: string): { data: T; savedAt: number } | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { data?: T; savedAt?: unknown } | null;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.savedAt !== 'number' || !('data' in parsed)) {
      return undefined;
    }
    return { data: parsed.data as T, savedAt: parsed.savedAt };
  } catch {
    return undefined;
  }
}

export function readSwrCache<T>(key: string, maxAgeMs?: number): T | undefined {
  let entry = memoryCache.get(key) as { data: T; savedAt: number } | undefined;
  if (!entry) {
    entry = readSessionEntry<T>(key);
    if (entry) memoryCache.set(key, entry);
  }
  if (!entry) return undefined;
  if (typeof maxAgeMs === 'number' && maxAgeMs >= 0 && Date.now() - entry.savedAt > maxAgeMs) {
    return undefined;
  }
  return entry.data;
}

export function writeSwrCache<T>(key: string, data: T): T {
  const entry = { data, savedAt: Date.now() };
  memoryCache.set(key, entry);
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(`${SESSION_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // In-memory cache remains active when sessionStorage is unavailable or full.
    }
  }
  return data;
}

export function invalidateSwrCache(key: string): void {
  memoryCache.delete(key);
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(`${SESSION_PREFIX}${key}`);
    } catch {
      // Ignore storage errors.
    }
  }
}

export function invalidateSwrCachePrefix(prefix: string): void {
  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
  if (typeof window !== 'undefined') {
    try {
      const fullPrefix = `${SESSION_PREFIX}${prefix}`;
      for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
        const storageKey = window.sessionStorage.key(i);
        if (storageKey && storageKey.startsWith(fullPrefix)) {
          window.sessionStorage.removeItem(storageKey);
        }
      }
    } catch {
      // Ignore storage errors.
    }
  }
}

export function clearSwrCache(): void {
  memoryCache.clear();
  loadedImageUrls.clear();
  if (typeof window !== 'undefined') {
    try {
      for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
        const storageKey = window.sessionStorage.key(i);
        if (storageKey && storageKey.startsWith(SESSION_PREFIX)) {
          window.sessionStorage.removeItem(storageKey);
        }
      }
    } catch {
      // Ignore storage errors.
    }
  }
}

export function isImageLoaded(src?: string | null): boolean {
  if (!src) return false;
  return loadedImageUrls.has(src);
}

export function markImageLoaded(src?: string | null): void {
  if (!src) return;
  loadedImageUrls.add(src);
}
