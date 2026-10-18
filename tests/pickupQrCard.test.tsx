import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CustomerOrderRecord } from '../src/types';
import { PickupQrCard } from '../src/components/PickupQrCard';

const makeOrder = (status: string) => ({
  id: 'order-1',
  order_number: 'RGC-1001',
  order_slug: '0123456789abcdef0123456789abcdef',
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

const renderCard = (status: string) => renderToStaticMarkup(<PickupQrCard order={makeOrder(status)} />);

describe('My Orders pickup QR card', () => {
  it('shows the compact pickup QR section only when an order is ready', () => {
    const markup = renderCard('READY_FOR_PICKUP');

    expect(markup).toContain('Pickup QR code');
    expect(markup).toContain('Show this code to the admin');
  });

  it.each(['NEW', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'COMPLETED', 'CANCELLED'])('hides the pickup QR for %s orders', (status) => {
    expect(renderCard(status)).not.toContain('Pickup QR code');
  });
});
