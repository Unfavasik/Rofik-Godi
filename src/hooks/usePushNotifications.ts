import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '../lib/supabase';

const DEFAULT_ANDROID_CHANNEL_ID = 'rofik-godi-updates';
const PREMIUM_ANDROID_CHANNEL_ID = 'rofik-godi-updates-premium-v1';
const PREMIUM_ANDROID_VERSION = '1.1.28';
const SITE_ORIGIN = 'https://rofik-godi.pages.dev';

function isVersionAtLeast(version: string, minimum: string) {
  const actual = version.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const required = minimum.split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(actual.length, required.length); i += 1) {
    const difference = (actual[i] || 0) - (required[i] || 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}

function openNotificationTarget(navigate: (path: string) => void, actionUrl: unknown) {
  if (typeof actionUrl !== 'string' || !actionUrl.trim()) {
    navigate('/notifications');
    return;
  }
  try {
    const target = new URL(actionUrl, SITE_ORIGIN);
    if (target.origin === SITE_ORIGIN) {
      const legacySupportRequestId = target.pathname === '/admin/activity'
        ? target.searchParams.get('support_request')
        : null;
      if (legacySupportRequestId) {
        navigate(`/admin/support/${encodeURIComponent(legacySupportRequestId)}`);
        return;
      }
      navigate(`${target.pathname}${target.search}${target.hash}`);
      return;
    }
  } catch {
    // Route malformed or external notification links to the in-app notification list.
  }
  navigate('/notifications');
}

export function usePushNotifications(userId: string | null, navigate: (path: string) => void) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    const listeners: PluginListenerHandle[] = [];

    const setup = async () => {
      try {
        listeners.push(await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
          openNotificationTarget(navigate, notification.data?.action_url);
        }));
        listeners.push(await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
          const extra = notification.extra as Record<string, unknown> | undefined;
          openNotificationTarget(navigate, extra?.action_url);
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
        const usePremiumAndroidChannel = isVersionAtLeast(appVersion, PREMIUM_ANDROID_VERSION);
        const notificationChannelId = usePremiumAndroidChannel
          ? PREMIUM_ANDROID_CHANNEL_ID
          : DEFAULT_ANDROID_CHANNEL_ID;
        const notificationSound = usePremiumAndroidChannel ? 'rofik_notification' : 'default';

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
        await LocalNotifications.createChannel({
          id: notificationChannelId,
          name: 'Rofik Godi updates',
          description: 'Order updates and offers from Rofik Godi Centre',
          importance: 4,
          sound: notificationSound,
          vibration: true,
          lights: true,
          lightColor: '#D9232D',
        });

        listeners.push(await PushNotifications.addListener('registration', async ({ value }) => {
          if (!active || !supabase) return;
          const { error } = await supabase.from('push_devices').upsert({
            user_id: userId,
            token: value,
            platform: 'android',
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

        listeners.push(await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          try {
            await LocalNotifications.schedule({
              notifications: [{
                id: Math.floor(Date.now() % 2_000_000_000),
                title: notification.title || 'Rofik Godi Centre',
                body: notification.body || '',
                channelId: notificationChannelId,
                extra: notification.data,
                schedule: { at: new Date(Date.now() + 250) },
              }],
            });
          } catch {
            // The system FCM banner handles background delivery; foreground display is best-effort.
          }
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
