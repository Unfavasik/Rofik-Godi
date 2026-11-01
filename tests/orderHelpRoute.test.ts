import { describe, expect, it } from 'vitest';
import { getPathForOrderHelp, requiresCustomerAuthentication, resolveAppRoute } from '../src/lib/appRoutes';

describe('order-need-help route', () => {
  it('resolves the canonical order help path', () => {
    const route = resolveAppRoute('/my-order/order/abcdefabcdefabcdefabcdefabcdef01/order-need-help');
    expect(route.kind).toBe('order-help');
    if (route.kind === 'order-help') {
      expect(route.orderSlug).toBe('abcdefabcdefabcdefabcdefabcdef01');
      expect(route.canonicalPath).toBe('/my-order/order/abcdefabcdefabcdefabcdefabcdef01/order-need-help');
      expect(route.tab).toBe('account');
    }
  });

  it('resolves the my-orders and myorder aliases', () => {
    expect(resolveAppRoute('/my-orders/order/abcdefabcdefabcdefabcdefabcdef01/order-need-help').kind).toBe('order-help');
    expect(resolveAppRoute('/myorder/order/ABCDEFABCDEFABCDEFABCDEFABCDEF01/order-need-help').kind).toBe('order-help');
  });

  it('falls back to the orders list for invalid slugs', () => {
    const route = resolveAppRoute('/my-order/order/not-a-slug/order-need-help');
    expect(route.kind).toBe('orders');
    if (route.kind === 'orders') expect(route.canonicalPath).toBe('/my-orders');
  });

  it('builds the path from a slug', () => {
    expect(getPathForOrderHelp('abcdefabcdefabcdefabcdefabcdef01')).toBe('/my-order/order/abcdefabcdefabcdefabcdefabcdef01/order-need-help');
  });

  it('requires customer authentication', () => {
    expect(requiresCustomerAuthentication('/my-order/order/abcdefabcdefabcdefabcdefabcdef01/order-need-help')).toBe(true);
  });

  it('does not treat the order detail route as order-help', () => {
    expect(resolveAppRoute('/my-order/order/abcdefabcdefabcdefabcdefabcdef01').kind).toBe('orders');
  });
});
