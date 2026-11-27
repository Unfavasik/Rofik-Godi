import { Capacitor } from '@capacitor/core';
import { sanitizeUrl } from './security';

export const NATIVE_AUTH_CALLBACK_URL = 'com.rofikgodi.centre://auth/callback';

export function getAuthCallbackUrl(): string {
  if (Capacitor.isNativePlatform()) return NATIVE_AUTH_CALLBACK_URL;
  const configuredRedirect = sanitizeUrl(
    import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL as string | undefined,
    { allowRelative: false, allowHttpLocalhost: true },
  );
  return configuredRedirect || `${window.location.origin}/auth/callback`;
}
