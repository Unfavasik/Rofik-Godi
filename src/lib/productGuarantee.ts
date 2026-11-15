import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { saveAdminJsonSetting } from './supabaseAdmin';
import {
  DEFAULT_PRODUCT_GUARANTEE_POLICY,
  GUARANTEE_POLICY_STORAGE_KEY,
  PRODUCT_GUARANTEE_CHANGED_EVENT,
  PRODUCT_GUARANTEE_MAP_STORAGE_KEY,
  isValidIsoDateString,
  normalizeGuaranteeDate,
  normalizeProductGuaranteePolicy,
  resolveSpecificProductGuarantee,
  type ProductGuaranteePolicy,
  type ResolvedGuaranteeInfo,
} from './productGuaranteeLogic';

export * from './productGuaranteeLogic';

export function readLocalProductGuaranteeMap(): Record<string, string | null> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PRODUCT_GUARANTEE_MAP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string | null> = {};
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      result[key] = normalizeGuaranteeDate(val);
    }
    return result;
  } catch {
    return {};
  }
}

export function getLocalProductGuaranteeDate(
  productId?: string | null,
  productSlug?: string | null,
): string | null | undefined {
  const map = readLocalProductGuaranteeMap();
  if (productId && Object.prototype.hasOwnProperty.call(map, productId)) {
    return map[productId] ?? null;
  }
  if (productSlug && Object.prototype.hasOwnProperty.call(map, productSlug)) {
    return map[productSlug] ?? null;
  }
  return undefined;
}

export function saveLocalProductGuaranteeDate(
  keys: { id?: string | null; slug?: string | null },
  guaranteeDate: string | null | undefined,
): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readLocalProductGuaranteeMap();
    const normalized = normalizeGuaranteeDate(guaranteeDate);
    if (keys.id) map[keys.id] = normalized;
    if (keys.slug) map[keys.slug] = normalized;
    window.localStorage.setItem(PRODUCT_GUARANTEE_MAP_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent(PRODUCT_GUARANTEE_CHANGED_EVENT, {
        detail: { productId: keys.id, productSlug: keys.slug, guaranteeDate: normalized },
      }),
    );
  } catch {
    // Ignore storage errors in restricted environments.
  }
}

export async function fetchProductGuaranteeDateFromDb(params: {
  productId?: string | null;
  productSlug?: string | null;
  fallbackDate?: string | null;
}): Promise<string | null> {
  const { productId, productSlug, fallbackDate } = params;
  const localOverride = getLocalProductGuaranteeDate(productId, productSlug);
  const initial =
    localOverride !== undefined ? localOverride : normalizeGuaranteeDate(fallbackDate);

  if (!supabase || (!productId && !productSlug)) {
    return initial;
  }

  try {
    const isUuid = Boolean(productId && /^[0-9a-f-]{36}$/i.test(productId));
    const query = supabase.from('products').select('id,slug,guarantee_valid_until').limit(1);
    const { data, error } = isUuid
      ? await query.eq('id', productId!)
      : productSlug
        ? await query.eq('slug', productSlug)
        : await query.eq('id', productId!);

    if (error) {
      return initial;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row || typeof row !== 'object') return initial;
    const dbDate = normalizeGuaranteeDate(
      (row as Record<string, unknown>).guarantee_valid_until,
    );
    if (dbDate !== null) {
      saveLocalProductGuaranteeDate(
        {
          id: String((row as Record<string, unknown>).id || productId || ''),
          slug: String((row as Record<string, unknown>).slug || productSlug || ''),
        },
        dbDate,
      );
      return dbDate;
    }
    return localOverride !== undefined ? localOverride : null;
  } catch {
    return initial;
  }
}

export function useProductGuaranteeDate(
  productId?: string | null,
  productSlug?: string | null,
  fallbackDate?: string | null,
): ResolvedGuaranteeInfo | null {
  const normalizedFallback = normalizeGuaranteeDate(fallbackDate);
  const [resolvedDate, setResolvedDate] = useState<string | null | undefined>(() =>
    getLocalProductGuaranteeDate(productId, productSlug),
  );

  useEffect(() => {
    setResolvedDate(getLocalProductGuaranteeDate(productId, productSlug));
    let active = true;
    void fetchProductGuaranteeDateFromDb({
      productId,
      productSlug,
      fallbackDate: normalizedFallback,
    }).then((dbDate) => {
      if (active) setResolvedDate(dbDate);
    });

    const handleChanged = () => {
      setResolvedDate(getLocalProductGuaranteeDate(productId, productSlug));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleChanged);
      window.addEventListener('storage', handleChanged);
    }
    return () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleChanged);
        window.removeEventListener('storage', handleChanged);
      }
    };
  }, [productId, productSlug, normalizedFallback]);

  const effectiveDate = resolvedDate !== undefined ? resolvedDate : normalizedFallback;
  return resolveSpecificProductGuarantee(effectiveDate);
}

export function readCachedProductGuaranteePolicy(): ProductGuaranteePolicy {
  if (typeof window === 'undefined') return { ...DEFAULT_PRODUCT_GUARANTEE_POLICY };
  try {
    const raw = window.localStorage.getItem(GUARANTEE_POLICY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRODUCT_GUARANTEE_POLICY };
    return normalizeProductGuaranteePolicy(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PRODUCT_GUARANTEE_POLICY };
  }
}

export function writeCachedProductGuaranteePolicy(policy: ProductGuaranteePolicy): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUARANTEE_POLICY_STORAGE_KEY, JSON.stringify(policy));
    window.dispatchEvent(new CustomEvent(PRODUCT_GUARANTEE_CHANGED_EVENT, { detail: policy }));
  } catch {
    // Ignore storage quota or SSR errors cleanly.
  }
}

export async function fetchPublicProductGuaranteePolicy(): Promise<ProductGuaranteePolicy> {
  return readCachedProductGuaranteePolicy();
}

export async function saveAdminProductGuaranteePolicy(
  policy: ProductGuaranteePolicy,
): Promise<{ policy: ProductGuaranteePolicy; error: Error | null }> {
  const normalized = normalizeProductGuaranteePolicy({
    ...policy,
    updatedAt: new Date().toISOString(),
  });

  if (normalized.mode === 'fixed_date' && !isValidIsoDateString(normalized.validUntilDate)) {
    return {
      policy: normalized,
      error: new Error('Select a valid guarantee expiry date (YYYY-MM-DD).'),
    };
  }

  writeCachedProductGuaranteePolicy(normalized);

  if (!supabase) {
    return { policy: normalized, error: null };
  }

  const { error } = await saveAdminJsonSetting('product_guarantee_policy', normalized);
  return {
    policy: normalized,
    error: error ? new Error(error.message || 'Could not save guarantee policy') : null,
  };
}

export function useProductGuaranteePolicy(): ProductGuaranteePolicy {
  const [policy, setPolicy] = useState<ProductGuaranteePolicy>(() =>
    readCachedProductGuaranteePolicy(),
  );

  useEffect(() => {
    const handleChanged = () => {
      setPolicy(readCachedProductGuaranteePolicy());
    };
    window.addEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleChanged);
    window.addEventListener('storage', handleChanged);
    return () => {
      window.removeEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleChanged);
      window.removeEventListener('storage', handleChanged);
    };
  }, []);

  return policy;
}
