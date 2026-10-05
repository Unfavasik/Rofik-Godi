import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CustomerOrderRecord } from '../src/types';
import { CustomerOrderDetails } from '../src/components/CustomerOrderDetails';

const makeOrder = (status: string) => ({
  id: 'order-1',
  order_number: 'RGC-1001',
  customer_name: 'Rofik Godi Centre',
  customer_phone: '9876543210',
  payment_method: 'cash',
  payment_status: 'PENDING',
  status,
  subtotal: 597,
  discount: 0,
  total: 597,
  vehicle_model: 'Scooter',
  fulfillment_method: 'STORE_PICKUP',
  pickup_store: 'Rofik Godi Centre',
  pickup_note: null,
  created_at: '2026-10-05T10:00:00.000Z',
  order_items: [],
}) as CustomerOrderRecord;

const renderDetails = (status: string, pickupToken: string | null = 'one-time-secret-token') => renderToStaticMarkup(
  <CustomerOrderDetails
    order={makeOrder(status)}
    customerName="Rofik Godi Centre"
    reviews={[]}
    pickupToken={pickupToken}
    pickupTokenLoading={false}
    pickupTokenError=""
    onRetryPickupToken={() => undefined}
    onInvoice={() => undefined}
    onReview={() => undefined}
  />,
);

describe('customer My Orders detail QR visibility', () => {
  it('shows the secure pickup QR for an order awaiting pickup', () => {
    const markup = renderDetails('READY_FOR_PICKUP');

    expect(markup).toContain('Pickup QR code');
    expect(markup).toContain('one-time-secret-token');
  });

  it.each(['PICKED_UP', 'COMPLETED', 'CANCELLED'])('hides the pickup QR after %s', (status) => {
    const markup = renderDetails(status);

    expect(markup).not.toContain('Pickup QR code');
    expect(markup).not.toContain('one-time-secret-token');
  });

  it('keeps the customer invoice available after the order is completed', () => {
    const markup = renderDetails('COMPLETED', null);

    expect(markup).toContain('Order completed');
    expect(markup).toContain('Invoice / Print');
  });
});
