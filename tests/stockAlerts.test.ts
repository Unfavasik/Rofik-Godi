import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
  },
}));
vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { createMyStockAlert } from '../src/lib/supabaseStockAlerts';

const productId = 'b5cb6a19-7d7c-4a3a-b85b-5b1bb0cfe000';

describe('customer stock alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    supabaseMock.rpc.mockResolvedValue({ data: true, error: null });
  });

  it('verifies the expected authenticated user before calling the server RPC', async () => {
    const result = await createMyStockAlert(productId, 'user-1');
    expect(result).toEqual({ data: true, error: null });
    expect(supabaseMock.rpc).toHaveBeenCalledWith('create_my_stock_alert', { p_product_id: productId });
  });

  it('does not call the RPC if there is no authenticated user or the user id differs', async () => {
    supabaseMock.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const signedOut = await createMyStockAlert(productId, 'user-1');
    expect(signedOut.error?.message).toContain('Sign in');
    expect(supabaseMock.rpc).not.toHaveBeenCalled();

    supabaseMock.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'other-user' } }, error: null });
    const wrongUser = await createMyStockAlert(productId, 'user-1');
    expect(wrongUser.error?.message).toContain('Sign in');
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('returns the RPC duplicate result without creating a client-side duplicate', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await createMyStockAlert(productId, 'user-1')).toEqual({ data: false, error: null });
  });

  it('rejects non-UUID product ids before contacting Supabase', async () => {
    const result = await createMyStockAlert('legacy-id', 'user-1');
    expect(result.error?.message).toContain('cannot be added');
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});
