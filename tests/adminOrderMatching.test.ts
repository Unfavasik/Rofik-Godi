import { describe, expect, it } from 'vitest';
import {
  getAdminOrderTimelineEvents,
  getNextPickupOrderStatus,
  matchesAdminOrderSearch,
  matchesAdminOrderToCustomer,
  type AdminOrderRecord,
} from '../src/lib/supabaseAdminOrders';

const customer = { id: 'customer-1', name: 'Casey Rider', phone: '555-0101' };
const order: AdminOrderRecord = {
  id: '#RGC-101', userId: 'customer-1', orderNumber: 'RGC-101', customer: 'Casey Rider', phone: '555-0101',
  initials: 'CR', product: 'Seat cover', amount: 900, subtotal: 1000, discount: 100, paymentMethod: 'PAY_AT_STORE',
  paymentStatus: 'PENDING', status: 'READY_FOR_PICKUP', date: '5 Oct 2026', channel: 'STORE_PICKUP',
  vehicleModel: 'Hero Splendor', pickupStore: 'Main store', items: [{ product_name: 'Red seat cushion', quantity: 1, unit_price: 900 }],
  pickupNote: 'Please call on arrival.', pickedUpAt: null, completedAt: null, statusHistory: [], createdAt: '2026-10-05T10:00:00Z',
};

describe('admin customer order history matching', () => {
  it('matches by the stable account ID even when order name and phone differ', () => {
    expect(
      matchesAdminOrderToCustomer(
        { userId: 'customer-1', customer: 'Checkout name', phone: '555-9999' },
        customer,
      ),
    ).toBe(true);
  });

  it('does not match a different account by coincidentally equal name or phone', () => {
    expect(
      matchesAdminOrderToCustomer(
        { userId: 'another-customer', customer: 'Casey Rider', phone: '555-0101' },
        customer,
      ),
    ).toBe(false);
  });

  it('falls back to phone for older orders without a user ID', () => {
    expect(
      matchesAdminOrderToCustomer(
        { userId: '', customer: 'Checkout name', phone: '555-0101' },
        customer,
      ),
    ).toBe(true);
  });

  it('falls back to name for guest orders without a user ID or phone', () => {
    expect(
      matchesAdminOrderToCustomer({ userId: '', customer: 'Casey Rider', phone: '' }, customer),
    ).toBe(true);
  });

  it('searches order IDs, customer contacts, vehicle and every line item case-insensitively', () => {
    expect(matchesAdminOrderSearch(order, 'rgc-101')).toBe(true);
    expect(matchesAdminOrderSearch(order, '555-0101')).toBe(true);
    expect(matchesAdminOrderSearch(order, 'hero splendor')).toBe(true);
    expect(matchesAdminOrderSearch(order, 'red seat cushion')).toBe(true);
    expect(matchesAdminOrderSearch(order, 'not a match')).toBe(false);
    expect(matchesAdminOrderSearch(order, '   ')).toBe(true);
  });

  it('offers only the next valid fulfillment step and stops after completion', () => {
    expect(getNextPickupOrderStatus('NEW')).toBe('CONFIRMED');
    expect(getNextPickupOrderStatus('READY_FOR_PICKUP')).toBe('PICKED_UP');
    expect(getNextPickupOrderStatus('PICKED_UP')).toBe('COMPLETED');
    expect(getNextPickupOrderStatus('COMPLETED')).toBeNull();
    expect(getNextPickupOrderStatus('CANCELLED')).toBeNull();
  });

  it('shows only order-created and recorded status timestamps in the timeline', () => {
    const currentOrder = {
      ...order,
      status: 'PICKED_UP' as const,
      pickedUpAt: '2026-10-05T11:00:00Z',
      statusHistory: [
        { id: 'history-2', from_status: 'CONFIRMED', to_status: 'PICKED_UP', note: 'Verified pickup', created_at: '2026-10-05T11:00:00Z' },
        { id: 'history-1', from_status: 'NEW', to_status: 'CONFIRMED', note: null, created_at: '2026-10-05T10:15:00Z' },
      ],
    };
    const events = getAdminOrderTimelineEvents(currentOrder);
    expect(events.map((event) => event.status)).toEqual(['NEW', 'CONFIRMED', 'PICKED_UP']);
    expect(events.map((event) => event.createdAt)).toEqual([
      '2026-10-05T10:00:00Z',
      '2026-10-05T10:15:00Z',
      '2026-10-05T11:00:00Z',
    ]);
    expect(events[2]?.note).toBe('Verified pickup');
  });

  it('does not infer missing intermediate statuses or dates', () => {
    expect(getAdminOrderTimelineEvents(order)).toEqual([
      { id: 'placed-#RGC-101', status: 'NEW', createdAt: '2026-10-05T10:00:00Z', note: null, kind: 'placed' },
    ]);
  });
});
