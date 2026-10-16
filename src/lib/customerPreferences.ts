import { getCustomerNotificationCategory, type CustomerNotificationCategory, type NotificationLike } from './notificationCategory';

export type PreferredLanguage = 'en' | 'bn' | 'hi';

export interface CustomerNotificationPreferences {
  offers: boolean;
  orderUpdates: boolean;
  workshopAlerts: boolean;
  systemUpdates: boolean;
}

export interface CustomerAppPreferences {
  language: PreferredLanguage;
  hapticFeedback: boolean;
  notifications: CustomerNotificationPreferences;
}

export const CUSTOMER_PREFERENCES_CHANGED_EVENT = 'rofik:customer-preferences-changed';

export const DEFAULT_CUSTOMER_APP_PREFERENCES: CustomerAppPreferences = {
  language: 'en',
  hapticFeedback: true,
  notifications: {
    offers: true,
    orderUpdates: true,
    workshopAlerts: true,
    systemUpdates: true,
  },
};

function preferenceStorageKey(userId?: string): string {
  const owner = userId?.trim() || 'guest-user';
  return `work-app:${encodeURIComponent(owner)}:preferences:v1`;
}

function isLanguage(value: unknown): value is PreferredLanguage {
  return value === 'en' || value === 'bn' || value === 'hi';
}

function normalizePreferences(value: unknown): CustomerAppPreferences {
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_CUSTOMER_APP_PREFERENCES);
  const record = value as Record<string, unknown>;
  const rawNotifications = record.notifications && typeof record.notifications === 'object'
    ? record.notifications as Record<string, unknown>
    : {};
  return {
    language: isLanguage(record.language) ? record.language : 'en',
    hapticFeedback: typeof record.hapticFeedback === 'boolean' ? record.hapticFeedback : true,
    notifications: {
      offers: typeof rawNotifications.offers === 'boolean' ? rawNotifications.offers : true,
      orderUpdates: typeof rawNotifications.orderUpdates === 'boolean' ? rawNotifications.orderUpdates : true,
      workshopAlerts: typeof rawNotifications.workshopAlerts === 'boolean' ? rawNotifications.workshopAlerts : true,
      systemUpdates: typeof rawNotifications.systemUpdates === 'boolean' ? rawNotifications.systemUpdates : true,
    },
  };
}

export function readCustomerAppPreferences(userId?: string): CustomerAppPreferences {
  try {
    const raw = globalThis.localStorage?.getItem(preferenceStorageKey(userId));
    return raw ? normalizePreferences(JSON.parse(raw)) : structuredClone(DEFAULT_CUSTOMER_APP_PREFERENCES);
  } catch {
    return structuredClone(DEFAULT_CUSTOMER_APP_PREFERENCES);
  }
}

export function saveCustomerAppPreferences(
  userId: string | undefined,
  updates: Partial<Omit<CustomerAppPreferences, 'notifications'>> & {
    notifications?: Partial<CustomerNotificationPreferences>;
  },
): CustomerAppPreferences {
  const current = readCustomerAppPreferences(userId);
  const next = normalizePreferences({
    ...current,
    ...updates,
    notifications: { ...current.notifications, ...updates.notifications },
  });
  try {
    globalThis.localStorage?.setItem(preferenceStorageKey(userId), JSON.stringify(next));
  } catch {
    // The preference still applies for this render when browser storage is blocked.
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(CUSTOMER_PREFERENCES_CHANGED_EVENT, {
        detail: { userId: userId?.trim() || 'guest-user' },
      }));
    } catch {
      // Preference persistence must not depend on custom-event support.
    }
  }
  return next;
}

export function isNotificationCategoryEnabled(
  preferences: CustomerNotificationPreferences,
  category: CustomerNotificationCategory,
): boolean {
  if (category === 'Orders') return preferences.orderUpdates;
  if (category === 'Offers') return preferences.offers;
  if (category === 'Support') return preferences.workshopAlerts;
  return preferences.systemUpdates;
}

export function isNotificationEnabledByPreferences(
  preferences: CustomerNotificationPreferences,
  notification: NotificationLike,
): boolean {
  return isNotificationCategoryEnabled(preferences, getCustomerNotificationCategory(notification));
}

export function prefersHapticFeedback(userId?: string): boolean {
  return readCustomerAppPreferences(userId).hapticFeedback;
}
