import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OrderNotificationDetails } from '../src/components/OrderNotificationDetails';
import type { CustomerOrderRecord } from '../src/types';

const order: CustomerOrderRecord = {
  id: 'order-id-1',
  order_number: 'RGC-DFDFC5D323A5',
  order_slug: '0123456789abcdef0123456789abcdef',
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
  <OrderNotificationDetails userId="customer-id" orderNumber={record.order_number} initialOrder={record} notificationTitle="Your order is being prepared" notificationBody="The store has started preparing your order." onBack={() => {}} onOpenMyOrders={() => {}} />,
);

describe('order notification details screen', () => {
  it('matches the order-update mockup while using all live order details', () => {
    const html = renderDetails(order);
    for (const content of [
      'Order update', order.order_number, 'Latest order update', 'Your order is being prepared',
      'The store has started preparing your order.', 'Progress', 'Step 1 of 4', 'Received',
      'Confirmed', 'Ready', 'Picked up', '2 items', '₹575', 'Order summary', '2 products',
      'Bike Seat Cover', 'Neck Cushion', '₹450', '₹150', 'Black Red', 'Kadbeltal, Petrol Pump More',
      'Open My Orders',
    ]) expect(html).toContain(content);
    expect(html).toContain(`aria-label="Open order ${order.order_number} details in My Orders"`);
    expect(html).not.toContain('Payment details');
    expect(html).not.toContain('Order information');
  });

  it('shows completed status as the final progress step and still opens the selected order', () => {
    const completedOrder = { ...order, status: 'COMPLETED' };
    const html = renderDetails(completedOrder);
    expect(html).toContain('Completed');
    expect(html).toContain('Step 4 of 4');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain(`aria-label="Open order ${order.order_number} details in My Orders"`);
  });

  it('uses the live cancellation state instead of showing an active progress path', () => {
    const html = renderDetails({ ...order, status: 'CANCELLED' });
    expect(html).toContain('Cancelled');
    expect(html).not.toContain('aria-label="Order progress"');
  });
});
