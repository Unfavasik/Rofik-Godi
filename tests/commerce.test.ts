import { describe, expect, it } from 'vitest';
import { calculateCouponDiscount, calculateOrderTotal, calculateSubtotal } from '../src/lib/commerce';

describe('commerce calculations', () => {
  it('calculates a cart subtotal', () => expect(calculateSubtotal([{ unitPrice: 250, quantity: 2 }, { unitPrice: 100, quantity: 1 }])).toBe(600));
  it('honours coupon minimums and maximum discounts', () => {
    expect(calculateCouponDiscount(400, { discount_type: 'percent', discount_value: 10, minimum_order: 500 })).toBe(0);
    expect(calculateCouponDiscount(1000, { discount_type: 'percent', discount_value: 20, maximum_discount: 150 })).toBe(150);
  });
  it('never returns a negative order total', () => expect(calculateOrderTotal(100, 150)).toBe(0));
});
