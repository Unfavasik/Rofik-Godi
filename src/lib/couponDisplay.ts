import type { CustomerCouponOffer } from './supabaseCoupons';

export interface CouponNotificationReference {
  kind: string;
  title: string;
  body: string;
  action_url?: string | null;
}

export function isCouponNotification(notification: CouponNotificationReference): boolean {
  const kind = notification.kind.toLowerCase();
  return kind.includes('coupon') || kind.includes('offer') || kind.includes('promo');
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
