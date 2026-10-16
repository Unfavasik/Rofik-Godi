import { describe, expect, it } from 'vitest';
import { getAdminCustomerIdFromPath, getAdminSectionFromPath, getPathForAdminCustomer, getPathForAdminSection, getPathForPhase, getPathForProduct, getPathForTab, isAdminPath, resolveAppRoute, shouldRedirectAdminToWorkspace } from '../src/lib/appRoutes';

describe('main route preservation', () => {
  it.each([
    '/home', '/shop', '/profile', '/account', '/search', '/wishlist', '/cart',
    '/notifications', '/notification', '/custom', '/checkout', '/my-orders',
    '/my-orders/RGC-ABC123', '/shop/products/premium-bike-seat-cover', '/settings',
    '/privacy-policy', '/terms-and-conditions', '/store',
  ])('keeps %s when entering the main phase', (path) => {
    expect(getPathForPhase('main', path)).toBe(path === '/account' ? '/profile' : path === '/notification' ? '/notifications' : path);
  });

  it('falls back to home when entering main from an auth or onboarding route', () => {
    expect(getPathForPhase('main', '/signup')).toBe('/home');
    expect(getPathForPhase('main', '/Onboarding')).toBe('/home');
  });

  it('normalizes a trailing slash while preserving a valid main route', () => {
    expect(getPathForPhase('main', '/profile/')).toBe('/profile');
  });

  it('canonicalizes the home aliases and tab URLs', () => {
    expect(resolveAppRoute('/').canonicalPath).toBe('/home');
    expect(resolveAppRoute('/example/shop').canonicalPath).toBe('/home');
    expect(getPathForTab('account')).toBe('/profile');
    expect(getPathForTab('notifications')).toBe('/notifications');
  });

  it('uses a real checkout page route', () => {
    expect(resolveAppRoute('/checkout')).toMatchObject({ kind: 'checkout', tab: 'cart' });
  });

  it('supports the canonical My Orders route and older spellings', () => {
    expect(resolveAppRoute('/my-orders')).toMatchObject({ kind: 'orders', tab: 'account', orderNumber: null });
    expect(resolveAppRoute('/myorder').canonicalPath).toBe('/my-orders');
    expect(resolveAppRoute('/myorder/RGC-ABC123')).toMatchObject({ kind: 'orders', orderNumber: 'RGC-ABC123', canonicalPath: '/my-orders/RGC-ABC123' });
  });

  it('uses /shop/products/:slug as the canonical product route and normalizes legacy paths', () => {
    expect(resolveAppRoute('/shop/products/premium-bike-seat-cover')).toMatchObject({ kind: 'product', tab: 'shop', slug: 'premium-bike-seat-cover', canonicalPath: '/shop/products/premium-bike-seat-cover' });
    expect(resolveAppRoute('/products/premium-bike-seat-cover').canonicalPath).toBe('/shop/products/premium-bike-seat-cover');
    expect(resolveAppRoute('/product/premium-bike-seat-cover').canonicalPath).toBe('/shop/products/premium-bike-seat-cover');
    expect(getPathForPhase('main', '/product/premium-bike-seat-cover')).toBe('/shop/products/premium-bike-seat-cover');
    expect(getPathForProduct('Premium Bike Cover')).toBe('/shop/products/Premium%20Bike%20Cover');
  });

  it('preserves an order-specific route when entering the main phase', () => {
    expect(getPathForPhase('main', '/my-orders/RGC-ABC123')).toBe('/my-orders/RGC-ABC123');
  });

  it.each([
    ['/settings', 'settings'],
    ['/privacy-policy', 'privacy'],
    ['/terms-and-conditions', 'terms'],
    ['/store', 'store'],
  ])('resolves the %s page', (path, kind) => {
    expect(resolveAppRoute(path).kind).toBe(kind);
  });
});

describe('admin workspace redirect policy', () => {
  it.each([
    ['/admin', 'overview'],
    ['/admin/orders', 'orders'],
    ['/admin/products', 'products'],
    ['/admin/categories', 'categories'],
    ['/admin/customers', 'customers'],
    ['/admin/reviews', 'reviews'],
    ['/admin/coupons', 'marketing'],
    ['/admin/banners', 'banners'],
    ['/admin/notifications', 'notifications'],
    ['/admin/activity', 'activity'],
    ['/admin/reports', 'reports'],
    ['/admin/settings', 'settings'],
  ] as const)('resolves admin URL %s to section %s', (path, section) => {
    expect(getAdminSectionFromPath(path)).toBe(section);
    expect(resolveAppRoute(path)).toMatchObject({ kind: 'admin', section, canonicalPath: getPathForAdminSection(section) });
    expect(getPathForPhase('main', path)).toBe(getPathForAdminSection(section));
  });

  it('resolves a customer profile as a direct, canonical admin route', () => {
    const customerId = '3e467a80-bdb6-421f-8a16-c04d4e0f7a88';
    const path = getPathForAdminCustomer(customerId);
    expect(path).toBe(`/admin/customers/${customerId}`);
    expect(getAdminCustomerIdFromPath(path)).toBe(customerId);
    expect(getAdminSectionFromPath(path)).toBe('customers');
    expect(resolveAppRoute(path)).toMatchObject({
      kind: 'admin-customer',
      tab: 'home',
      customerId,
      canonicalPath: path,
    });
    expect(getPathForPhase('main', path)).toBe(path);
    expect(isAdminPath(path)).toBe(true);
  });

  it('canonicalizes admin aliases and identifies nested admin paths', () => {
    expect(resolveAppRoute('/admin/dashboard').canonicalPath).toBe('/admin');
    expect(resolveAppRoute('/admin/marketing').canonicalPath).toBe('/admin/coupons');
    expect(isAdminPath('/admin/products')).toBe(true);
    expect(isAdminPath('/administrator')).toBe(false);
    expect(shouldRedirectAdminToWorkspace('/admin/products', false)).toBe(false);
  });

  it('allows an admin to return to the storefront after choosing that action', () => {
    expect(shouldRedirectAdminToWorkspace('/home', true)).toBe(false);
    expect(shouldRedirectAdminToWorkspace('/shop', true)).toBe(false);
  });

  it('still routes an admin into the workspace by default', () => {
    expect(shouldRedirectAdminToWorkspace('/home', false)).toBe(true);
    expect(shouldRedirectAdminToWorkspace('/admin', false)).toBe(false);
  });
});
