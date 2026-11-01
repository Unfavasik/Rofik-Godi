export type AppPhase = 'onboarding' | 'main' | 'account-onboarding' | 'splash' | 'auth';
export type RouteTab = 'home' | 'shop' | 'search' | 'custom' | 'wishlist' | 'account' | 'cart' | 'notifications';
export type AdminSectionRoute = 'overview' | 'orders' | 'products' | 'categories' | 'customers' | 'reviews' | 'marketing' | 'banners' | 'notifications' | 'activity' | 'support' | 'reports' | 'settings';
export type SettingsSectionRoute = 'notifications' | 'app' | 'coupons' | 'reviews' | 'about' | 'help';

export const APP_ROUTE_PATHS = [
  '/', '/home', '/shop', '/search', '/custom', '/wishlist', '/cart', '/checkout',
  '/profile', '/profile/edit', '/account', '/my-orders', '/myorder', '/my-order',
  '/my-orders/order/:orderSlug', '/myorder/order/:orderSlug', '/my-order/order/:orderSlug',
  '/my-orders/order/:orderSlug/order-need-help', '/myorder/order/:orderSlug/order-need-help', '/my-order/order/:orderSlug/order-need-help',
  '/notifications', '/notification', '/notifications/settings', '/shop/products/:id', '/products/:id', '/product/:id',
  '/coupons/:couponCode',
  '/support', '/support/:requestId', '/contact-support', '/contact-support/my-support-requests', '/contact-us', '/contact-workshop',
  '/settings', '/settings/notifications', '/settings/app', '/settings/coupons', '/settings/reviews', '/settings/about', '/settings/help',
  '/privacy-policy', '/privacy', '/terms-and-conditions', '/terms', '/store', '/store-info',
  '/personal-data', '/personal-data-processing',
  '/admin', '/admin/dashboard', '/admin/orders', '/admin/orders/:orderId', '/admin/products', '/admin/products/:productId', '/admin/categories', '/admin/customers',
  '/admin/customers/:customerId', '/admin/reviews', '/admin/coupons', '/admin/coupons/:couponId', '/admin/marketing', '/admin/banners', '/admin/notifications', '/admin/notifications/compose', '/admin/activity', '/admin/support', '/admin/support/:requestId',
  '/admin/reports', '/admin/settings', '/Onboarding', '/onboarding', '/signup', '/signup/onboarding', '/signup/loading',
  '/auth/callback', '/example/shop',
] as const;

export type ResolvedAppRoute =
  | { kind: 'tab'; tab: RouteTab; canonicalPath: string }
  | { kind: 'admin'; tab: 'home'; section: AdminSectionRoute; canonicalPath: string }
  | { kind: 'admin-customer'; tab: 'home'; customerId: string; canonicalPath: string }
  | { kind: 'admin-order'; tab: 'home'; orderId: string; canonicalPath: string }
  | { kind: 'checkout'; tab: 'cart'; canonicalPath: '/checkout' }
  | { kind: 'orders'; tab: 'account'; orderSlug: string | null; canonicalPath: string }
  | { kind: 'order-help'; tab: 'account'; orderSlug: string; canonicalPath: string }
  | { kind: 'coupon'; tab: 'account'; couponCode: string; canonicalPath: string }
  | { kind: 'profile-edit'; tab: 'account'; canonicalPath: '/profile/edit' }
  | { kind: 'support'; tab: 'account'; requestId: string | null; canonicalPath: string }
  | { kind: 'contact-support'; tab: 'account'; canonicalPath: '/contact-support' }
  | { kind: 'product'; tab: 'shop'; slug: string; canonicalPath: string }
  | { kind: 'settings'; tab: 'account'; canonicalPath: '/settings' }
  | { kind: 'settings-section'; tab: 'account'; section: SettingsSectionRoute; canonicalPath: string }
  | { kind: 'notifications-settings'; tab: 'notifications'; canonicalPath: '/notifications/settings' }
  | { kind: 'privacy'; tab: 'home'; canonicalPath: '/privacy-policy' }
  | { kind: 'terms'; tab: 'home'; canonicalPath: '/terms-and-conditions' }
  | { kind: 'personal-data'; tab: 'home'; canonicalPath: '/personal-data' }
  | { kind: 'store'; tab: 'home'; canonicalPath: '/store' }
  | { kind: 'not-found'; tab: 'home'; canonicalPath: '/home' };

const trimPath = (pathname: string) => pathname.replace(/\/+$/, '') || '/';
const decodeSegment = (segment: string) => {
  try { return decodeURIComponent(segment); } catch { return segment; }
};

