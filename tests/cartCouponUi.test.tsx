import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));

import { CartDrawer } from '../src/components/CartDrawer';
import {
  getCouponOfferStatus,
  sortCouponOffersByEligibility,
} from '../src/lib/couponDisplay';
import { I18nProvider } from '../src/lib/i18n';
import { clearSwrCache, writeSwrCache } from '../src/lib/swrCache';
import { PRODUCTS } from '../src/data/products';
import type { CartItem } from '../src/types';
import type { CustomerCouponOffer } from '../src/lib/supabaseCoupons';

const sampleCart: CartItem[] = [
  {
    cartItemId: 'cart-coupon-1',
    product: {
      ...PRODUCTS[0],
      id: 'prod-coupon-1',
      title: 'Royal Ribbed Seat Cover',
      price: 650,
      inStock: true,
    },
    unitPrice: 650,
    quantity: 1,
    selectedColor: { name: 'Jet Black', hex: '#111111', images: ['/images/sample.jpg'] },
  },
];

const unlockedPercentOffer: CustomerCouponOffer = {
  code: 'RIDE10',
  discount_type: 'PERCENTAGE',
  discount_value: 10,
  minimum_order_value: 500,
  max_discount: 100,
  expires_at: '2026-12-20T18:00:00.000Z',
  eligibility: 'EVERYONE',
  apply_to: 'ALL_PRODUCTS',
  description: null,
  product_names: [],
  category_keys: [],
};

const lockedFixedOffer: CustomerCouponOffer = {
  code: 'BIG150',
  discount_type: 'FIXED',
  discount_value: 150,
  minimum_order_value: 1000,
  max_discount: null,
  expires_at: '2026-12-25T18:00:00.000Z',
  eligibility: 'EVERYONE',
  apply_to: 'ALL_PRODUCTS',
  description: null,
  product_names: [],
  category_keys: [],
};

describe('cart coupon offer status and sorting', () => {
  it('computes unlock status, capped percentage savings, and remaining progress', () => {
    const unlocked = getCouponOfferStatus(unlockedPercentOffer, 650);
    expect(unlocked.isUnlocked).toBe(true);
    expect(unlocked.remainingAmount).toBe(0);
    expect(unlocked.progressPercent).toBe(100);
    expect(unlocked.estimatedSavings).toBe(65);

    const capped = getCouponOfferStatus(unlockedPercentOffer, 2000);
    expect(capped.estimatedSavings).toBe(100);

    const locked = getCouponOfferStatus(lockedFixedOffer, 650);
    expect(locked.isUnlocked).toBe(false);
    expect(locked.remainingAmount).toBe(350);
    expect(locked.progressPercent).toBe(65);
    expect(locked.estimatedSavings).toBe(150);
  });

  it('sorts unlocked offers first by highest savings and locked offers by smallest gap', () => {
    const farLocked: CustomerCouponOffer = {
      ...lockedFixedOffer,
      code: 'FAR200',
      minimum_order_value: 2000,
    };
    const biggerUnlocked: CustomerCouponOffer = {
      ...unlockedPercentOffer,
      code: 'FLAT120',
      discount_type: 'FIXED',
      discount_value: 120,
      minimum_order_value: 400,
      max_discount: null,
    };

    const sorted = sortCouponOffersByEligibility(
      [farLocked, unlockedPercentOffer, lockedFixedOffer, biggerUnlocked],
      650,
    );
    expect(sorted.map((o) => o.code)).toEqual(['FLAT120', 'RIDE10', 'BIG150', 'FAR200']);
  });
});

describe('CartDrawer Have a coupon? UI/UX', () => {
  beforeEach(() => {
    clearSwrCache();
  });

  it('renders compact glass coupon form, unlocked savings card, locked progress bar, and no double rupee or emoji chrome', () => {
    writeSwrCache('public:customer-coupons', [
      lockedFixedOffer,
      unlockedPercentOffer,
      { ...lockedFixedOffer, code: 'VIP300', discount_value: 300, minimum_order_value: 1500 },
    ]);

    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <CartDrawer
          isOpen
          onClose={() => undefined}
          items={sampleCart}
          userId="user-1"
          onUpdateQuantity={() => undefined}
          onRemoveItem={() => undefined}
          onProceedToCheckout={() => undefined}
        />
      </I18nProvider>,
    );

    expect(html).toContain('data-testid="cart-coupon-section"');
    expect(html).toContain('Have a coupon?');
    expect(html).toContain('3 available');
    expect(html).toContain('<form');
    expect(html).not.toContain('🎟️');
    expect(html).not.toContain('₹₹');

    // Unlocked offer displays estimated savings, min order cleanly, and Apply action
    expect(html).toContain('data-testid="cart-coupon-offer-RIDE10"');
    expect(html).toContain('10% OFF');
    expect(html).toContain('Up to ₹100');
    expect(html).toContain('Save ₹65');
    expect(html).toContain('Min order ₹500');
    expect(html).toContain('aria-label="Apply RIDE10"');

    // Locked offer displays add-more progress hint instead of blind apply button
    expect(html).toContain('data-testid="cart-coupon-offer-BIG150"');
    expect(html).toContain('Add ₹350 more to unlock');
    expect(html).not.toContain('aria-label="Apply BIG150"');

    // Collapses beyond 2 offers with View all toggle
    expect(html).toContain('View all 3 offers');
    expect(html).not.toContain('data-testid="cart-coupon-offer-VIP300"');
  });
});
