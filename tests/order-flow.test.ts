import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { cancelMyOrder, createSupabaseOrder, getMyOrderBySlug, issueMyStorePickupToken, listMyOrderStatusHistory } from '../src/lib/supabaseOrders';
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
  beforeEach(() => {
    vi.resetAllMocks();
    supabaseMock.functions.invoke.mockResolvedValue({ error: null });
  });

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

    expect(supabaseMock.rpc).toHaveBeenCalledWith('create_store_pickup_order_v2', expect.objectContaining({
      p_items: [{ product_id: productId, quantity: 2, color: 'Black', thickness_label: 'Standard', stitch: '', embroidery_text: '' }],
      p_coupon_code: 'SAVE10',
      p_payment_method: 'PAY_AT_STORE',
    }));
    expect(result.synced).toBe(true);
    expect(result.order).toMatchObject({ orderId: 'RGC-1001', subtotal: 950, discount: 95, total: 855, pickupToken: 'pickup-secret' });
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('send-order-confirmation', {
      body: { orderNumber: 'RGC-1001' },
    });
  });

  it('keeps a successfully created order successful when the email function fails', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    supabaseMock.rpc.mockResolvedValue({
      data: [{
        id: 'order-id', order_number: 'RGC-1001', status: 'NEW', payment_status: 'PENDING',
        subtotal: 950, discount: 95, total: 855, created_at: '2026-10-03T01:00:00.000Z', pickup_token: 'pickup-secret',
      }],
      error: null,
    });
    supabaseMock.functions.invoke.mockRejectedValue(new Error('Email provider unavailable'));

    const result = await createSupabaseOrder(order, 'customer-1');

    expect(result.synced).toBe(true);
    expect(result.order?.orderId).toBe('RGC-1001');
  });

  it('requests a pickup token only for the signed-in customer through the owner-scoped RPC', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    supabaseMock.rpc.mockResolvedValue({ data: 'one-time-pickup-token', error: null });

    const result = await issueMyStorePickupToken(' RGC-1001 ');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('issue_my_store_pickup_token', { p_order_number: 'RGC-1001' });
    expect(result).toEqual({ data: 'one-time-pickup-token', error: null });
  });

  it('does not request a pickup token when no authenticated customer is available', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await issueMyStorePickupToken('RGC-1001');

    expect(result.data).toBeNull();
    expect(result.error?.message).toMatch(/sign in/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('cancels by public order number only after the server confirms the transition', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    supabaseMock.rpc.mockResolvedValue({
      data: { order_number: 'RGC-1001', status: 'CANCELLED', cancelled_at: '2026-10-16T10:00:00.000Z' },
      error: null,
    });

    const result = await cancelMyOrder(' RGC-1001 ', 'Changed my mind');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('cancel_my_order', {
      p_order_number: 'RGC-1001',
      p_reason: 'Changed my mind',
    });
    expect(result).toEqual({
      data: { order_number: 'RGC-1001', status: 'CANCELLED', cancelled_at: '2026-10-16T10:00:00.000Z' },
      error: null,
    });
  });

  it('surfaces server-side cancellation blocks without reporting success', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'Only a new, unconfirmed order can be cancelled' } });

    const result = await cancelMyOrder('RGC-1001');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('cancel_my_order', {
      p_order_number: 'RGC-1001',
      p_reason: null,
    });
    expect(result.data).toBeNull();
    expect(result.error?.message).toMatch(/unconfirmed order/i);
  });

  it('looks up an order deep link by opaque slug and the authenticated owner, never by order number', async () => {
    const slug = '0123456789abcdef0123456789abcdef';
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: { id: 'order-id', order_slug: slug, order_number: 'RGC-1001', order_items: [] }, error: null });
    supabaseMock.from.mockReturnValue(query);

    const result = await getMyOrderBySlug('customer-1', slug);

    expect(result).toMatchObject({ id: 'order-id', order_slug: slug, order_number: 'RGC-1001' });
    expect(supabaseMock.from).toHaveBeenCalledWith('orders');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'customer-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'order_slug', slug);
    expect(query.eq).not.toHaveBeenCalledWith('order_number', expect.anything());
  });

  it('rejects malformed slugs and mismatched sessions before querying orders', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'another-customer' } }, error: null });

    expect(await getMyOrderBySlug('customer-1', 'RGC-1001')).toBeNull();
    expect(supabaseMock.auth.getUser).not.toHaveBeenCalled();
    expect(await getMyOrderBySlug('customer-1', '0123456789abcdef0123456789abcdef')).toBeNull();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('loads status timestamps from the owner-readable order history table', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [{ to_status: 'READY_FOR_PICKUP', created_at: '2026-10-16T10:00:00.000Z' }], error: null });
    supabaseMock.from.mockReturnValue(query);

    const result = await listMyOrderStatusHistory('order-id-1');

    expect(supabaseMock.from).toHaveBeenCalledWith('order_status_history');
    expect(query.select).toHaveBeenCalledWith('to_status,created_at');
    expect(query.eq).toHaveBeenCalledWith('order_id', 'order-id-1');
    expect(result).toEqual([{ to_status: 'READY_FOR_PICKUP', created_at: '2026-10-16T10:00:00.000Z' }]);
  });
});
