import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CustomerOrdersModal, OrderDetails } from '../src/components/CustomerOrdersModal';
import type { CustomerOrderRecord } from '../src/types';

const makeOrder = (status: string, paymentStatus = 'PENDING'): CustomerOrderRecord => ({
  id: 'order-1',
  order_number: 'RGC-DFDFC5D323A5',
  customer_name: 'Test Customer',
  customer_phone: '+919876543210',
  payment_method: 'PAY_ONLINE',
  payment_status: paymentStatus,
  status,
  subtotal: 600,
  discount: 25,
  total: 575,
  vehicle_model: 'Honda Shine',
  fulfillment_method: 'STORE_PICKUP',
  pickup_store: 'ROFIK GODI CENTRE',
  pickup_note: null,
  created_at: '2026-10-13T09:45:00.000Z',
  order_items: [
    { product_id: 'product-1', product_name: 'Bike Seat Cover', color: 'Black Red', quantity: 1, unit_price: 450, image_url: 'https://example.com/seat.webp' },
  ],
});

const renderOrderDetails = (order: CustomerOrderRecord, onBuyAgain?: (order: CustomerOrderRecord) => Promise<{ addedCount: number; skippedItems: string[]; error?: string }>) => renderToStaticMarkup(
  <OrderDetails order={order} customerName="Test Customer" reviews={[]} onInvoice={() => {}} onReview={() => {}} onBuyAgain={onBuyAgain} />,
);

const renderOrdersModal = () => renderToStaticMarkup(
  <CustomerOrdersModal orders={[]} reviews={[]} loading={false} customerName="Test Customer" onClose={() => {}} onReview={() => {}} />,
);

describe('My Orders details', () => {
  it('keeps the pickup-orders label but removes store branding from the top bar', () => {
    const html = renderOrdersModal();
    expect(html).toContain('Pickup orders');
    expect(html).toContain('Your orders');
    expect(html).not.toContain('Rofik Godi Centre');
  });

  it('uses the notification-style details layout and shows the pickup QR when ready', () => {
    const html = renderOrderDetails(makeOrder('READY_FOR_PICKUP'));
    for (const text of ['RGC-DFDFC5D323A5', 'Order progress', 'Ready for pickup', 'Pickup QR code', 'Pickup from store', 'ROFIK GODI CENTRE', 'Bike Seat Cover', 'Payment details', 'Order information', 'Track order', 'Need help?', 'Contact store']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('https://example.com/seat.webp');
  });

  it.each(['NEW', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'COMPLETED', 'CANCELLED'])('does not show the pickup QR before the order is ready (%s)', (status) => {
    expect(renderOrderDetails(makeOrder(status))).not.toContain('Pickup QR code');
  });

  it('offers cancellation for a new unpaid order', () => {
    expect(renderOrderDetails(makeOrder('NEW'))).toContain('Cancel order');
  });

  it('does not offer cancellation for a paid new order', () => {
    expect(renderOrderDetails(makeOrder('NEW', 'PAID'))).not.toContain('Cancel order');
  });

  it('does not show pending or due payment for a cancelled unpaid order', () => {
    const html = renderOrderDetails(makeOrder('CANCELLED', 'PENDING'));
    expect(html).toContain('Not paid — order cancelled');
    expect(html).toContain('Not applicable — order cancelled');
    expect(html).toContain('Cancelled order total');
    expect(html).not.toContain('Payment pending');
    expect(html).not.toContain('Due at pickup');
    expect(html).not.toContain('Total due');
  });

  it('keeps actual confirmed payment visible if a paid order is cancelled', () => {
    const html = renderOrderDetails(makeOrder('CANCELLED', 'PAID'));
    expect(html).toContain('Payment confirmed');
    expect(html).toContain('Paid');
    expect(html).toContain('Total paid');
  });

  it.each(['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'COMPLETED', 'CANCELLED'])('does not offer cancellation once an order is %s', (status) => {
    expect(renderOrderDetails(makeOrder(status))).not.toContain('Cancel order');
  });

  it('offers Buy again only for completed orders when the reorder handler is available', () => {
    const onBuyAgain = async () => ({ addedCount: 1, skippedItems: [] });
    expect(renderOrderDetails(makeOrder('COMPLETED'), onBuyAgain)).toContain('Buy again');
    expect(renderOrderDetails(makeOrder('NEW'), onBuyAgain)).not.toContain('Buy again');
    expect(renderOrderDetails(makeOrder('CANCELLED'), onBuyAgain)).not.toContain('Buy again');
    expect(renderOrderDetails(makeOrder('COMPLETED'))).not.toContain('Buy again');
  });
});
