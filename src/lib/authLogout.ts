import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import { clearCustomerNotificationCache } from './localCache';

type LocalSignOut = (options: { scope: 'local' }) => Promise<{ error: unknown | null }>;

/** Signs out this browser session only; never revokes the user's other devices. */
export async function signOutCurrentDevice(signOut: LocalSignOut | null): Promise<boolean> {
  if (!signOut) return true;

  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (userId) clearCustomerNotificationCache(userId);
      const token = userId && Capacitor.isNativePlatform() ? localStorage.getItem(`rofik-godi-push-token:${userId}`) : null;
      if (userId && token && Capacitor.isNativePlatform()) {
        await supabase.from('push_devices').delete().eq('user_id', userId).eq('token', token);
        localStorage.removeItem(`rofik-godi-push-token:${userId}`);
      }
    } catch {
      // Sign-out should still work if the device is offline; stale FCM tokens are pruned by FCM errors.
    }
  }

  try {
    const { error } = await signOut({ scope: 'local' });
    return error === null;
  } catch {
    return false;
  }
}
