import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase', () => ({ supabase: null }));

import { ReportsView } from '../src/components/AdminSections';
import { PRODUCTS } from '../src/data/products';
import { resolveOrderItemProductImage, type AdminOrderRecord } from '../src/lib/supabaseAdminOrders';
import type { Product } from '../src/types';

const makeOrder = (overrides: Partial<AdminOrderRecord>): AdminOrderRecord => ({
  id: '#RG-1001',
  userId: 'user-1',
  orderNumber: 'RG-1001',
  customer: 'Arjun Roy',
  phone: '9876543210',
  initials: 'AR',
  product: 'Racing Edge',
  amount: 1300,
  subtotal: 1300,
  discount: 0,
  paymentMethod: 'PAY_AT_SHOP',
  paymentStatus: 'PAID',
  status: 'COMPLETED',
  date: 'Today',
  channel: 'Pickup',
  vehicleModel: 'Activa 6G',
  pickupStore: 'Berhampore Main Store',
  pickupNote: '',
  pickedUpAt: null,
  completedAt: '2026-11-20T08:00:00.000Z',
  statusHistory: [],
  items: [],
  createdAt: '2026-11-20T07:00:00.000Z',
  ...overrides,
});

describe('Reports Top selling products images', () => {
  it('renders product thumbnails in ReportsView using product_id, product_name, color variant, and hydrated item image_url', () => {
    const productA: Product = {
      ...PRODUCTS[0],
      id: 'prod-racing-edge',
      title: 'Racing Edge',
      categoryLabel: 'Scooter Covers',
      image: '/images/racing-edge-default.webp',
      colors: [
        {
          name: 'Neon Green',
          hex: '#22c55e',
          bgClass: 'bg-green-500',
          images: ['/images/racing-edge-neon.webp'],
        },
      ],
    };
    const productB: Product = {
      ...PRODUCTS[0],
      id: 'prod-apex-grid',
      title: 'Apex Grid Dual-Tone',
      categoryLabel: 'Bike Covers',
      image: '/images/apex-grid.webp',
      colors: [],
    };

    const orders: AdminOrderRecord[] = [
      makeOrder({
        id: '#RG-1001',
        items: [
          {
            product_id: 'prod-racing-edge',
            product_name: 'Racing Edge',
            color: 'Neon Green',
            quantity: 3,
            unit_price: 650,
          },
          {
            product_id: null,
            product_name: 'apex grid dual-tone',
            quantity: 2,
            unit_price: 450,
          },
        ],
      }),
      makeOrder({
        id: '#RG-1002',
        items: [
          {
            product_id: 'archived-prod-id',
            product_name: 'Classic Quilted Cover',
            image_url: '/images/archived-classic.webp',
            quantity: 1,
            unit_price: 550,
          },
        ],
      }),
    ];

    const html = renderToStaticMarkup(
      <ReportsView
        metrics={{ total_orders: 2, total_revenue: 3400, verified_payments: 2, total_customers: 2 }}
        orders={orders}
        products={[productA, productB]}
        onExport={() => undefined}
        onNavigate={() => undefined}
      />,
    );

    expect(html).toContain('Top selling products');
    expect(html).toContain('src="/images/racing-edge-neon.webp"');
    expect(html).toContain('alt="Racing Edge"');
    expect(html).toContain('src="/images/apex-grid.webp"');
    expect(html).toContain('alt="Apex Grid Dual-Tone"');
    expect(html).toContain('src="/images/archived-classic.webp"');
    expect(html).toContain('alt="Classic Quilted Cover"');
    expect(html).toContain('3 sold');
    expect(html).toContain('2 sold');
    expect(html).toContain('1 sold');
  });

  it('falls back to additionalImages or color images when primary product.image is empty', () => {
    const product: Product = {
      ...PRODUCTS[0],
      id: 'prod-extra-only',
      title: 'Extra Image Cover',
      image: '',
      additionalImages: ['/images/extra-gallery.webp'],
      colors: [],
    };
    const byId = new Map([[product.id, product]]);
    const byName = new Map([[product.title.toLowerCase(), product]]);

    expect(
      resolveOrderItemProductImage(
        { product_id: product.id, product_name: product.title },
        byId,
        byName,
      ),
    ).toBe('/images/extra-gallery.webp');
  });
});
