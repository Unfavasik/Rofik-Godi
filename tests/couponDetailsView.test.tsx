import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CouponDetailsView } from '../src/components/CouponDetailsView';
import type { CustomerCouponOffer } from '../src/lib/supabaseCoupons';

const liveOffer: CustomerCouponOffer = {
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

describe('coupon details view', () => {
  it('renders the mockup-style coupon with the supplied current offer terms', () => {
    const html = renderToStaticMarkup(<CouponDetailsView offer={liveOffer} onBack={() => {}} onShopNow={() => {}} />);
    for (const content of [
      'Coupon Details', 'WELCOME OFFER', '10% OFF', '₹200', 'up to ₹100', 'WELCOME20',
      'Maximum Discount', '14 Nov 2026', 'All customers', 'Valid on all products.', 'Shop Now',
    ]) expect(html).toContain(content);
    expect(html).not.toContain('₹500');
    expect(html).not.toContain('₹200</p><p class="mt-0.5 text-[16px] font-extrabold leading-snug text-slate-900 sm:text-[17px]">New customers only');
  });
});
