import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OrderNotificationDetails } from '../src/components/OrderNotificationDetails';
import type { CustomerOrderRecord } from '../src/types';

const order: CustomerOrderRecord = {
  id: 'order-id-1',
  order_number: 'RGC-DFDFC5D323A5',
  customer_name: 'Test Customer',
  customer_phone: '+919876543210',
  payment_method: 'PAY_ONLINE',
  payment_status: 'PENDING',
  status: 'NEW',
  subtotal: 600,
  discount: 25,
  total: 575,
  vehicle_model: 'Honda Shine',
  fulfillment_method: 'STORE_PICKUP',
  pickup_store: 'ROFIK GODI CENTRE',
  pickup_note: 'Call when ready',
  created_at: '2026-10-13T09:45:00.000Z',
  order_items: [
    { product_id: 'product-1', product_name: 'Bike Seat Cover', color: 'Black Red', quantity: 1, unit_price: 450, image_url: 'https://example.com/seat.webp' },
    { product_id: 'product-2', product_name: 'Neck Cushion', color: 'Black', quantity: 1, unit_price: 150, image_url: 'https://example.com/cushion.webp' },
  ],
};

const renderDetails = (record: CustomerOrderRecord) => renderToStaticMarkup(
  <OrderNotificationDetails userId="customer-id" orderNumber={record.order_number} initialOrder={record} onBack={() => {}} />,
);

describe('order notification details screen', () => {
  it('renders order tracking, store contact, product images, payment and order information', () => {
    const html = renderDetails(order);
    for (const content of [
      'Order Details', order.order_number, 'Order received', 'Confirmed', 'Ready for pickup', 'Picked up',
      'Pickup from store', 'ROFIK GODI CENTRE', 'Jalangi Road', '8:00 AM', '+91 98321 45678',
      'Items (2)', 'Bike Seat Cover', 'Neck Cushion', 'https://example.com/seat.webp', 'Payment details',
      'UPI online', 'Payment pending', '₹600', '₹25', '₹575', 'Order information', 'Honda Shine',
      'Track order', 'Need help?', 'Contact store',
    ]) expect(html).toContain(content);
  });

  it('uses the live cancellation state instead of showing an active progress path', () => {
    const html = renderDetails({ ...order, status: 'CANCELLED' });
    expect(html).toContain('Order cancelled');
    expect(html).not.toContain('grid-cols-4');
  });
});
