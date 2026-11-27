import type { Product } from '../types';
import type { CachedCustomerNotification } from './localCache';
import { safeJsonParse, sanitizeUrl } from './security';

export type PriceDropAlertRecord = {
  id: string;
  productId: string;
  productTitle: string;
  productImage?: string | null;
  thresholdPrice: number;
  initialPrice: number;
  createdAt: string;
  updatedAt: string;
  triggeredAt: string | null;
};

export type SuggestedPriceDropThreshold = {
  label: string;
  discountPercent: number;
  price: number;
};

export type PriceDropValidationResult =
  | { valid: true; thresholdPrice: number }
  | { valid: false; error: string };

const PRICE_DROP_ALERTS_CACHE_VERSION = 1;
const priceDropAlertsStorageKey = (userId: string) =>
  `rofik-godi:user:${userId}:price-drop-alerts:v${PRICE_DROP_ALERTS_CACHE_VERSION}`;

export const PRICE_DROP_ALERTS_UPDATED_EVENT = 'rofik-godi:price-drop-alerts-updated';

export function formatAlertRupee(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function validatePriceDropThreshold(
  rawInput: string | number,
  currentPrice: number,
): PriceDropValidationResult {
  if (!Number.isFinite(currentPrice) || currentPrice <= 1) {
    return {
      valid: false,
      error: 'Price drop alerts are unavailable for this product right now.',
    };
  }

  const normalizedString = typeof rawInput === 'number' ? String(rawInput) : rawInput.trim();
  if (!normalizedString) {
    return { valid: false, error: 'Enter a target price.' };
  }

  const cleaned = normalizedString.replace(/[,₹\s]/g, '');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return { valid: false, error: 'Enter a valid numeric price.' };
  }

  const rounded = Math.round(parsed * 100) / 100;
  if (rounded <= 0) {
    return { valid: false, error: 'Target price must be greater than ₹0.' };
  }

  if (rounded >= currentPrice) {
    return {
      valid: false,
      error: `Target price must be below the current price (${formatAlertRupee(currentPrice)}).`,
    };
  }

  return { valid: true, thresholdPrice: rounded };
}

export function getSuggestedThresholds(currentPrice: number): SuggestedPriceDropThreshold[] {
  if (!Number.isFinite(currentPrice) || currentPrice <= 1) return [];
  const percentages = [10, 20, 30];
  const seenPrices = new Set<number>();
  const suggestions: SuggestedPriceDropThreshold[] = [];

  for (const discountPercent of percentages) {
    const candidate = Math.max(1, Math.round(currentPrice * (1 - discountPercent / 100)));
    if (candidate >= currentPrice || candidate <= 0 || seenPrices.has(candidate)) continue;
    seenPrices.add(candidate);
    suggestions.push({
      label: `-${discountPercent}%`,
      discountPercent,
      price: candidate,
    });
  }

  return suggestions;
}

export function isPriceDropTriggered(
  alert: Pick<PriceDropAlertRecord, 'thresholdPrice' | 'triggeredAt'>,
  currentPrice: number,
): boolean {
  if (alert.triggeredAt !== null) return false;
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return false;
  if (!Number.isFinite(alert.thresholdPrice) || alert.thresholdPrice <= 0) return false;
  return currentPrice < alert.thresholdPrice;
}

export function buildPriceDropNotification(
  product: Pick<Product, 'id' | 'title' | 'price' | 'image'>,
  thresholdPrice: number,
  createdAt = new Date().toISOString(),
): CachedCustomerNotification {
  return {
    id: `price-drop-${product.id}-${Math.round(product.price)}-${Date.parse(createdAt) || Date.now()}`,
    kind: 'price_drop',
    title: `Price Drop Alert: ${product.title}`,
    body: `Now ${formatAlertRupee(product.price)} — below your ${formatAlertRupee(thresholdPrice)} target price.`,
    action_url: `/shop/products/${encodeURIComponent(product.id)}`,
    image_url: sanitizeUrl(product.image, { allowRelative: true }),
    read_at: null,
    created_at: createdAt,
    expires_at: null,
  };
}

