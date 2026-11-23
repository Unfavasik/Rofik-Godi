import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { getNotificationTargetPath } from '../lib/notificationTarget';
import { notifyCustomerNotificationsUpdated, notifyCustomerOrdersUpdated } from '../lib/localCache';

const DEFAULT_ANDROID_CHANNEL_ID = 'rofik-godi-updates';
const STYLED_ANDROID_CHANNEL_ID = 'rofik-godi-styled-v1';
const STYLED_ANDROID_VERSION = '1.1.39';
const SITE_ORIGIN = 'https://rofikgodicenter.pages.dev';

function isVersionAtLeast(version: string, minimum: string) {
  const actual = version.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const required = minimum.split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(actual.length, required.length); i += 1) {
    const difference = (actual[i] || 0) - (required[i] || 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}

function openNotificationTarget(navigate: (path: string) => void, actionUrl: unknown, context: { kind?: unknown; notificationId?: unknown; orderSlug?: unknown } = {}) {
  const targetPath = getNotificationTargetPath(actionUrl, SITE_ORIGIN, context);
  try {
    if (typeof actionUrl === 'string' && actionUrl.trim()) {
      const target = new URL(actionUrl, SITE_ORIGIN);
      if (target.origin === SITE_ORIGIN) {
        const legacySupportRequestId = target.pathname === '/admin/activity'
          ? target.searchParams.get('support_request')
          : null;
        if (legacySupportRequestId) {
          navigate(`/admin/support/${encodeURIComponent(legacySupportRequestId)}`);
          return;
        }
      }
    }
  } catch {
    // The shared resolver sends malformed values to the in-app notification list.
  }
  navigate(targetPath);
}

export function usePushNotifications(userId: string | null, navigate: (path: string) => void) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    const listeners: PluginListenerHandle[] = [];

    const setup = async () => {
      try {
        listeners.push(await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
          openNotificationTarget(navigate, notification.data?.action_url, {
            kind: notification.data?.kind,
            notificationId: notification.data?.notification_id,
            orderSlug: notification.data?.order_slug || notification.data?.orderSlug,
          });
        }));
        listeners.push(await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          notifyCustomerNotificationsUpdated(userId ?? undefined);
          const kind = String(notification.data?.kind || '').toLowerCase();
          const type = String(notification.data?.type || '').toLowerCase();
          if (kind.includes('order') || type.includes('order') || type.includes('pickup') || type.includes('payment')) {
            notifyCustomerOrdersUpdated(userId ?? undefined);
          }
        }));
        if (!active || !userId || !supabase) return;

        let appVersion = '';
        if (Capacitor.getPlatform() === 'android') {
          try {
            appVersion = (await App.getInfo()).version;
          } catch {
            // Older Android shells can continue using the default channel.
          }
        }
        const useStyledAndroidChannel = isVersionAtLeast(appVersion, STYLED_ANDROID_VERSION);
        const notificationChannelId = useStyledAndroidChannel
          ? STYLED_ANDROID_CHANNEL_ID
          : DEFAULT_ANDROID_CHANNEL_ID;
        const notificationSound = useStyledAndroidChannel ? 'rofik_notification' : 'default';

        let permission = await PushNotifications.checkPermissions();
        if (permission.receive !== 'granted') {
          permission = await PushNotifications.requestPermissions();
        }
        if (!active || permission.receive !== 'granted') return;

        await PushNotifications.createChannel({
          id: notificationChannelId,
          name: 'Rofik Godi updates',
          description: 'Order updates and offers from Rofik Godi Centre',
          importance: 4,
          sound: notificationSound,
          vibration: true,
          lights: true,
          lightColor: '#D9232D',
        });
        if (notificationChannelId !== DEFAULT_ANDROID_CHANNEL_ID) {
          await PushNotifications.createChannel({
            id: DEFAULT_ANDROID_CHANNEL_ID,
            name: 'Rofik Godi order alerts',
            description: 'Order updates and offers from Rofik Godi Centre',
            importance: 4,
            sound: 'default',
            vibration: true,
            lights: true,
            lightColor: '#D9232D',
          }).catch(() => undefined);
        }
        listeners.push(await PushNotifications.addListener('registration', async ({ value }) => {
          if (!active || !supabase) return;
          const { error } = await supabase.from('push_devices').upsert({
            user_id: userId,
            token: value,
            platform: 'android',
            app_version: appVersion || null,
            updated_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          }, { onConflict: 'token' });
          if (error) {
            console.warn('Push device registration could not be saved.');
            return;
          }
          try {
            localStorage.setItem(`rofik-godi-push-token:${userId}`, value);
          } catch {
            // Token registration remains stored in Supabase if browser storage is unavailable.
          }
        }));

        listeners.push(await PushNotifications.addListener('registrationError', () => {
          console.warn('Android push registration failed.');
        }));

        if (active) await PushNotifications.register();
      } catch {
        console.warn('Push notifications could not be initialized on this device.');
      }
    };

    void setup();
    return () => {
      active = false;
      for (const listener of listeners) void listener.remove();
    };
  }, [navigate, userId]);
}
