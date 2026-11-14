import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { saveAdminJsonSetting } from './supabaseAdmin';
import {
  DEFAULT_PRODUCT_GUARANTEE_POLICY,
  GUARANTEE_POLICY_STORAGE_KEY,
  PRODUCT_GUARANTEE_CHANGED_EVENT,
  isValidIsoDateString,
  normalizeProductGuaranteePolicy,
  type ProductGuaranteePolicy,
} from './productGuaranteeLogic';

export * from './productGuaranteeLogic';

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

let pendingGuaranteeFetch: Promise<ProductGuaranteePolicy> | null = null;
let guaranteeRpcMissing = false;

export async function fetchPublicProductGuaranteePolicy(): Promise<ProductGuaranteePolicy> {
  const cached = readCachedProductGuaranteePolicy();
  if (!supabase || guaranteeRpcMissing) return cached;
  if (pendingGuaranteeFetch) return pendingGuaranteeFetch;

  pendingGuaranteeFetch = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_product_guarantee_policy');
      if (error) {
        const code = String((error as { code?: unknown }).code || '');
        const msg = String(error.message || '');
        if (code === 'PGRST202' || /could not find the function|404/i.test(msg)) {
          guaranteeRpcMissing = true;
        }
        return cached;
      }
      if (!data) return cached;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || typeof row !== 'object') return cached;
      const normalized = normalizeProductGuaranteePolicy(row);
      writeCachedProductGuaranteePolicy(normalized);
      return normalized;
    } catch {
      return cached;
    } finally {
      pendingGuaranteeFetch = null;
    }
  })();

  return pendingGuaranteeFetch;
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
    let active = true;
    void fetchPublicProductGuaranteePolicy().then((remote) => {
      if (active) setPolicy(remote);
    });

    const handleChanged = (event: Event) => {
      const custom = event as CustomEvent<ProductGuaranteePolicy>;
      if (custom.detail) {
        setPolicy(normalizeProductGuaranteePolicy(custom.detail));
      } else {
        setPolicy(readCachedProductGuaranteePolicy());
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === GUARANTEE_POLICY_STORAGE_KEY) {
        setPolicy(readCachedProductGuaranteePolicy());
      }
    };

    window.addEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      active = false;
      window.removeEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return policy;
}
