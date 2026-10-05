import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { rpc: vi.fn(), functions: { invoke: vi.fn() } },
}));
vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import {
  completePickupOrderManually,
  updatePickupOrderStatus,
  verifyStorePickupToken,
} from '../src/lib/supabaseAdminOrders';

describe('manual pickup order completion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    supabaseMock.functions.invoke.mockResolvedValue({ error: null });
  });

  it('records PICKED_UP then COMPLETED with two authorized transitions when no QR is scanned', async () => {
    supabaseMock.rpc.mockResolvedValue({ error: null });

    const result = await completePickupOrderManually('#RGC-101', 'READY_FOR_PICKUP');

    expect(supabaseMock.rpc.mock.calls).toEqual([
      ['admin_update_pickup_order_status', { p_order_number: 'RGC-101', p_status: 'PICKED_UP' }],
      ['admin_update_pickup_order_status', { p_order_number: 'RGC-101', p_status: 'COMPLETED' }],
    ]);
    expect(supabaseMock.functions.invoke.mock.calls).toEqual([
      ['send-order-confirmation', { body: { type: 'order_status_update', orderNumber: 'RGC-101', event: 'COMPLETED' } }],
    ]);
    expect(result).toEqual({ error: null, partial: false });
  });

  it('completes an already picked-up order with one authorized transition', async () => {
    supabaseMock.rpc.mockResolvedValue({ error: null });

    const result = await completePickupOrderManually('RGC-102', 'PICKED_UP');

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_update_pickup_order_status', {
      p_order_number: 'RGC-102',
      p_status: 'COMPLETED',
    });
    expect(result).toEqual({ error: null, partial: false });
  });

  it('reports that pickup was recorded if the completion transition fails', async () => {
    supabaseMock.rpc
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'Temporary database error' } });

    const result = await completePickupOrderManually('RGC-103', 'READY_FOR_PICKUP');

    expect(result.error?.message).toBe('Temporary database error');
    expect(result.partial).toBe(true);
  });

  it('does not email intermediate status changes', async () => {
    supabaseMock.rpc.mockResolvedValue({ error: null });

    await updatePickupOrderStatus('#RGC-104', 'READY_FOR_PICKUP');

    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
  });

  it('requests the completion email after a valid scanned QR completes an order', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: { order_number: 'RGC-105', status: 'COMPLETED' },
      error: null,
    });

    await verifyStorePickupToken('private-one-time-token');

    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('send-order-confirmation', {
      body: { type: 'order_status_update', orderNumber: 'RGC-105', event: 'COMPLETED' },
    });
  });

  it('does not fail an admin completion if the email request fails', async () => {
    supabaseMock.rpc.mockResolvedValue({ error: null });
    supabaseMock.functions.invoke.mockRejectedValue(new Error('SMTP unavailable'));

    const result = await updatePickupOrderStatus('RGC-106', 'COMPLETED');

    expect(result.error).toBeNull();
  });
});
