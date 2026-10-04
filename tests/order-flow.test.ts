import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
  },
}));

vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { createSupabaseOrder } from '../src/lib/supabaseOrders';
import type { CartItem, OrderDetails } from '../src/types';

const productId = '123e4567-e89b-42d3-a456-426614174000';
const cartItem: CartItem = {
  cartItemId: 'item-1',
  product: { id: productId, title: 'Seat cover' } as CartItem['product'],
  quantity: 2,
  selectedColor: { name: 'Black', hex: '#111111' },
  unitPrice: 500,
};
const order: OrderDetails = {
  orderId: '', items: [cartItem], subtotal: 1000, discount: 100, total: 900,
  customerName: 'Rider', phone: '9876543210', vehicleModel: 'Bike', paymentMethod: 'pay_at_store',
  paymentStatus: 'pending', fulfillmentMethod: 'STORE_PICKUP', pickupStore: 'Store', status: 'NEW',
  createdAt: '2026-10-03T00:00:00.000Z',
};

describe('secure order creation flow', () => {
  beforeEach(() => vi.resetAllMocks());

  it('blocks an order when the current session does not match the customer', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'other-user' } }, error: null });

    const result = await createSupabaseOrder(order, 'expected-user', 'SAVE10');

    expect(result.synced).toBe(false);
    expect(result.error?.message).toMatch(/session is unavailable/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('rejects products outside the synced UUID catalog before calling the order RPC', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    const unsyncedOrder = { ...order, items: [{ ...cartItem, product: { ...cartItem.product, id: 'local-product' } }] };

    const result = await createSupabaseOrder(unsyncedOrder, 'customer-1');

    expect(result.synced).toBe(false);
    expect(result.error?.message).toMatch(/not synced/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('shows a clear already-used message if the coupon limit is reached at order submission', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: { message: 'You have reached this coupon’s per-customer limit.' },
    });

    const result = await createSupabaseOrder(order, 'customer-1', 'WELCOME10');

    expect(result.synced).toBe(false);
    expect(result.error?.message).toBe("You've already used this coupon.");
  });

  it('submits canonical product quantities and uses totals returned by the secure transaction', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    supabaseMock.rpc.mockResolvedValue({
      data: [{
        id: 'order-id', order_number: 'RGC-1001', status: 'NEW', payment_status: 'PENDING',
        subtotal: 950, discount: 95, total: 855, created_at: '2026-10-03T01:00:00.000Z', pickup_token: 'pickup-secret',
      }],
      error: null,
    });

    const result = await createSupabaseOrder(order, 'customer-1', ' save10 ');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('create_store_pickup_order', expect.objectContaining({
      p_items: [{ product_id: productId, quantity: 2, color: 'Black' }],
      p_coupon_code: 'SAVE10',
      p_payment_method: 'PAY_AT_STORE',
    }));
    expect(result.synced).toBe(true);
    expect(result.order).toMatchObject({ orderId: 'RGC-1001', subtotal: 950, discount: 95, total: 855, pickupToken: 'pickup-secret' });
  });
});
