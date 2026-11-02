import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CUSTOMER_APP_PREFERENCES,
  isNotificationEnabledByPreferences,
  prefersHapticFeedback,
  readCustomerAppPreferences,
  saveCustomerAppPreferences,
} from '../src/lib/customerPreferences';

let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('customer app preferences', () => {
  it('returns safe defaults when the device has no saved preferences', () => {
    expect(readCustomerAppPreferences('user-a')).toEqual(DEFAULT_CUSTOMER_APP_PREFERENCES);
  });

  it('saves notification, language and haptic choices independently for each user', () => {
    saveCustomerAppPreferences('user-a', {
      language: 'bn',
      hapticFeedback: false,
      notifications: { offers: false, workshopAlerts: false },
    });

    expect(readCustomerAppPreferences('user-a')).toEqual({
      language: 'bn',
      theme: 'system',
      hapticFeedback: false,
      notifications: {
        offers: false,
        orderUpdates: true,
        workshopAlerts: false,
        systemUpdates: true,
      },
    });
    expect(readCustomerAppPreferences('user-b')).toEqual(DEFAULT_CUSTOMER_APP_PREFERENCES);
    expect(prefersHapticFeedback('user-a')).toBe(false);
  });

  it('falls back safely for malformed or unsupported saved values', () => {
    storage.set('work-app:user-a:preferences:v1', '{not-json');
    expect(readCustomerAppPreferences('user-a')).toEqual(DEFAULT_CUSTOMER_APP_PREFERENCES);
    saveCustomerAppPreferences('user-a', { language: 'xx' as 'en', hapticFeedback: false });
    expect(readCustomerAppPreferences('user-a')).toMatchObject({ language: 'en', hapticFeedback: false });
  });

  it('maps saved category preferences to actual notification categories', () => {
    const preferences = {
      offers: false,
      orderUpdates: true,
      workshopAlerts: false,
      systemUpdates: true,
    };
    expect(isNotificationEnabledByPreferences(preferences, { kind: 'coupon', title: 'Offer', body: 'Coupon' })).toBe(false);
    expect(isNotificationEnabledByPreferences(preferences, { kind: 'order_update', title: 'Order confirmed', body: 'Order #1' })).toBe(true);
    expect(isNotificationEnabledByPreferences(preferences, { kind: 'update', title: 'Workshop replied to your support request', body: 'Reply', action_url: '/support/123' })).toBe(false);
    expect(isNotificationEnabledByPreferences(preferences, { kind: 'announcement', title: 'New product', body: 'Available now' })).toBe(true);
  });
});