export function evaluateCatalogPriceDrops(
  alerts: PriceDropAlertRecord[],
  products: Array<Pick<Product, 'id' | 'title' | 'price' | 'image'>>,
  nowIso = new Date().toISOString(),
): {
  triggered: Array<{
    alert: PriceDropAlertRecord;
    product: Pick<Product, 'id' | 'title' | 'price' | 'image'>;
    notification: CachedCustomerNotification;
  }>;
  updatedAlerts: PriceDropAlertRecord[];
} {
  if (!alerts.length || !products.length) {
    return { triggered: [], updatedAlerts: alerts };
  }

  const productById = new Map(products.map((product) => [product.id, product] as const));
  const triggered: Array<{
    alert: PriceDropAlertRecord;
    product: Pick<Product, 'id' | 'title' | 'price' | 'image'>;
    notification: CachedCustomerNotification;
  }> = [];

  const updatedAlerts = alerts.map((alert) => {
    const product = productById.get(alert.productId);
    if (!product || !isPriceDropTriggered(alert, product.price)) {
      return alert;
    }

    const updatedAlert: PriceDropAlertRecord = {
      ...alert,
      productTitle: product.title,
      productImage: product.image || alert.productImage || null,
      triggeredAt: nowIso,
      updatedAt: nowIso,
    };

    triggered.push({
      alert: updatedAlert,
      product,
      notification: buildPriceDropNotification(product, alert.thresholdPrice, nowIso),
    });

    return updatedAlert;
  });

  return { triggered, updatedAlerts };
}

function isValidPriceDropAlertRecord(item: unknown): item is PriceDropAlertRecord {
  if (!item || typeof item !== 'object') return false;
  const record = item as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.productId === 'string' &&
    typeof record.productTitle === 'string' &&
    typeof record.thresholdPrice === 'number' &&
    Number.isFinite(record.thresholdPrice) &&
    record.thresholdPrice > 0 &&
    typeof record.initialPrice === 'number' &&
    Number.isFinite(record.initialPrice) &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string' &&
    (record.triggeredAt === null || typeof record.triggeredAt === 'string')
  );
}

export function readLocalPriceDropAlerts(userId: string): PriceDropAlertRecord[] {
  if (!userId || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(priceDropAlertsStorageKey(userId));
    if (!raw) return [];
    const parsed = safeJsonParse<unknown>(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidPriceDropAlertRecord)
      .slice(0, 100)
      .map((item) => ({
        ...item,
        productImage: sanitizeUrl(item.productImage, { allowRelative: true }),
      }));
  } catch {
    return [];
  }
}

export function writeLocalPriceDropAlerts(userId: string, alerts: PriceDropAlertRecord[]): void {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(priceDropAlertsStorageKey(userId), JSON.stringify(alerts));
  } catch {
    // Ignore storage quota or private-browsing errors.
  }
}

export function upsertLocalPriceDropAlert(
  userId: string,
  product: Pick<Product, 'id' | 'title' | 'price' | 'image'>,
  thresholdPrice: number,
  nowIso = new Date().toISOString(),
): PriceDropAlertRecord[] {
  const current = readLocalPriceDropAlerts(userId);
  const existing = current.find((item) => item.productId === product.id);
  const nextRecord: PriceDropAlertRecord = {
    id: existing?.id || `pda-${product.id}`,
    productId: product.id,
    productTitle: product.title,
    productImage: product.image || null,
    thresholdPrice,
    initialPrice: product.price,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    triggeredAt: null,
  };
  const updated = [nextRecord, ...current.filter((item) => item.productId !== product.id)];
  writeLocalPriceDropAlerts(userId, updated);
  return updated;
}

export function removeLocalPriceDropAlert(userId: string, productId: string): PriceDropAlertRecord[] {
  const current = readLocalPriceDropAlerts(userId);
  const updated = current.filter((item) => item.productId !== productId);
  writeLocalPriceDropAlerts(userId, updated);
  return updated;
}

export function mergePriceDropAlerts(
  serverAlerts: PriceDropAlertRecord[],
  localAlerts: PriceDropAlertRecord[],
): PriceDropAlertRecord[] {
  const byProductId = new Map<string, PriceDropAlertRecord>();
  for (const item of localAlerts) {
    byProductId.set(item.productId, item);
  }
  for (const item of serverAlerts) {
    byProductId.set(item.productId, item);
  }
  return [...byProductId.values()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}
