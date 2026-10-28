import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminOrderDetails } from '../src/components/AdminOrderDetails';
import type { AdminOrderRecord } from '../src/lib/supabaseAdminOrders';

const order: AdminOrderRecord = {
  id: '#RGC-7D524366243E',
  userId: 'customer-1',
  orderNumber: 'RGC-7D524366243E',
  customer: 'ROFIK GODI CENTRE',
  phone: '82829929298',
  initials: 'RG',
  product: 'Seat cover',
  amount: 597,
  subtotal: 600,
  discount: 3,
  paymentMethod: 'PAY_AT_STORE',
  paymentStatus: 'PAID',
  status: 'PICKED_UP',
  date: '5 Oct 2026, 3:30 pm',
  channel: 'STORE_PICKUP',
  vehicleType: 'Bike',
  vehicleCompany: 'Hero MotoCorp',
  vehicleModel: '8eiu3u3u3u3u',
  vehicleImage: '/vehicle-models/hero-hf-deluxe.webp',
  pickupStore: 'ROFIK GODI CENTRE',
  pickupNote: 'Call before arrival.',
  pickedUpAt: '2026-10-05T10:00:00Z',
  completedAt: null,
  statusHistory: [
    { id: 'history-1', from_status: 'READY_FOR_PICKUP', to_status: 'PICKED_UP', note: 'Order status updated', created_at: '2026-10-05T10:00:00Z' },
  ],
  items: [{ product_id: 'catalog-item-1', product_name: 'Seat cover', color: 'Black', quantity: 1, unit_price: 597 }],
  createdAt: '2026-10-05T09:30:00Z',
};

const renderDetails = (record: AdminOrderRecord) => renderToStaticMarkup(
  <AdminOrderDetails order={record} products={[]} onClose={() => {}} onChanged={() => {}} notify={() => {}} />,
);

describe('admin order details drawer', () => {
  it('renders the responsive detail navigation, real order data, product and payment summary', () => {
    const html = renderDetails(order);
    for (const label of ['Order Details', order.id, 'Overview', 'Products', 'Timeline', 'Notes', 'Customer', order.customer, order.phone, order.vehicleCompany, order.vehicleModel, order.vehicleImage, order.pickupStore, '₹597', 'Seat cover', 'Payment summary']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Order has been picked up');
    expect(html).toContain('Mark Completed');
    expect(html).toContain('Invoice / Print');
  });

  it('shows the terminal completed state and invoice action without another completion action', () => {
    const html = renderDetails({ ...order, status: 'COMPLETED', completedAt: '2026-10-05T10:15:00Z' });
    expect(html).toContain('Order completed');
    expect(html.match(/Order completed/g)).toHaveLength(1);
    expect(html).toContain('Invoice ready');
    expect(html).toContain('Order ID');
    expect(html).toContain(`#${order.orderNumber}`);
    expect(html).not.toContain('Rofik Godi Centre · Order');
    expect(html).toContain('Open invoice');
    expect(html).not.toContain('Mark Completed');
  });

  it('offers payment verification only for a pending payment', () => {
    expect(renderDetails({ ...order, paymentStatus: 'PENDING' })).toContain('Verify Payment');
    expect(renderDetails(order)).not.toContain('Verify Payment');
  });
});
