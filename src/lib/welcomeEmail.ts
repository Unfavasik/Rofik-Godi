import type { SupabaseClient } from '@supabase/supabase-js';

export interface WelcomeEmailSessionUser {
  id: string;
  email?: string | null;
  created_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
}

export interface WelcomeEmailSessionLike {
  access_token?: string | null;
  user?: WelcomeEmailSessionUser | null;
}

const WELCOME_ACCOUNT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const WELCOME_SENT_KEY_PREFIX = 'welcome-email-sent:v1:';
const WELCOME_ATTEMPTED_KEY_PREFIX = 'welcome-email-attempted:v1:';

const ALLOWED_EXACT_ORIGINS = new Set([
  'https://rofikgodicenter.pages.dev',
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
]);

export function isValidEmailAddress(email: string | null | undefined): boolean {
  const normalized = (email || '').trim();
  if (normalized.length < 5 || normalized.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

/**
 * Mirrors the server-side eligibility rules in `send-order-confirmation` so the
 * client avoids sending doomed requests for older or unconfirmed accounts.
 */
export function isWelcomeEmailEligibleUser(
  user: WelcomeEmailSessionUser | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!user?.id) return false;
  if (!isValidEmailAddress(user.email)) return false;
  if (!user.email_confirmed_at && !user.confirmed_at) return false;
  if (!user.created_at) return false;

  const createdAtMs = Date.parse(user.created_at);
  if (!Number.isFinite(createdAtMs)) return false;
  const ageMs = nowMs - createdAtMs;
  return ageMs >= -60_000 && ageMs <= WELCOME_ACCOUNT_MAX_AGE_MS;
}

/**
 * Only invoke the transactional welcome-email Edge Function from allowlisted
 * storefront/app origins so sandboxed preview iframes do not trigger CORS noise.
 */
export function isAllowedWelcomeEmailOrigin(origin: string | null | undefined): boolean {
  const normalized = (origin || '').trim();
  if (!normalized) return false;
  if (ALLOWED_EXACT_ORIGINS.has(normalized)) return true;

  try {
    const parsed = new URL(normalized);
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    if (
      parsed.protocol === 'https:' &&
      /^[a-z0-9-]+\.rofikgodicenter\.pages\.dev$/i.test(parsed.hostname)
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getSafeStorage(kind: 'local' | 'session'): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export async function requestWelcomeEmailIfEligible(
  client: Pick<SupabaseClient, 'functions'> | null | undefined,
  session: WelcomeEmailSessionLike | null | undefined,
  options: {
    origin?: string | null;
    nowMs?: number;
    localStorage?: StorageLike | null;
    sessionStorage?: StorageLike | null;
  } = {},
): Promise<'sent' | 'skipped' | 'failed'> {
  if (!client || !session?.user || !session.access_token) return 'skipped';

  const user = session.user;
  const origin =
    options.origin !== undefined
      ? options.origin
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';

  if (!isAllowedWelcomeEmailOrigin(origin)) return 'skipped';
  if (!isWelcomeEmailEligibleUser(user, options.nowMs)) return 'skipped';

  const localStore = options.localStorage !== undefined ? options.localStorage : getSafeStorage('local');
  const sessionStore =
    options.sessionStorage !== undefined ? options.sessionStorage : getSafeStorage('session');

  const sentKey = `${WELCOME_SENT_KEY_PREFIX}${user.id}`;
  const attemptedKey = `${WELCOME_ATTEMPTED_KEY_PREFIX}${user.id}`;

  try {
    if (localStore?.getItem(sentKey) || sessionStore?.getItem(attemptedKey)) {
      return 'skipped';
    }
    sessionStore?.setItem(attemptedKey, '1');
  } catch {
    // Storage can be disabled; the server-side welcome_email_logs ledger remains authoritative.
  }

  try {
    const { error } = await client.functions.invoke('send-order-confirmation', {
      body: { type: 'welcome' },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) {
      return 'failed';
    }

    try {
      localStore?.setItem(sentKey, '1');
    } catch {
      // Best-effort client deduplication.
    }
    return 'sent';
  } catch {
    return 'failed';
  }
}
