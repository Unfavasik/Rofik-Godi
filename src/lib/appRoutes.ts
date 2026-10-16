export type AppPhase = 'onboarding' | 'main' | 'account-onboarding' | 'splash' | 'auth';
export type RouteTab = 'home' | 'shop' | 'search' | 'custom' | 'wishlist' | 'account' | 'cart' | 'notifications';
export type AdminSectionRoute = 'overview' | 'orders' | 'products' | 'categories' | 'customers' | 'reviews' | 'marketing' | 'banners' | 'notifications' | 'activity' | 'reports' | 'settings';

export const APP_ROUTE_PATHS = [
  '/', '/home', '/shop', '/search', '/custom', '/wishlist', '/cart', '/checkout',
  '/profile', '/account', '/my-orders', '/myorder', '/my-orders/:orderNumber', '/myorder/:orderNumber',
  '/notifications', '/notification', '/shop/products/:slug', '/products/:slug', '/product/:slug',
  '/settings', '/privacy-policy', '/privacy', '/terms-and-conditions', '/terms', '/store', '/store-info',
  '/admin', '/admin/dashboard', '/admin/orders', '/admin/products', '/admin/categories', '/admin/customers',
  '/admin/customers/:customerId', '/admin/reviews', '/admin/coupons', '/admin/marketing', '/admin/banners', '/admin/notifications', '/admin/activity',
  '/admin/reports', '/admin/settings', '/Onboarding', '/onboarding', '/signup', '/signup/onboarding', '/signup/loading',
  '/auth/callback', '/example/shop',
] as const;

export type ResolvedAppRoute =
  | { kind: 'tab'; tab: RouteTab; canonicalPath: string }
  | { kind: 'admin'; tab: 'home'; section: AdminSectionRoute; canonicalPath: string }
  | { kind: 'admin-customer'; tab: 'home'; customerId: string; canonicalPath: string }
  | { kind: 'checkout'; tab: 'cart'; canonicalPath: '/checkout' }
  | { kind: 'orders'; tab: 'account'; orderNumber: string | null; canonicalPath: string }
  | { kind: 'product'; tab: 'shop'; slug: string; canonicalPath: string }
  | { kind: 'settings'; tab: 'account'; canonicalPath: '/settings' }
  | { kind: 'privacy'; tab: 'home'; canonicalPath: '/privacy-policy' }
  | { kind: 'terms'; tab: 'home'; canonicalPath: '/terms-and-conditions' }
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
  reports: '/admin/reports',
  settings: '/admin/settings',
};
const adminSectionsBySlug: Record<string, AdminSectionRoute> = {
  dashboard: 'overview', orders: 'orders', products: 'products', categories: 'categories',
  customers: 'customers', reviews: 'reviews', coupons: 'marketing', marketing: 'marketing',
  banners: 'banners', notifications: 'notifications', activity: 'activity', reports: 'reports', settings: 'settings',
};

export function getPathForAdminSection(section: AdminSectionRoute): string {
  return adminSectionPaths[section];
}

export function getPathForAdminCustomer(customerId: string): string {
  return `/admin/customers/${encodeURIComponent(customerId)}`;
}

export function getAdminCustomerIdFromPath(pathname: string): string | null {
  const customerId = trimPath(pathname).match(/^\/admin\/customers\/([^/]+)$/i)?.[1];
  return customerId ? decodeSegment(customerId) : null;
}

export function getAdminSectionFromPath(pathname: string): AdminSectionRoute | null {
  const path = trimPath(pathname).toLowerCase();
  if (path === '/admin') return 'overview';
  if (/^\/admin\/customers\/[^/]+$/i.test(path)) return 'customers';
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
  if (path === '/notifications' || path === '/notification') return { kind: 'tab', tab: 'notifications', canonicalPath: '/notifications' };
  if (path === '/profile' || path === '/account') return { kind: 'tab', tab: 'account', canonicalPath: '/profile' };
  if (path === '/auth/callback') return { kind: 'tab', tab: 'home', canonicalPath: path };

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
  if (adminSection) return { kind: 'admin', tab: 'home', section: adminSection, canonicalPath: getPathForAdminSection(adminSection) };
  if (path === '/checkout') return { kind: 'checkout', tab: 'cart', canonicalPath: '/checkout' };
  if (path === '/settings') return { kind: 'settings', tab: 'account', canonicalPath: '/settings' };
  if (path === '/privacy-policy' || path === '/privacy') return { kind: 'privacy', tab: 'home', canonicalPath: '/privacy-policy' };
  if (path === '/terms-and-conditions' || path === '/terms') return { kind: 'terms', tab: 'home', canonicalPath: '/terms-and-conditions' };
  if (path === '/store' || path === '/store-info') return { kind: 'store', tab: 'home', canonicalPath: '/store' };

  const orderMatch = path.match(/^\/(my-orders|myorder)(?:\/([^/]+))?$/i);
  if (orderMatch) {
    const orderNumber = orderMatch[2] ? decodeSegment(orderMatch[2]) : null;
    return {
      kind: 'orders',
      tab: 'account',
      orderNumber,
      canonicalPath: orderNumber ? `/my-orders/${encodeURIComponent(orderNumber)}` : '/my-orders',
    };
  }

  const productMatch = path.match(/^\/(?:shop\/products|products|product)\/([^/]+)$/i);
  if (productMatch) {
    const slug = decodeSegment(productMatch[1]);
    return { kind: 'product', tab: 'shop', slug, canonicalPath: getPathForProduct(slug) };
  }

  return { kind: 'not-found', tab: 'home', canonicalPath: '/home' };
}

export function getPathForProduct(slug: string): string {
  return `/shop/products/${encodeURIComponent(slug)}`;
}

export function getPathForTab(tab: RouteTab): string {
  return tab === 'account' ? '/profile' : `/${tab}`;
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
