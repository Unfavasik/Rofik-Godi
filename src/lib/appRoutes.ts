export type AppPhase = 'onboarding' | 'main' | 'account-onboarding' | 'splash' | 'auth';
export type RouteTab = 'home' | 'shop' | 'search' | 'custom' | 'wishlist' | 'account' | 'cart' | 'notifications';

export const APP_ROUTE_PATHS = [
  '/', '/home', '/shop', '/search', '/custom', '/wishlist', '/cart', '/checkout',
  '/profile', '/account', '/my-orders', '/myorder', '/my-orders/:orderNumber', '/myorder/:orderNumber',
  '/notifications', '/notification', '/products/:slug', '/product/:slug',
  '/settings', '/privacy-policy', '/privacy', '/terms-and-conditions', '/terms', '/store', '/store-info',
  '/admin', '/Onboarding', '/onboarding', '/signup', '/signup/onboarding', '/signup/loading',
  '/auth/callback', '/example/shop',
] as const;

export type ResolvedAppRoute =
  | { kind: 'tab'; tab: RouteTab; canonicalPath: string }
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
  if (path === '/admin' || path === '/auth/callback') return { kind: 'tab', tab: 'home', canonicalPath: path };
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

  const productMatch = path.match(/^\/(products|product)\/([^/]+)$/i);
  if (productMatch) {
    const slug = decodeSegment(productMatch[2]);
    return { kind: 'product', tab: 'shop', slug, canonicalPath: `/products/${encodeURIComponent(slug)}` };
  }

  return { kind: 'not-found', tab: 'home', canonicalPath: '/home' };
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
  return route !== '/admin' && !storefrontRequested;
}
