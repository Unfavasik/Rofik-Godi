import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
  },
}));

vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { validateCustomerCoupon } from '../src/lib/supabaseCoupons';
import type { CartItem } from '../src/types';

const item = {
  product: { id: 'product-uuid-1' },
  quantity: 3,
} as CartItem;

describe('customer coupon validation flow', () => {
  beforeEach(() => vi.resetAllMocks());

  it('does not validate for a missing or mismatched signed-in user', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'different-user' } }, error: null });

    const result = await validateCustomerCoupon('SAVE10', [item], 'expected-user');

    expect(result).toEqual({ valid: false, message: 'Sign in to apply a coupon.' });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('passes product quantities to the protected validation RPC and returns its quote', async () => {
    const quote = { valid: true, code: 'SAVE10', subtotal: 900, discount_amount: 90, final_total: 810, message: 'Coupon applied.' };
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    supabaseMock.rpc.mockResolvedValue({ data: quote, error: null });

    const result = await validateCustomerCoupon('SAVE10', [item], 'customer-1');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('validate_coupon', {
      p_code: 'SAVE10',
      p_items: [{ product_id: 'product-uuid-1', quantity: 3 }],
    });
    expect(result).toEqual(quote);
  });

  it('surfaces server-side coupon rejection without inventing a client discount', async () => {
    const quote = { valid: false, message: 'Coupon has expired.' };
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
    supabaseMock.rpc.mockResolvedValue({ data: quote, error: null });

    await expect(validateCustomerCoupon('EXPIRED', [item], 'customer-1')).resolves.toEqual(quote);
  });
});
