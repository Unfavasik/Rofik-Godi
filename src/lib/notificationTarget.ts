const SITE_ORIGIN = 'https://rofik-godi.pages.dev';
const ORDER_NUMBER_PATTERN = /\bRGC-[A-Z0-9]{8,32}\b/i;
const CUSTOMER_ORDER_PATH = /^\/(?:my|my-orders?|myorder)(?:\/|$)/i;
const ORDER_SLUG_PATH = /^\/(?:my-orders|myorder|my-order)\/order\/([0-9a-f]{32})$/i;

/** Resolve a stored notification action to a safe in-app route. */
export function getNotificationTargetPath(
  actionUrl: unknown,
  siteOrigin = SITE_ORIGIN,
  context: { kind?: unknown; notificationId?: unknown } = {},
): string {
  const notificationId =
    typeof context.notificationId === 'string' && /^[0-9a-f-]{36}$/i.test(context.notificationId)
      ? context.notificationId
      : null;
  const isOrderNotification =
    typeof context.kind === 'string' && context.kind.toLowerCase() === 'order';
  const notificationFallback =
    isOrderNotification && notificationId
      ? `/notifications?notification=${encodeURIComponent(notificationId)}`
      : '/notifications';
  if (typeof actionUrl !== 'string' || !actionUrl.trim()) return notificationFallback;

  try {
    const target = new URL(actionUrl, siteOrigin);
    if (target.origin !== siteOrigin) return '/notifications';

    const path = target.pathname;
    if (isOrderNotification && notificationId && /^\/(?:profile|account)\/?$/i.test(path)) {
      return notificationFallback;
    }
    const isCustomerOrderPath = CUSTOMER_ORDER_PATH.test(path);
    if (isCustomerOrderPath) {
      const orderNumber =
        target.searchParams.get('order')?.match(ORDER_NUMBER_PATTERN)?.[0] ||
        path.match(ORDER_NUMBER_PATTERN)?.[0];
      if (orderNumber)
        return `/notifications?order=${encodeURIComponent(orderNumber.toUpperCase())}`;
      if (isOrderNotification && notificationId) return notificationFallback;

      // Keep valid opaque order links. Malformed and old list-only order links
      // are routed to the notification inbox instead of silently opening /my.
      if (ORDER_SLUG_PATH.test(path)) return `${path}${target.search}${target.hash}`;
      return notificationFallback;
    }

    return `${path}${target.search}${target.hash}`;
  } catch {
    return '/notifications';
  }
}
