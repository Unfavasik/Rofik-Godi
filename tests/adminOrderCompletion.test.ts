import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { rpc: vi.fn() } }));
vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { completePickupOrderManually } from '../src/lib/supabaseAdminOrders';

describe('manual pickup order completion', () => {
  beforeEach(() => vi.resetAllMocks());

  it('records PICKED_UP then COMPLETED with two authorized transitions when no QR is scanned', async () => {
    supabaseMock.rpc.mockResolvedValue({ error: null });

    const result = await completePickupOrderManually('#RGC-101', 'READY_FOR_PICKUP');

    expect(supabaseMock.rpc.mock.calls).toEqual([
      ['admin_update_pickup_order_status', { p_order_number: 'RGC-101', p_status: 'PICKED_UP' }],
      ['admin_update_pickup_order_status', { p_order_number: 'RGC-101', p_status: 'COMPLETED' }],
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
});
