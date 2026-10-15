import { describe, expect, it } from 'vitest';
import { getPathForPhase, getPathForTab, resolveAppRoute, shouldRedirectAdminToWorkspace } from '../src/lib/appRoutes';

describe('main route preservation', () => {
  it.each([
    '/home', '/shop', '/profile', '/account', '/search', '/wishlist', '/cart',
    '/notifications', '/notification', '/custom', '/checkout', '/my-orders',
    '/my-orders/RGC-ABC123', '/products/premium-bike-seat-cover', '/settings',
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

  it('resolves stable product slugs and canonicalizes singular paths', () => {
    expect(resolveAppRoute('/product/premium-bike-seat-cover')).toMatchObject({ kind: 'product', slug: 'premium-bike-seat-cover', canonicalPath: '/products/premium-bike-seat-cover' });
    expect(getPathForPhase('main', '/product/premium-bike-seat-cover')).toBe('/products/premium-bike-seat-cover');
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
  it('allows an admin to return to the storefront after choosing that action', () => {
    expect(shouldRedirectAdminToWorkspace('/home', true)).toBe(false);
    expect(shouldRedirectAdminToWorkspace('/shop', true)).toBe(false);
  });

  it('still routes an admin into the workspace by default', () => {
    expect(shouldRedirectAdminToWorkspace('/home', false)).toBe(true);
    expect(shouldRedirectAdminToWorkspace('/admin', false)).toBe(false);
  });
});
