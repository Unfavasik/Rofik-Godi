import { describe, expect, it } from 'vitest';
import { canCancelCustomerOrder, canShowPickupQr, getCustomerOrderTimeline, getNotificationOrderNumber, getOrderPreviewItems, getOrderStatusLabel, isOrderComplete } from '../src/lib/orderPresentation';

describe('customer order presentation helpers', () => {
  it('shows one preview thumbnail per distinct product while retaining separate unlinked rows', () => {
    const items = [
      { product_id: 'product-1', product_name: 'Seat cover', color: null, quantity: 1, unit_price: 500 },
      { product_id: 'product-1', product_name: 'Seat cover', color: null, quantity: 2, unit_price: 500 },
      { product_id: 'product-2', product_name: 'Handle grip', color: null, quantity: 1, unit_price: 150 },
      { product_id: null, product_name: 'Custom item', color: null, quantity: 1, unit_price: 90 },
      { product_id: null, product_name: 'Custom item', color: null, quantity: 1, unit_price: 90 },
    ];
    expect(getOrderPreviewItems(items).map((item) => item.product_name)).toEqual(['Seat cover', 'Handle grip', 'Custom item', 'Custom item']);
  });

  it.each(['COMPLETED', 'PICKED_UP'])('allows invoice download when order status is %s', (status) => {
    expect(isOrderComplete(status)).toBe(true);
  });

  it.each(['NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'CANCELLED'])('does not mark %s as complete', (status) => {
    expect(isOrderComplete(status)).toBe(false);
  });

  it('shows a pickup QR only once the order is ready for pickup', () => {
    expect(canShowPickupQr('READY_FOR_PICKUP')).toBe(true);
  });

  it.each(['NEW', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'COMPLETED', 'CANCELLED'])('hides a pickup QR for %s', (status) => {
    expect(canShowPickupQr(status)).toBe(false);
  });

  it('allows cancellation only for a new order that has not been paid', () => {
    expect(canCancelCustomerOrder('NEW', 'PENDING')).toBe(true);
    expect(canCancelCustomerOrder('NEW', null)).toBe(true);
    expect(canCancelCustomerOrder('NEW', 'PAID')).toBe(false);
  });

  it.each(['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'COMPLETED', 'CANCELLED'])('blocks customer cancellation for %s orders', (status) => {
    expect(canCancelCustomerOrder(status, 'PENDING')).toBe(false);
  });

  it('uses clear human-readable labels for completed statuses', () => {
    expect(getOrderStatusLabel('COMPLETED')).toBe('Completed');
    expect(getOrderStatusLabel('PICKED_UP')).toBe('Picked up');
  });

  it('extracts the order number from received and status-update notifications', () => {
    expect(getNotificationOrderNumber('Your store-pickup order #RGC-DFDFC5D323A5 has been received.')).toBe('RGC-DFDFC5D323A5');
    expect(getNotificationOrderNumber('Order #rgc-dfdfc5d323a5 is ready for pickup.')).toBe('RGC-DFDFC5D323A5');
    expect(getNotificationOrderNumber('A coupon offer is waiting for you.')).toBeNull();
  });

  it('uses persisted status transitions and timestamps for the vertical order timeline', () => {
    const timeline = getCustomerOrderTimeline('READY_FOR_PICKUP', '2026-10-16T08:00:00.000Z', [
      { to_status: 'CONFIRMED', created_at: '2026-10-16T08:30:00.000Z' },
      { to_status: 'READY_FOR_PICKUP', created_at: '2026-10-16T10:00:00.000Z' },
    ]);
    expect(timeline.map(({ label, state }) => [label, state])).toEqual([
      ['Placed', 'complete'],
      ['Confirmed', 'complete'],
      ['Ready for pickup', 'current'],
      ['Completed', 'upcoming'],
    ]);
    expect(timeline[2].timestamp).toBe('2026-10-16T10:00:00.000Z');
  });

  it('shows cancellation as its own terminal timeline state', () => {
    const timeline = getCustomerOrderTimeline('CANCELLED', '2026-10-16T08:00:00.000Z', [
      { to_status: 'CANCELLED', created_at: '2026-10-16T08:20:00.000Z' },
    ]);
    expect(timeline.map(({ label, state }) => [label, state])).toEqual([
      ['Placed', 'complete'],
      ['Cancelled', 'current'],
    ]);
    expect(timeline[1].timestamp).toBe('2026-10-16T08:20:00.000Z');
  });
});
