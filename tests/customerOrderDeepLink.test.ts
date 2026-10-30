import { describe, expect, it } from 'vitest';
import { getCustomerOrderDeepLinkLookupKey } from '../src/lib/customerOrderDeepLink';

describe('customer order deep-link lookup identity', () => {
  const slug = '0123456789abcdef0123456789abcdef';

  it('does not treat a guest-session lookup as handled for the authenticated customer', () => {
    expect(getCustomerOrderDeepLinkLookupKey('guest-session', slug)).not.toBe(
      getCustomerOrderDeepLinkLookupKey('authenticated-user', slug),
    );
  });

  it('normalizes the slug while keeping the lookup owner in the key', () => {
    expect(getCustomerOrderDeepLinkLookupKey('customer-1', slug.toUpperCase())).toBe(
      getCustomerOrderDeepLinkLookupKey('customer-1', slug),
    );
    expect(getCustomerOrderDeepLinkLookupKey('customer-2', slug)).not.toBe(
      getCustomerOrderDeepLinkLookupKey('customer-1', slug),
    );
  });

  it('does not create a handled key until both the user and order slug are available', () => {
    expect(getCustomerOrderDeepLinkLookupKey('', slug)).toBeNull();
    expect(getCustomerOrderDeepLinkLookupKey('customer-1', null)).toBeNull();
  });
});
