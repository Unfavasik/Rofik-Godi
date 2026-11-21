import type { CustomerCouponOffer } from './supabaseCoupons';

export interface CouponNotificationReference {
  kind: string;
  title: string;
  body: string;
  action_url?: string | null;
}

export function getUnappliedCouponOffers(
  offers: CustomerCouponOffer[],
  appliedCode?: string | null,
): CustomerCouponOffer[] {
  const normalizedAppliedCode = appliedCode?.trim().toUpperCase();
  if (!normalizedAppliedCode) return offers;
  return offers.filter((offer) => offer.code.trim().toUpperCase() !== normalizedAppliedCode);
}

export function isCouponNotification(notification: CouponNotificationReference): boolean {
  const kind = notification.kind.toLowerCase();
  return kind.includes('coupon') || kind.includes('offer') || kind.includes('promo');
}

export interface CouponOfferStatus {
  minimumOrder: number;
  remainingAmount: number;
  isUnlocked: boolean;
  progressPercent: number;
  estimatedSavings: number | null;
}

export function getCouponOfferStatus(
  offer: CustomerCouponOffer,
  subtotal: number,
): CouponOfferStatus {
  const safeSubtotal = Math.max(0, Number.isFinite(subtotal) ? subtotal : 0);
  const minimumOrder = Math.max(0, Number.isFinite(offer.minimum_order_value) ? offer.minimum_order_value : 0);
  const remainingAmount = Math.max(0, Math.round((minimumOrder - safeSubtotal) * 100) / 100);
  const isUnlocked = remainingAmount <= 0;
  const progressPercent = minimumOrder > 0
    ? Math.min(100, Math.max(0, Math.round((safeSubtotal / minimumOrder) * 100)))
    : 100;

  let estimatedSavings: number | null = null;
  if (offer.apply_to === 'ALL_PRODUCTS' && safeSubtotal > 0) {
    if (offer.discount_type === 'PERCENTAGE') {
      const raw = (safeSubtotal * Number(offer.discount_value || 0)) / 100;
      const capped = offer.max_discount !== null && Number.isFinite(offer.max_discount)
        ? Math.min(raw, offer.max_discount)
        : raw;
      estimatedSavings = Math.max(0, Math.round(Math.min(capped, safeSubtotal) * 100) / 100);
    } else {
      estimatedSavings = Math.max(0, Math.round(Math.min(Number(offer.discount_value || 0), safeSubtotal) * 100) / 100);
    }
  }

  return {
    minimumOrder,
    remainingAmount,
    isUnlocked,
    progressPercent,
    estimatedSavings,
  };
}

export function sortCouponOffersByEligibility(
  offers: CustomerCouponOffer[],
  subtotal: number,
): CustomerCouponOffer[] {
  return [...offers].sort((a, b) => {
    const statusA = getCouponOfferStatus(a, subtotal);
    const statusB = getCouponOfferStatus(b, subtotal);
    if (statusA.isUnlocked !== statusB.isUnlocked) {
      return statusA.isUnlocked ? -1 : 1;
    }
    if (statusA.isUnlocked) {
      const saveDiff = (statusB.estimatedSavings ?? 0) - (statusA.estimatedSavings ?? 0);
      if (saveDiff !== 0) return saveDiff;
      return statusA.minimumOrder - statusB.minimumOrder;
    }
    return statusA.remainingAmount - statusB.remainingAmount;
  });
}

export function getCouponOfferForNotification(
  notification: CouponNotificationReference,
  offers: CustomerCouponOffer[],
): CustomerCouponOffer | null {
  if (!isCouponNotification(notification)) return null;
  const content = `${notification.title} ${notification.body} ${notification.action_url || ''}`.toUpperCase();
  return offers.find((offer) => {
    const code = offer.code.trim().toUpperCase();
    if (!code) return false;
    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^A-Z0-9])${escapedCode}(?:$|[^A-Z0-9])`).test(content);
  }) || null;
}
