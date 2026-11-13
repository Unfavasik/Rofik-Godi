import type { CartItem } from '../types';
import { validateCustomerCoupon, type CouponQuote } from './supabaseCoupons';

export interface CheckoutCouponState {
  code: string;
  discount: number;
  subtotal: number;
  total: number;
}

export interface CheckoutCouponMessages {
  emptyCode: string;
  invalidCoupon: string;
  unavailable: string;
}

export type CheckoutCouponValidationResult =
  | { ok: true; applied: CheckoutCouponState; message: string }
  | { ok: false; error: string };

export function normalizeCouponInput(rawCode: string): string {
  return rawCode.trim().toUpperCase().replace(/\s+/g, '');
}

export function calculateItemsSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function buildAppliedCouponFromQuote(
  code: string,
  quote: CouponQuote,
  fallbackSubtotal: number,
): CheckoutCouponState {
  const normalizedCode = normalizeCouponInput(quote.code || code);
  const subtotal = Number(quote.subtotal ?? fallbackSubtotal);
  const discount = Math.max(0, Number(quote.discount_amount ?? quote.discount ?? 0));
  const total = Math.max(0, Number(quote.final_total ?? subtotal - discount));
  return {
    code: normalizedCode,
    discount,
    subtotal,
    total,
  };
}

export function getCheckoutPricingSummary(
  items: CartItem[],
  appliedCoupon: CheckoutCouponState | null,
): {
  subtotal: number;
  discount: number;
  total: number;
  couponCode: string;
} {
  const itemsSubtotal = calculateItemsSubtotal(items);
  if (!appliedCoupon || !appliedCoupon.code) {
    return {
      subtotal: itemsSubtotal,
      discount: 0,
      total: itemsSubtotal,
      couponCode: '',
    };
  }

  const subtotal = appliedCoupon.subtotal || itemsSubtotal;
  const discount = Math.max(0, Math.min(subtotal, appliedCoupon.discount));
  const total = Math.max(0, appliedCoupon.total ?? subtotal - discount);
  return {
    subtotal,
    discount,
    total,
    couponCode: appliedCoupon.code,
  };
}

export async function applyCouponCodeForCheckout(
  rawCode: string,
  items: CartItem[],
  userId: string,
  messages: CheckoutCouponMessages,
  validator: typeof validateCustomerCoupon = validateCustomerCoupon,
): Promise<CheckoutCouponValidationResult> {
  const code = normalizeCouponInput(rawCode);
  if (!code) {
    return { ok: false, error: messages.emptyCode };
  }

  const fallbackSubtotal = calculateItemsSubtotal(items);
  try {
    const quote = await validator(code, items, userId);
    if (!quote.valid) {
      return { ok: false, error: quote.message || messages.invalidCoupon };
    }
    return {
      ok: true,
      applied: buildAppliedCouponFromQuote(code, quote, fallbackSubtotal),
      message: quote.message || '',
    };
  } catch {
    return { ok: false, error: messages.unavailable };
  }
}