const adminSectionPaths: Record<AdminSectionRoute, string> = {
  overview: '/admin',
  orders: '/admin/orders',
  products: '/admin/products',
  categories: '/admin/categories',
  customers: '/admin/customers',
  reviews: '/admin/reviews',
  marketing: '/admin/coupons',
  banners: '/admin/banners',
  notifications: '/admin/notifications',
  activity: '/admin/activity',
  support: '/admin/support',
  reports: '/admin/reports',
  settings: '/admin/settings',
};
const adminSectionsBySlug: Record<string, AdminSectionRoute> = {
  dashboard: 'overview', orders: 'orders', products: 'products', categories: 'categories',
  customers: 'customers', reviews: 'reviews', coupons: 'marketing', marketing: 'marketing',
  banners: 'banners', notifications: 'notifications', activity: 'activity', support: 'support', reports: 'reports', settings: 'settings',
};

export function getPathForAdminSection(section: AdminSectionRoute): string {
  return adminSectionPaths[section];
}

const settingsSectionPaths: Record<SettingsSectionRoute, string> = {
  notifications: '/settings/notifications',
  app: '/settings/app',
  coupons: '/settings/coupons',
  reviews: '/settings/reviews',
  about: '/settings/about',
  help: '/settings/help',
};
const settingsSectionsBySlug: Record<string, SettingsSectionRoute> = {
  notifications: 'notifications',
  app: 'app',
  preferences: 'app',
  coupons: 'coupons',
  reviews: 'reviews',
  about: 'about',
  help: 'help',
};

export function getPathForSettingsSection(section: SettingsSectionRoute): string {
  return settingsSectionPaths[section];
}

export function getSettingsSectionFromPath(pathname: string): SettingsSectionRoute | null {
  const slug = trimPath(pathname).toLowerCase().match(/^\/settings\/([^/]+)$/)?.[1];
  return slug ? settingsSectionsBySlug[slug] || null : null;
}

export function getPathForAdminCustomer(customerId: string): string {
  return `/admin/customers/${encodeURIComponent(customerId)}`;
}

export function getPathForAdminOrder(orderId: string): string {
  return `/admin/orders/${encodeURIComponent(orderId.replace(/^#/, ''))}`;
}

export function getPathForCustomerOrder(orderSlug: string): string {
  return `/my-order/order/${encodeURIComponent(orderSlug)}`;
}

export function getPathForOrderHelp(orderSlug: string): string {
  return `/my-order/order/${encodeURIComponent(orderSlug)}/order-need-help`;
}

export function getAdminOrderIdFromPath(pathname: string): string | null {
  const orderId = trimPath(pathname).match(/^\/admin\/orders\/([^/]+)$/i)?.[1];
  return orderId ? decodeSegment(orderId) : null;
}

export function getAdminCustomerIdFromPath(pathname: string): string | null {
  const customerId = trimPath(pathname).match(/^\/admin\/customers\/([^/]+)$/i)?.[1];
  return customerId ? decodeSegment(customerId) : null;
}

export function getAdminSupportRequestIdFromPath(pathname: string): string | null {
  const requestId = trimPath(pathname).match(/^\/admin\/support\/([^/]+)$/i)?.[1];
  return requestId ? decodeSegment(requestId) : null;
}

export function getPathForAdminProduct(productId: string): string {
  return `/admin/products/${encodeURIComponent(productId)}`;
}

export function getAdminProductIdFromPath(pathname: string): string | null {
  const productId = trimPath(pathname).match(/^\/admin\/products\/([^/]+)$/i)?.[1];
  return productId ? decodeSegment(productId) : null;
}

export function getPathForAdminCoupon(couponId: string): string {
  return `/admin/coupons/${encodeURIComponent(couponId)}`;
}

export function getAdminCouponIdFromPath(pathname: string): string | null {
  const couponId = trimPath(pathname).match(/^\/admin\/coupons\/([^/]+)$/i)?.[1];
  return couponId ? decodeSegment(couponId) : null;
}

export function isAdminNotificationComposePath(pathname: string): boolean {
  return /^\/admin\/notifications\/compose$/i.test(trimPath(pathname));
}

export function getPathForCustomerCoupon(couponCode: string): string {
  return `/coupons/${encodeURIComponent(couponCode)}`;
}

export function getCustomerCouponCodeFromPath(pathname: string): string | null {
  const code = trimPath(pathname).match(/^\/coupons\/([^/]+)$/i)?.[1];
  return code ? decodeSegment(code) : null;
}

