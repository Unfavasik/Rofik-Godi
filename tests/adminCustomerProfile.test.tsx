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
  makeOrder(
    'RGC-617795BC959A',
    'COMPLETED',
    '2026-10-14T13:29:00Z',
    [
      {
        product_id: 'seat-black',
        product_name: 'Black seat cover',
        color: 'Black',
        quantity: 1,
        unit_price: 8500,
      },
      {
        product_id: 'seat-gel',
        product_name: 'Gel comfort cover',
        color: 'Red',
        quantity: 1,
        unit_price: 97,
      },
    ],
    8500,
  ),
  makeOrder(
    'RGC-93615B25C128',
    'NEW',
    '2026-10-14T13:17:00Z',
    [{ product_id: 'seat-gel', product_name: 'Gel comfort cover', quantity: 1, unit_price: 97 }],
    97,
  ),
  makeOrder(
    'RGC-B9019F05B85E',
    'NEW',
    '2026-10-14T13:16:00Z',
    [{ product_id: 'seat-black', product_name: 'Black seat cover', quantity: 1, unit_price: 97 }],
    97,
  ),
];

const renderProfile = () =>
  renderToStaticMarkup(
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
  it('shows actual customer identity, account metrics, and the three mockup sections', () => {
    const html = renderProfile();
    expect(html).toContain('Customer profile');
    expect(html.match(/>Customer profile<\/h2>/g) || []).toHaveLength(1);
    expect(html).not.toContain('Admin / Customers');
    expect(html).not.toContain('bg-blue-100 text-blue-700');
    expect(html).not.toContain('aria-label="Customer account"');
    expect(html).toContain('Testbot');
    expect(html).toContain('hello.devasik@gmail.com');
    expect(html).toContain('9434343434');
    expect(html).toContain('₹8,694');
    expect(html).toContain('Returning');
    expect(html).toContain('Customer details');
    expect(html).toContain('Order insights');
    expect(html).toContain('Customer notes');
    expect(html).toContain('id="customer-profile-tab-orders"');
    expect(html).toContain('id="customer-profile-tab-details"');
    expect(html).toContain('id="customer-profile-tab-notes"');
    expect(html).toContain(
      'src="https://example.supabase.co/storage/v1/object/public/avatars/customer-testbot/avatar.webp"',
    );
    expect(html).toContain('alt="Testbot profile photo"');
    expect(html).toContain('TE');
  });

  it('shows matching order history with saved product images and item counts', () => {
    const html = renderProfile();
    expect(html).toContain('#RGC-617795BC959A');
    expect(html).toContain('#RGC-93615B25C128');
    expect(html).toContain('#RGC-B9019F05B85E');
    expect(html).toContain('src="/assets/black-seat.jpg"');
    expect(html).toContain('src="/assets/gel-comfort.jpg"');
    expect(html).toContain('aria-label="Open order RGC-617795BC959A"');
    expect(html.indexOf('#RGC-617795BC959A')).toBeLessThan(html.indexOf('#RGC-93615B25C128'));
  });

  it('includes categorized note entry, sorting, and an honest empty state', () => {
    const html = renderProfile();
    for (const category of ['Important', 'Delivery', 'Payment', 'Call', 'General']) {
      expect(html).toContain(category);
    }
    expect(html).toContain('Write a note to this customer');
    expect(html).toContain('Save &amp; notify');
    expect(html).toContain('New notes are sent to this customer as in-app notifications.');
    expect(html).toContain('Existing team-only notes are not sent retroactively.');
    expect(html).toContain('Sort notes');
    expect(html).toContain('No notes yet');
  });
});
