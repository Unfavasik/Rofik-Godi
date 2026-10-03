export type CouponRule = { discount_type: 'percent' | 'fixed'; discount_value: number; minimum_order?: number; maximum_discount?: number | null };

export function calculateSubtotal(items: Array<{ unitPrice: number; quantity: number }>): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function calculateCouponDiscount(subtotal: number, coupon: CouponRule | null): number {
  if (!coupon || subtotal < (coupon.minimum_order || 0)) return 0;
  const raw = coupon.discount_type === 'percent' ? subtotal * coupon.discount_value / 100 : coupon.discount_value;
  return Math.min(Math.max(0, raw), coupon.maximum_discount ?? Number.POSITIVE_INFINITY, subtotal);
}

export function calculateOrderTotal(subtotal: number, discount: number): number {
  return Math.max(0, subtotal - Math.max(0, discount));
}
