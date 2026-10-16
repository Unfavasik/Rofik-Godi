export type CustomerNotificationCategory = 'Orders' | 'Offers' | 'Support' | 'System';
export type CustomerNotificationFilter = 'All' | CustomerNotificationCategory;

export type NotificationLike = {
  kind: string;
  title: string;
  body: string;
  action_url?: string | null;
};

export function getSupportRequestIdFromNotification(notification: NotificationLike): string | null {
  const actionUrl = notification.action_url || '';
  try {
    const path = new URL(actionUrl, 'https://rofikgodi.invalid').pathname;
    const match = path.match(/^\/support\/([^/]+)\/?$/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return null;
}

export function isSupportNotification(notification: NotificationLike): boolean {
  const text = `${notification.kind} ${notification.title} ${notification.body}`.toLowerCase();
  return Boolean(getSupportRequestIdFromNotification(notification)) ||
    text.includes('support request') || text.includes('support ticket') ||
    text.includes('workshop replied') || text.includes('support reply');
}

export function getCustomerNotificationCategory(notification: NotificationLike): CustomerNotificationCategory {
  if (isSupportNotification(notification)) return 'Support';
  const kind = notification.kind.toLowerCase();
  const text = `${notification.title} ${notification.body}`.toLowerCase();
  if (kind.includes('order') || kind.includes('pickup') || text.includes('order #') || text.includes('order ')) return 'Orders';
  if (kind.includes('offer') || kind.includes('promo') || kind.includes('coupon') || text.includes('special offer') || text.includes('coupon')) return 'Offers';
  return 'System';
}

export function matchesCustomerNotificationFilter(
  notification: NotificationLike,
  filter: CustomerNotificationFilter,
): boolean {
  return filter === 'All' || getCustomerNotificationCategory(notification) === filter;
}

export function getNotificationRowSurfaceClass(isUnread: boolean): string {
  return isUnread ? 'bg-rose-50' : 'bg-white';
}