export function getAdminSectionFromPath(pathname: string): AdminSectionRoute | null {
  const path = trimPath(pathname).toLowerCase();
  if (path === '/admin') return 'overview';
  if (/^\/admin\/orders\/[^/]+$/i.test(path)) return 'orders';
  if (/^\/admin\/customers\/[^/]+$/i.test(path)) return 'customers';
  if (/^\/admin\/products\/[^/]+$/i.test(path)) return 'products';
  if (/^\/admin\/coupons\/[^/]+$/i.test(path)) return 'marketing';
  if (/^\/admin\/notifications\/compose$/i.test(path)) return 'notifications';
  if (/^\/admin\/support(?:\/[^/]+)?$/i.test(path)) return 'support';
  const slug = path.match(/^\/admin\/([^/]+)$/)?.[1];
  return slug ? adminSectionsBySlug[slug] || null : null;
}

export function isAdminPath(pathname: string): boolean {
  return /^\/admin(?:\/|$)/i.test(trimPath(pathname));
}

export function resolveAppRoute(pathname: string): ResolvedAppRoute {
  const path = trimPath(pathname);
  if (path === '/' || path === '/home' || path === '/example/shop') return { kind: 'tab', tab: 'home', canonicalPath: '/home' };
  if (path === '/shop') return { kind: 'tab', tab: 'shop', canonicalPath: '/shop' };
  if (path === '/search') return { kind: 'tab', tab: 'search', canonicalPath: '/search' };
  if (path === '/custom') return { kind: 'tab', tab: 'custom', canonicalPath: '/custom' };
  if (path === '/wishlist') return { kind: 'tab', tab: 'wishlist', canonicalPath: '/wishlist' };
  if (path === '/cart') return { kind: 'tab', tab: 'cart', canonicalPath: '/cart' };
  if (path === '/notifications/settings') return { kind: 'notifications-settings', tab: 'notifications', canonicalPath: '/notifications/settings' };
  if (path === '/notifications' || path === '/notification') return { kind: 'tab', tab: 'notifications', canonicalPath: '/notifications' };
  if (path === '/profile/edit') return { kind: 'profile-edit', tab: 'account', canonicalPath: '/profile/edit' };
  if (path === '/profile' || path === '/account') return { kind: 'tab', tab: 'account', canonicalPath: '/profile' };
  if (path.toLowerCase() === '/contact-support/my-support-requests') {
    return { kind: 'support', tab: 'account', requestId: null, canonicalPath: '/contact-support/my-support-requests' };
  }
  const supportMatch = path.match(/^\/support(?:\/([^/]+))?$/i);
  if (supportMatch) {
    const requestId = supportMatch[1] ? decodeSegment(supportMatch[1]) : null;
    return {
      kind: 'support',
      tab: 'account',
      requestId,
      canonicalPath: requestId ? `/support/${encodeURIComponent(requestId)}` : '/support',
    };
  }
  const couponCode = getCustomerCouponCodeFromPath(path);
  if (couponCode) {
    return { kind: 'coupon', tab: 'account', couponCode, canonicalPath: getPathForCustomerCoupon(couponCode) };
  }
  if (path === '/auth/callback') return { kind: 'tab', tab: 'home', canonicalPath: path };

  const adminOrderId = getAdminOrderIdFromPath(path);
  if (adminOrderId) {
    return {
      kind: 'admin-order',
      tab: 'home',
      orderId: adminOrderId,
      canonicalPath: getPathForAdminOrder(adminOrderId),
    };
  }
  const adminCustomerId = getAdminCustomerIdFromPath(path);
  if (adminCustomerId) {
    return {
      kind: 'admin-customer',
      tab: 'home',
      customerId: adminCustomerId,
      canonicalPath: getPathForAdminCustomer(adminCustomerId),
    };
  }
  const adminSection = getAdminSectionFromPath(path);
  if (adminSection) {
    // Keep detail segments (product/coupon focus, compose, support ticket) in the
    // canonical path so deep links are not rewritten back to the bare section URL.
    const adminProductId = getAdminProductIdFromPath(path);
    const adminCouponId = getAdminCouponIdFromPath(path);
    const adminSupportId = getAdminSupportRequestIdFromPath(path);
    const detailSuffix = adminProductId
      ? `/${encodeURIComponent(adminProductId)}`
      : adminCouponId
        ? `/${encodeURIComponent(adminCouponId)}`
        : adminSupportId
          ? `/${encodeURIComponent(adminSupportId)}`
          : isAdminNotificationComposePath(path)
            ? '/compose'
            : '';
    return { kind: 'admin', tab: 'home', section: adminSection, canonicalPath: `${getPathForAdminSection(adminSection)}${detailSuffix}` };
  }
  if (path === '/checkout') return { kind: 'checkout', tab: 'cart', canonicalPath: '/checkout' };
  const settingsSection = getSettingsSectionFromPath(path);
  if (settingsSection) {
    return { kind: 'settings-section', tab: 'account', section: settingsSection, canonicalPath: getPathForSettingsSection(settingsSection) };
  }
  if (path === '/settings') return { kind: 'settings', tab: 'account', canonicalPath: '/settings' };
  if (['/contact-support', '/contact-us', '/contact-workshop'].includes(path.toLowerCase())) {
    return { kind: 'contact-support', tab: 'account', canonicalPath: '/contact-support' };
  }
  if (path === '/privacy-policy' || path === '/privacy') return { kind: 'privacy', tab: 'home', canonicalPath: '/privacy-policy' };
  if (path === '/terms-and-conditions' || path === '/terms') return { kind: 'terms', tab: 'home', canonicalPath: '/terms-and-conditions' };
  if (path === '/personal-data' || path === '/personal-data-processing') return { kind: 'personal-data', tab: 'home', canonicalPath: '/personal-data' };
  if (path === '/store' || path === '/store-info') return { kind: 'store', tab: 'home', canonicalPath: '/store' };

  const orderHelpMatch = path.match(/^\/(my-orders|myorder|my-order)\/order\/([^/]+)\/order-need-help$/i);
  if (orderHelpMatch) {
    const requestedSlug = decodeSegment(orderHelpMatch[2]);
    const orderSlug = /^[0-9a-f]{32}$/i.test(requestedSlug) ? requestedSlug.toLowerCase() : null;
    // Invalid slugs fall back to the orders list, mirroring the order detail route.
    if (!orderSlug) return { kind: 'orders', tab: 'account', orderSlug: null, canonicalPath: '/my-orders' };
    return { kind: 'order-help', tab: 'account', orderSlug, canonicalPath: getPathForOrderHelp(orderSlug) };
  }
  const orderMatch = path.match(/^\/(my-orders|myorder|my-order)(?:\/order\/([^/]+))?$/i);
  if (orderMatch) {
    const requestedSlug = orderMatch[2] ? decodeSegment(orderMatch[2]) : null;
    const orderSlug = requestedSlug && /^[0-9a-f]{32}$/i.test(requestedSlug) ? requestedSlug.toLowerCase() : null;
    return {
      kind: 'orders',
      tab: 'account',
      orderSlug,
      canonicalPath: orderSlug ? getPathForCustomerOrder(orderSlug) : '/my-orders',
    };
  }
  // Old order-number URLs only open the signed-in customer's list; they never resolve an order.
  if (/^\/(?:my-orders|myorder|my-order)\/[^/]+(?:\/[^/]+)?$/i.test(path)) {
    return { kind: 'orders', tab: 'account', orderSlug: null, canonicalPath: '/my-orders' };
  }

  const productMatch = path.match(/^\/(?:shop\/products|products|product)\/([^/]+)$/i);
  if (productMatch) {
    const slug = decodeSegment(productMatch[1]);
    return { kind: 'product', tab: 'shop', slug, canonicalPath: getPathForProduct(slug) };
  }

  return { kind: 'not-found', tab: 'home', canonicalPath: '/home' };
}

