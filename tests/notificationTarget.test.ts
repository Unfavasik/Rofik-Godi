import { describe, expect, it } from 'vitest';
import { getNotificationTargetPath } from '../src/lib/notificationTarget';

describe('notification target routing', () => {
  it('opens an order notification by order number instead of routing to the orders list', () => {
    expect(getNotificationTargetPath('/my-orders/RGC-ABCDEF123456')).toBe(
      '/notifications?order=RGC-ABCDEF123456',
    );
    expect(
      getNotificationTargetPath('https://rofik-godi.pages.dev/my-order/order/RGC-ABCDEF123456'),
    ).toBe('/notifications?order=RGC-ABCDEF123456');
  });

  it('preserves valid opaque order links and their query/hash', () => {
    const slug = '0123456789abcdef0123456789abcdef';
    expect(getNotificationTargetPath(`/my-order/order/${slug}?source=push#details`)).toBe(
      `/my-order/order/${slug}?source=push#details`,
    );
  });

  it('uses the validated order slug from the push payload when the delivered action is stale', () => {
    const slug = '0123456789abcdef0123456789abcdef';
    expect(getNotificationTargetPath('/my-orders', undefined, { kind: 'order', orderSlug: slug })).toBe(
      `/my-order/order/${slug}`,
    );
    expect(getNotificationTargetPath('/my-order/order/sulg', undefined, { kind: 'order', orderSlug: slug })).toBe(
      `/my-order/order/${slug}`,
    );
  });

  it('opens a valid order deep link directly instead of routing through the inbox', () => {
    const slug = '0123456789abcdef0123456789abcdef';
    const notificationId = '01234567-89ab-cdef-0123-456789abcdef';
    expect(
      getNotificationTargetPath(`/my-order/order/${slug}`, undefined, {
        kind: 'order',
        notificationId,
        orderSlug: slug,
      }),
    ).toBe(`/my-order/order/${slug}`);
    expect(
      getNotificationTargetPath(`/my-order/order/${slug}`, undefined, { kind: 'order', notificationId }),
    ).toBe(`/my-order/order/${slug}`);
  });

  it('sends old list-only order URLs and empty actions to the inbox', () => {
    expect(getNotificationTargetPath('/my')).toBe('/notifications');
    expect(getNotificationTargetPath('/my-orders')).toBe('/notifications');
    expect(getNotificationTargetPath(null)).toBe('/notifications');
  });

  it('recovers delivered order alerts that still point to /profile using their notification ID', () => {
    const notificationId = '01234567-89ab-cdef-0123-456789abcdef';
    expect(
      getNotificationTargetPath('/profile', undefined, {
        kind: 'order',
        notificationId,
      }),
    ).toBe(`/notifications?notification=${notificationId}`);
  });

  it('recovers legacy order alerts that still point to /account', () => {
    const notificationId = '01234567-89ab-cdef-0123-456789abcdef';
    expect(getNotificationTargetPath('/account', undefined, { kind: 'order', notificationId })).toBe(
      `/notifications?notification=${notificationId}`,
    );
  });

  it('does not navigate to an external origin from notification data', () => {
    expect(getNotificationTargetPath('https://attacker.example/my-orders/RGC-ABCDEF123456')).toBe(
      '/notifications',
    );
  });

  it('preserves valid non-order app links', () => {
    expect(getNotificationTargetPath('/shop/products/example-bike-cover?ref=push')).toBe(
      '/shop/products/example-bike-cover?ref=push',
    );
  });
});
