import { describe, expect, it } from 'vitest';
import { getAdminCustomerIdFromPath, getAdminOrderIdFromPath, getAdminSectionFromPath, getPathForAdminCustomer, getPathForAdminOrder, getPathForAdminSection, getPathForCustomerOrder, getPathForPhase, getPathForProduct, getPathForSettingsSection, getPathForTab, isAdminPath, requiresCustomerAuthentication, resolveAppRoute, shouldRedirectAdminToWorkspace } from '../src/lib/appRoutes';

describe('main route preservation', () => {
  it.each([
    '/home', '/shop', '/profile', '/profile/edit', '/account', '/search', '/wishlist', '/cart',
    '/notifications', '/notification', '/custom', '/checkout', '/my-orders',
    '/my-order/order/0123456789abcdef0123456789abcdef', '/shop/products/premium-bike-seat-cover', '/settings', '/support',
    '/privacy-policy', '/terms-and-conditions', '/store-map',
  ])('keeps %s when entering the main phase', (path) => {
    expect(getPathForPhase('main', path)).toBe(path === '/account' ? '/profile' : path === '/notification' ? '/notifications' : path);
  });

  it('normalizes legacy store paths to the /store-map canonical route', () => {
    expect(getPathForPhase('main', '/store')).toBe('/store-map');
    expect(getPathForPhase('main', '/store-info')).toBe('/store-map');
    expect(getPathForPhase('main', '/store/navigation')).toBe('/store-map/navigation');
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

  it('resolves /profile/edit as the authenticated account profile editor route', () => {
    expect(resolveAppRoute('/profile/edit')).toMatchObject({
      kind: 'profile-edit',
      tab: 'account',
      canonicalPath: '/profile/edit',
    });
    expect(getPathForPhase('main', '/profile/edit')).toBe('/profile/edit');
    expect(requiresCustomerAuthentication('/profile/edit')).toBe(true);
  });

  it('supports slug-based order details and normalizes old order-number URLs to the list', () => {
    const slug = '0123456789abcdef0123456789abcdef';
    expect(resolveAppRoute('/my-orders')).toMatchObject({ kind: 'orders', tab: 'account', orderSlug: null });
    expect(resolveAppRoute('/myorder').canonicalPath).toBe('/my-orders');
    expect(resolveAppRoute('/my-order').canonicalPath).toBe('/my-orders');
    expect(resolveAppRoute(`/my-order/order/${slug}`)).toMatchObject({ kind: 'orders', orderSlug: slug, canonicalPath: `/my-order/order/${slug}` });
    expect(resolveAppRoute(`/myorder/order/${slug}`).canonicalPath).toBe(`/my-order/order/${slug}`);
    expect(getPathForCustomerOrder(slug)).toBe(`/my-order/order/${slug}`);
    expect(requiresCustomerAuthentication(`/my-order/order/${slug}`)).toBe(true);
    expect(resolveAppRoute('/my-orders/RGC-ABC123')).toMatchObject({ kind: 'orders', orderSlug: null, canonicalPath: '/my-orders' });
    expect(resolveAppRoute('/my-order/order/RGC-ABC123')).toMatchObject({ kind: 'orders', orderSlug: null, canonicalPath: '/my-orders' });
  });

  it('resolves support requests to the customer account with a canonical request deep link', () => {
    expect(resolveAppRoute('/support')).toMatchObject({ kind: 'support', tab: 'account', requestId: null, canonicalPath: '/support' });
    expect(resolveAppRoute('/support/request-123')).toMatchObject({ kind: 'support', tab: 'account', requestId: 'request-123', canonicalPath: '/support/request-123' });
    expect(getPathForPhase('main', '/support/request-123')).toBe('/support/request-123');
  });

  it('resolves the dedicated Contact Support page to the customer account', () => {
    expect(resolveAppRoute('/contact-support')).toMatchObject({ kind: 'contact-support', tab: 'account', canonicalPath: '/contact-support' });
    expect(getPathForPhase('main', '/contact-support')).toBe('/contact-support');
  });

  it('resolves the account deletion page and keeps the legacy typo alias working', () => {
    expect(resolveAppRoute('/account/settings/delete-account')).toMatchObject({ kind: 'settings-section', section: 'delete-account', tab: 'account' });
    expect(resolveAppRoute('/account/satting/delete-accout')).toMatchObject({ kind: 'settings-section', section: 'delete-account', canonicalPath: '/account/settings/delete-account' });
    expect(getPathForSettingsSection('delete-account')).toBe('/account/settings/delete-account');
    expect(requiresCustomerAuthentication('/account/settings/delete-account')).toBe(true);
  });

  it('uses /shop/products/:slug as the canonical product route and normalizes legacy paths', () => {
    expect(resolveAppRoute('/shop/products/premium-bike-seat-cover')).toMatchObject({ kind: 'product', tab: 'shop', slug: 'premium-bike-seat-cover', canonicalPath: '/shop/products/premium-bike-seat-cover' });
    expect(resolveAppRoute('/shop/products/2882')).toMatchObject({ kind: 'product', tab: 'shop', slug: '2882', canonicalPath: '/shop/products/2882' });
    expect(getPathForProduct('2882')).toBe('/shop/products/2882');
    expect(resolveAppRoute('/products/premium-bike-seat-cover').canonicalPath).toBe('/shop/products/premium-bike-seat-cover');
    expect(resolveAppRoute('/product/premium-bike-seat-cover').canonicalPath).toBe('/shop/products/premium-bike-seat-cover');
    expect(getPathForPhase('main', '/product/premium-bike-seat-cover')).toBe('/shop/products/premium-bike-seat-cover');
    expect(getPathForProduct('Premium Bike Cover')).toBe('/shop/products/Premium%20Bike%20Cover');
  });

  it('preserves a valid slug-specific order route when entering the main phase', () => {
    const path = '/my-order/order/0123456789abcdef0123456789abcdef';
    expect(getPathForPhase('main', path)).toBe(path);
  });

  it.each([
    ['/settings', 'settings'],
    ['/privacy-policy', 'privacy'],
    ['/terms-and-conditions', 'terms'],
    ['/store-map', 'store'],
    ['/store', 'store'],
  ])('resolves the %s page', (path, kind) => {
    expect(resolveAppRoute(path).kind).toBe(kind);
  });

  it.each([
    ['/settings/notifications', 'notifications'],
    ['/settings/app', 'app'],
    ['/settings/preferences', 'app'],
    ['/settings/coupons', 'coupons'],
    ['/settings/reviews', 'reviews'],
    ['/settings/about', 'about'],
    ['/settings/help', 'help'],
  ] as const)('resolves the %s settings section', (path, section) => {
    expect(resolveAppRoute(path)).toMatchObject({ kind: 'settings-section', section, canonicalPath: getPathForSettingsSection(section) });
    expect(getPathForPhase('main', path)).toBe(getPathForSettingsSection(section));
  });

  it('keeps the settings hub canonical when a section slug is unknown', () => {
    expect(resolveAppRoute('/settings/unknown')).toEqual({ kind: 'not-found', tab: 'home', canonicalPath: '/home' });
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

  it('resolves an admin order detail as a direct route and preserves its order number', () => {
    const orderNumber = 'RGC-ABC123';
    const path = getPathForAdminOrder(orderNumber);
    expect(path).toBe(`/admin/orders/${orderNumber}`);
    expect(getAdminOrderIdFromPath(path)).toBe(orderNumber);
    expect(getAdminSectionFromPath(path)).toBe('orders');
    expect(resolveAppRoute(path)).toMatchObject({
      kind: 'admin-order',
      tab: 'home',
      orderId: orderNumber,
      canonicalPath: path,
    });
    expect(getPathForPhase('main', path)).toBe(path);
    expect(isAdminPath(path)).toBe(true);
    expect(getPathForAdminOrder(`#${orderNumber}`)).toBe(path);
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

describe('guest access policy', () => {
  it.each(['/checkout', '/profile/edit', '/my-orders', '/my-orders/RGC-ABC123', '/my-order', '/my-order/order/RGC-ABC123', '/support', '/support/ticket-123', '/contact-support'])(
    'requires customer authentication for %s',
    (path) => expect(requiresCustomerAuthentication(path)).toBe(true),
  );

  it.each(['/home', '/shop', '/search', '/custom', '/wishlist', '/cart', '/notifications', '/profile', '/settings', '/store', '/product/seat-cover'])(
    'allows guests to open %s',
    (path) => expect(requiresCustomerAuthentication(path)).toBe(false),
  );
});
