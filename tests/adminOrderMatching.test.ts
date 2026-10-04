import { describe, expect, it } from 'vitest';
import { matchesAdminOrderToCustomer } from '../src/lib/supabaseAdminOrders';

const customer = { id: 'customer-1', name: 'Casey Rider', phone: '555-0101' };

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
});
