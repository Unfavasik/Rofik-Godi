import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderHelpSupportView } from '../src/components/OrderHelpSupportView';
import type { CustomerOrderRecord } from '../src/types';

const sampleOrder: CustomerOrderRecord = {
  id: 'ord-help-1',
  order_number: 'RGC-554433',
  order_slug: 'abcdefabcdefabcdefabcdefabcdef01',
  customer_name: 'Ayatul Sekh',
  customer_phone: '9876543210',
  payment_method: 'PAY_AT_STORE',
  payment_status: 'PENDING',
  status: 'READY_FOR_PICKUP',
  subtotal: 850,
  discount: 100,
  total: 750,
  vehicle_model: 'TVS Ntorq 125',
  fulfillment_method: 'STORE_PICKUP',
  pickup_store: 'Rofik Godi Centre',
  created_at: '2026-11-14T10:30:00Z',
  order_items: [
    {
      product_id: 'rg-prod-01',
      product_name: 'Racing Edge Seat Cover',
      color: 'Black & Red',
      quantity: 1,
      unit_price: 750,
      image_url: '/images/premium-seat-cover-hero.webp',
    },
  ],
};

describe('OrderHelpSupportView UI & Resolution Flow', () => {
  it('renders Classic Glass topbar, order summary with payment/vehicle context, 6 topics, and inline resolution studio', () => {
    const html = renderToStaticMarkup(
      <OrderHelpSupportView
        order={sampleOrder}
        isAuthenticated={true}
        onBack={vi.fn()}
        onOpenLiveChat={vi.fn()}
        onOpenSupportRequest={vi.fn()}
        onOpenSupportRequests={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="order-help-topbar"');
    expect(html).toContain('classic-glass');
    expect(html).toContain('#RGC-554433');
    expect(html).toContain('Racing Edge Seat Cover');
    expect(html).toContain('TVS Ntorq 125');
    expect(html).toContain('Due at Store Pickup (₹750)');
    expect(html).toContain('Ready for pickup &amp; free workshop fitment');

    // All 6 interactive help topics
    expect(html).toContain('data-testid="order-help-topic-order_status"');
    expect(html).toContain('data-testid="order-help-topic-payment_issue"');
    expect(html).toContain('data-testid="order-help-topic-change_order"');
    expect(html).toContain('data-testid="order-help-topic-pickup_store"');
    expect(html).toContain('data-testid="order-help-topic-return_exchange"');
    expect(html).toContain('data-testid="order-help-topic-other_help"');

    // Inline resolution panel & tracked ticket composer
    expect(html).toContain('data-testid="order-help-resolution-panel"');
    expect(html).toContain('Status &amp; Preparation for #RGC-554433');
    expect(html).toContain('Send Tracked Support Request');
    expect(html).toContain('WhatsApp with Order Details');
    expect(html).toContain(encodeURIComponent('#RGC-554433'));

    // Internal store-map button under Store Working Hours
    expect(html).toContain('data-testid="order-help-open-store-map"');
    expect(html).toContain('Open in Maps');
  });

  it('renders Classic Glass skeleton loading layout when loading is true or order is pending', () => {
    const html = renderToStaticMarkup(
      <OrderHelpSupportView
        order={null}
        loading={true}
        isAuthenticated={true}
        onBack={vi.fn()}
        onOpenLiveChat={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="order-help-topbar"');
    expect(html).toContain('data-testid="order-help-skeleton"');
    expect(html).toContain('skeleton-shimmer');
    expect(html).toContain('aria-busy="true"');
  });
});
