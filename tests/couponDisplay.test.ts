import { describe, expect, it } from 'vitest';
import { getCouponOfferForNotification } from '../src/lib/couponDisplay';
import type { CustomerCouponOffer } from '../src/lib/supabaseCoupons';

const offer: CustomerCouponOffer = {
  code: 'WELCOME20',
  discount_type: 'PERCENTAGE',
  discount_value: 10,
  minimum_order_value: 200,
  max_discount: 100,
  expires_at: '2026-11-14T11:58:00.000Z',
  eligibility: 'EVERYONE',
  apply_to: 'ALL_PRODUCTS',
  description: null,
  product_names: [],
  category_keys: [],
};

describe('coupon notification offer matching', () => {
  it('matches the live coupon code contained in the notification title/body', () => {
    expect(getCouponOfferForNotification({
      kind: 'coupon',
      title: 'New offer: WELCOME20',
      body: 'Save 10% on your next order with coupon WELCOME20.',
      action_url: '/shop',
    }, [offer])).toBe(offer);
  });

  it('does not attach a coupon to non-coupon notifications or unrelated offers', () => {
    expect(getCouponOfferForNotification({
      kind: 'order',
      title: 'Order update',
      body: 'Your order is ready.',
    }, [offer])).toBeNull();
    expect(getCouponOfferForNotification({
      kind: 'coupon',
      title: 'New offer',
      body: 'Save today with a special offer.',
    }, [offer])).toBeNull();
  });
});
