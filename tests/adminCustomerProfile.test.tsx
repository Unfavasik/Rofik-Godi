import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminCustomerProfile } from '../src/components/AdminCustomerProfile';
import type { AdminCustomer } from '../src/lib/supabaseAdmin';
import type { AdminOrderRecord } from '../src/lib/supabaseAdminOrders';
import { PRODUCTS } from '../src/data/products';

const customer: AdminCustomer = {
  id: 'customer-testbot',
  name: 'Testbot',
  email: 'hello.devasik@gmail.com',
  phone: '9434343434',
  orderCount: 3,
  totalSpent: 8694,
  lastOrder: '2026-10-14T18:59:00+05:30',
  createdAt: '2026-10-14T18:16:00+05:30',
  status: 'Returning',
};

const products = [
  { ...PRODUCTS[0]!, id: 'seat-black', title: 'Black seat cover', image: '/assets/black-seat.jpg' },
  { ...PRODUCTS[0]!, id: 'seat-gel', title: 'Gel comfort cover', image: '/assets/gel-comfort.jpg' },
];

const makeOrder = (
  orderNumber: string,
  status: AdminOrderRecord['status'],
  createdAt: string,
  items: AdminOrderRecord['items'],
  amount: number,
): AdminOrderRecord => ({
  id: `#${orderNumber}`,
  userId: customer.id,
  orderNumber,
  customer: customer.name,
  phone: customer.phone,
  initials: 'TE',
  product: items[0]?.product_name || 'Multiple products',
  amount,
  subtotal: amount,
  discount: 0,
  paymentMethod: 'PAY_AT_STORE',
  paymentStatus: 'PENDING',
  status,
  date: createdAt,
  channel: 'STORE_PICKUP',
  vehicleModel: 'Bike',
  pickupStore: 'Rofik Godi Centre',
  pickupNote: '',
  pickedUpAt: null,
  completedAt: null,
  statusHistory: [],
  items,
  createdAt,
});

const orders = [
  makeOrder('RGC-617795BC959A', 'COMPLETED', '2026-10-14T13:29:00Z', [
    { product_id: 'seat-black', product_name: 'Black seat cover', color: 'Black', quantity: 1, unit_price: 8500 },
    { product_id: 'seat-gel', product_name: 'Gel comfort cover', color: 'Red', quantity: 1, unit_price: 97 },
  ], 8500),
  makeOrder('RGC-93615B25C128', 'NEW', '2026-10-14T13:17:00Z', [
    { product_id: 'seat-gel', product_name: 'Gel comfort cover', quantity: 1, unit_price: 97 },
  ], 97),
  makeOrder('RGC-B9019F05B85E', 'NEW', '2026-10-14T13:16:00Z', [
    { product_id: 'seat-black', product_name: 'Black seat cover', quantity: 1, unit_price: 97 },
  ], 97),
];

const renderProfile = () => renderToStaticMarkup(
  <AdminCustomerProfile
    customer={customer}
    customerId={customer.id}
    avatarUrl="https://example.supabase.co/storage/v1/object/public/avatars/customer-testbot/avatar.webp"
    orders={orders}
    products={products}
    isLoading={false}
    onBack={() => {}}
    onOpenOrder={() => {}}
  />,
);

describe('admin customer profile', () => {
  it('presents live customer fields and account metrics in a full profile view', () => {
    const html = renderProfile();
    expect(html).toContain('Testbot');
    expect(html).toContain('hello.devasik@gmail.com');
    expect(html).toContain('9434343434');
    expect(html).toContain('₹8,694');
    expect(html).toContain('Returning');
    expect(html).toContain('Recent order history');
    expect(html).toContain('Matched from the latest 100 orders by account, phone or name.');
    expect(html).toContain('src="https://example.supabase.co/storage/v1/object/public/avatars/customer-testbot/avatar.webp"');
    expect(html).toContain('alt="Testbot profile photo"');
    expect(html).toContain('TE');
  });

  it('shows recent matching orders and every saved item image', () => {
    const html = renderProfile();
    expect(html).toContain('#RGC-617795BC959A');
    expect(html).toContain('#RGC-93615B25C128');
    expect(html).toContain('#RGC-B9019F05B85E');
    expect(html).toContain('src="/assets/black-seat.jpg"');
    expect(html).toContain('src="/assets/gel-comfort.jpg"');
    expect(html.indexOf('#RGC-617795BC959A')).toBeLessThan(html.indexOf('#RGC-93615B25C128'));
  });
});
