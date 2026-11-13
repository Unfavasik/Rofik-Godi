import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase', () => ({ supabase: null }));

import { CheckoutModal } from '../src/components/CheckoutModal';
import { CheckoutPageSkeleton } from '../src/components/AccountPageSkeleton';
import { I18nProvider } from '../src/lib/i18n';
import { PRODUCTS } from '../src/data/products';
import type { CartItem } from '../src/types';

const sampleItems: CartItem[] = [
  {
    cartItemId: 'item-1',
    product: {
      ...PRODUCTS[0],
      id: 'prod-1',
      slug: 'royal-seat-cover',
      title: 'Royal Ribbed Seat Cover',
      category: 'bike',
      price: 899,
      originalPrice: 1199,
      rating: 4.9,
      reviewCount: 42,
      image: '/images/sample.jpg',
      inStock: true,
      description: 'Waterproof ribbed cover.',
      compatibility: ['Bike'],
    },
    unitPrice: 899,
    quantity: 1,
    selectedColor: { name: 'Jet Black', hex: '#111111', images: ['/images/sample.jpg'] },
  },
];

describe('CheckoutModal UI & skeleton', () => {
  it('renders the 2-column responsive CheckoutPageSkeleton', () => {
    const html = renderToStaticMarkup(<CheckoutPageSkeleton label="Loading account details…" />);
    expect(html).toContain('data-testid="checkout-page-skeleton"');
    expect(html).toContain('Loading account details…');
    expect(html).toContain('skeleton-shimmer');
  });

  it('renders the upgraded glassmorphic CheckoutModal header, skeleton state, and payable footer', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <CheckoutModal
          isOpen
          onClose={() => undefined}
          items={sampleItems}
          discount={100}
          couponCode="RIDE100"
          onClearCart={() => undefined}
          userId="user-1"
          onOrderPlaced={() => undefined}
          onUpdateQuantity={() => undefined}
        />
      </I18nProvider>,
    );

    expect(html).toContain('Rofik Godi Centre');
    expect(html).toContain('data-testid="checkout-page-skeleton"');
    expect(html).toContain('₹799');
  });
});
