import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutCouponValidator } from '../src/components/CheckoutCouponValidator';
import {
  applyCouponCodeForCheckout,
  getCheckoutPricingSummary,
  normalizeCouponInput,
} from '../src/lib/checkoutCoupon';
import { I18nProvider } from '../src/lib/i18n';
import { PRODUCTS } from '../src/data/products';
import type { CartItem } from '../src/types';
import type { CustomerCouponOffer } from '../src/lib/supabaseCoupons';

const sampleItems: CartItem[] = [
  {
    cartItemId: 'item-1',
    product: {
      ...PRODUCTS[0],
      id: 'prod-1',
      title: 'Royal Ribbed Seat Cover',
      price: 899,
      originalPrice: 1199,
    },
    unitPrice: 899,
    quantity: 2,
    selectedColor: { name: 'Jet Black', hex: '#111111' },
  },
];

const sampleOffer: CustomerCouponOffer = {
  code: 'RIDE150',
  discount_type: 'FIXED',
  discount_value: 150,
  minimum_order_value: 1000,
  max_discount: null,
  expires_at: '2026-12-31T18:29:00.000Z',
  eligibility: 'EVERYONE',
  apply_to: 'ALL_PRODUCTS',
  description: null,
  product_names: [],
  category_keys: [],
};

describe('checkout inline coupon validator', () => {
  it('normalizes coupon codes and rejects empty input immediately', async () => {
    expect(normalizeCouponInput('  ride 150 ')).toBe('RIDE150');

    const validator = vi.fn();
    const result = await applyCouponCodeForCheckout(
      '   ',
      sampleItems,
      'user-1',
      {
        emptyCode: 'Enter a coupon code first.',
        invalidCoupon: 'Coupon is invalid or expired.',
        unavailable: 'Unavailable',
      },
      validator,
    );

    expect(result).toEqual({ ok: false, error: 'Enter a coupon code first.' });
    expect(validator).not.toHaveBeenCalled();
  });

  it('dynamically updates order subtotal, discount, and total when validation succeeds', async () => {
    const validator = vi.fn().mockResolvedValue({
      valid: true,
      code: 'RIDE150',
      subtotal: 1798,
      discount_amount: 150,
      final_total: 1648,
      message: 'Coupon applied.',
    });

    const result = await applyCouponCodeForCheckout(
      'ride150',
      sampleItems,
      'user-1',
      {
        emptyCode: 'Enter a coupon code first.',
        invalidCoupon: 'Coupon is invalid or expired.',
        unavailable: 'Unavailable',
      },
      validator,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getCheckoutPricingSummary(sampleItems, result.applied)).toEqual({
        subtotal: 1798,
        discount: 150,
        total: 1648,
        couponCode: 'RIDE150',
      });
    }
    expect(getCheckoutPricingSummary(sampleItems, null)).toEqual({
      subtotal: 1798,
      discount: 0,
      total: 1798,
      couponCode: '',
    });
  });

  it('surfaces validation error messages when a coupon is invalid', async () => {
    const validator = vi.fn().mockResolvedValue({
      valid: false,
      message: 'Minimum order ₹2,000 required for this coupon.',
    });

    const result = await applyCouponCodeForCheckout(
      'BIGSAVE',
      sampleItems,
      'user-1',
      {
        emptyCode: 'Enter a coupon code first.',
        invalidCoupon: 'Coupon is invalid or expired.',
        unavailable: 'Unavailable',
      },
      validator,
    );

    expect(result).toEqual({
      ok: false,
      error: 'Minimum order ₹2,000 required for this coupon.',
    });
  });

  it('renders error feedback, aria-invalid state, and eligible quick-apply offers', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <CheckoutCouponValidator
          couponInput="BADCODE"
          onCouponInputChange={() => undefined}
          appliedCoupon={null}
          errorMessage="Coupon is invalid or expired."
          isValidating={false}
          eligibleOffers={[sampleOffer]}
          onApply={() => undefined}
          onRemove={() => undefined}
        />
      </I18nProvider>,
    );

    expect(html).toContain('data-testid="checkout-coupon-validator"');
    expect(html).toContain('data-testid="checkout-coupon-error"');
    expect(html).toContain('Coupon is invalid or expired.');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('RIDE150');
    expect(html).toContain('Tap to apply');
  });

  it('renders success feedback card with applied code, discount amount, and remove control', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <CheckoutCouponValidator
          couponInput=""
          onCouponInputChange={() => undefined}
          appliedCoupon={{ code: 'RIDE150', discount: 150, subtotal: 1798, total: 1648 }}
          errorMessage=""
          isValidating={false}
          eligibleOffers={[sampleOffer]}
          onApply={() => undefined}
          onRemove={() => undefined}
        />
      </I18nProvider>,
    );

    expect(html).toContain('data-testid="checkout-coupon-success"');
    expect(html).toContain('Code &#x27;RIDE150&#x27; Applied!');
    expect(html).toContain('−₹150');
    expect(html).toContain('Remove');
    expect(html).not.toContain('Tap to apply');
  });
});