export function requiresCustomerAuthentication(pathname: string): boolean {
  const kind = resolveAppRoute(pathname).kind;
  return kind === 'checkout' || kind === 'orders' || kind === 'order-help' || kind === 'support' || kind === 'contact-support' || kind === 'profile-edit' || kind === 'coupon';
}

/** Product detail URLs use the immutable product id as their canonical key. */
export function getPathForProduct(productId: string): string {
  return `/shop/products/${encodeURIComponent(productId)}`;
}

export function getPathForTab(tab: RouteTab): string {
  return tab === 'account' ? '/profile' : `/${tab}`;
}

export function getPathForNotificationsSettings(): string {
  return '/notifications/settings';
}

export function getPathForPhase(phase: AppPhase, currentPath: string): string {
  if (phase === 'onboarding') return '/Onboarding';
  if (phase === 'auth') return '/signup';
  if (phase === 'account-onboarding') return '/signup/onboarding';
  if (phase === 'splash') return '/signup/loading';

  const normalizedPath = trimPath(currentPath);
  if (normalizedPath === '/') return '/home';
  const route = resolveAppRoute(normalizedPath);
  return route.kind === 'not-found' ? '/home' : route.canonicalPath;
}

export function shouldRedirectAdminToWorkspace(
  pathname: string,
  storefrontRequested: boolean,
): boolean {
  const route = trimPath(pathname);
  return !isAdminPath(route) && !storefrontRequested;
}
