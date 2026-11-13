import { describe, expect, it } from 'vitest';
import {
  getCustomerNotificationCategory,
  getNotificationRowSurfaceClass,
  getSupportRequestIdFromNotification,
  matchesCustomerNotificationFilter,
  matchesNotificationCategoryToggle,
} from '../src/lib/notificationCategory';

describe('customer notification categories', () => {
  it('classifies the database support reply trigger under Support even when kind is update', () => {
    const reply = {
      kind: 'update',
      title: 'Workshop replied to your support request',
      body: 'Your pickup request is being checked. We will update you shortly.',
      action_url: '/support/9c719687-4c29-4fb5-b1f2-c21746e2ce93',
    };
    expect(getCustomerNotificationCategory(reply)).toBe('Support');
    expect(matchesCustomerNotificationFilter(reply, 'Support')).toBe(true);
    expect(matchesCustomerNotificationFilter(reply, 'System')).toBe(false);
    expect(getSupportRequestIdFromNotification(reply)).toBe('9c719687-4c29-4fb5-b1f2-c21746e2ce93');
  });

  it('classifies order, offer and system notifications into their own filters', () => {
    const promo = { kind: 'promotion', title: 'Special offer just for you', body: 'Use coupon RGC20.' };
    expect(getCustomerNotificationCategory({ kind: 'order', title: 'Your order is confirmed', body: 'Order #RGC-1042 is being prepared.' })).toBe('Orders');
    expect(getCustomerNotificationCategory(promo)).toBe('Offers');
    expect(matchesNotificationCategoryToggle(promo, 'Promotions')).toBe(true);
    expect(matchesNotificationCategoryToggle(promo, 'Orders')).toBe(false);
    expect(getCustomerNotificationCategory({ kind: 'update', title: 'Profile updated', body: 'Your profile was updated successfully.' })).toBe('System');
    expect(getCustomerNotificationCategory({ kind: 'security', title: '🔐 Important account update', body: 'Updated: Password.' })).toBe('System');
  });

  it('ignores unrelated and malformed action URLs when extracting ticket IDs', () => {
    expect(getSupportRequestIdFromNotification({ kind: 'update', title: 'Update', body: 'Done', action_url: '/shop' })).toBeNull();
    expect(getSupportRequestIdFromNotification({ kind: 'update', title: 'Update', body: 'Done', action_url: 'https://store.example/support/%E0%A4%A' })).toBeNull();
  });

  it('keeps the unread row surface opaque so the hidden delete tray cannot bleed through', () => {
    expect(getNotificationRowSurfaceClass(true)).toBe('bg-rose-50');
    expect(getNotificationRowSurfaceClass(false)).toBe('bg-white');
  });
});
