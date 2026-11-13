import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};
type ActivityEvent = {
  id?: string;
  event_type?: string;
  entity_type?: string;
  entity_id?: string | null;
  actor_user_id?: string | null;
  title?: string | null;
  body?: string | null;
  details?: Record<string, unknown> | null;
};
type AdminPushToken = { token: string; user_id: string };

const SITE = 'https://rofik-godi.pages.dev';
const FIREBASE_PROJECT_ID = 'rofik-godi-centre';
let accessTokenCache = '';
let accessTokenExpiresAt = 0;

function constantTimeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function parseServiceAccount(raw: string): FirebaseServiceAccount {
  let parsed: unknown = JSON.parse(raw.trim().replace(/^\uFEFF/, ''));
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  const account = parsed as Partial<FirebaseServiceAccount>;
  if (account.project_id !== FIREBASE_PROJECT_ID || !account.client_email || !account.private_key) {
    throw new Error('Firebase service account is not configured for this app');
  }
  return account as FirebaseServiceAccount;
}

async function getFcmAccessToken(account: FirebaseServiceAccount) {
  if (accessTokenCache && accessTokenExpiresAt > Date.now() + 60_000) return accessTokenCache;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64Url(new TextEncoder().encode(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })));
  const unsigned = `${header}.${claims}`;
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const keyBytes = Uint8Array.from(atob(pem), (character) => character.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!response.ok || !result.access_token) throw new Error(`FCM auth failed (${response.status})`);
  accessTokenCache = result.access_token;
  accessTokenExpiresAt = Date.now() + Number(result.expires_in || 3600) * 1000;
  return accessTokenCache;
}

function buildNotification(event: ActivityEvent) {
  const type = String(event.event_type || '');
  const entityId = event.entity_id ? encodeURIComponent(String(event.entity_id)) : '';
  const details = event.details || {};
  let section = '/admin';
  let channel = 'general';
  let fallbackTitle = 'Admin Update';
  let fallbackBody = 'A new admin activity needs your attention.';
  let kind = 'general';

  if (type.startsWith('order_')) {
    section = entityId ? `/admin/orders/${entityId}` : '/admin/orders';
    channel = 'orders'; kind = 'order'; fallbackTitle = type === 'order_created' ? 'New Order Received' : 'Order Update';
    fallbackBody = details.order_number ? `Order #${String(details.order_number)}` : 'Order update';
  } else if (type.startsWith('support_request')) {
    section = entityId ? `/admin/support/${entityId}` : '/admin/support';
    channel = 'support'; kind = 'support'; fallbackTitle = 'Customer Support';
    fallbackBody = typeof details.message === 'string' ? details.message : 'New support message';
  } else if (type.startsWith('review_')) {
    section = '/admin/reviews'; channel = 'general'; kind = 'review'; fallbackTitle = 'New Review'; fallbackBody = 'A customer review needs attention.';
  } else if (type.startsWith('coupon_')) {
    section = entityId ? `/admin/coupons/${entityId}` : '/admin/coupons';
    channel = 'offers'; kind = 'coupon'; fallbackTitle = 'Coupon Update'; fallbackBody = 'A coupon was updated.';
  } else if (type.startsWith('product_')) {
    section = entityId ? `/admin/products/${entityId}` : '/admin/products';
    channel = 'general'; kind = 'product'; fallbackTitle = 'Product Update'; fallbackBody = 'A product was updated.';
  } else if (type.startsWith('campaign_')) {
    section = '/admin/notifications'; channel = 'offers'; kind = 'campaign'; fallbackTitle = 'Campaign Update'; fallbackBody = 'A campaign needs your attention.';
  }

  const actionUrl = new URL(section, SITE).toString();
  const title = String(event.title || fallbackTitle).slice(0, 120);
  const body = String(event.body || fallbackBody).slice(0, 700);
  const actions = JSON.stringify([{ title: 'Open', url: actionUrl }]);
  return { type, kind, channel, title, body, actionUrl, actions };
}

async function safeErrorCode(response: Response) {
  const result = await response.json().catch(() => ({})) as { error?: { status?: string; details?: Array<{ errorCode?: string }> } };
  return result.error?.details?.find((detail) => detail.errorCode)?.errorCode || result.error?.status || `HTTP_${response.status}`;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const expectedSecret = Deno.env.get('PUSH_WEBHOOK_SECRET') || '';
  const suppliedSecret = request.headers.get('x-webhook-secret') || '';
  if (!constantTimeEqual(suppliedSecret, expectedSecret)) return new Response('Forbidden', { status: 403 });

  let event: ActivityEvent;
  try {
    event = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!event || typeof event !== 'object' || !event.id || !event.event_type) {
    return new Response('Invalid event payload', { status: 400 });
  }
  // Admin/system work belongs in the Activity Log only. Match the feed split
  // and fail closed when actor attribution is missing.
  if (!event.actor_user_id && event.event_type !== 'review_created') {
    return Response.json({ sent: 0, failed: 0, skipped: 'not_customer_initiated' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKeysText = Deno.env.get('SUPABASE_SECRET_KEYS');
  let serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (secretKeysText) {
    try {
      const secretKeys = JSON.parse(secretKeysText);
      serviceKey = secretKeys.default || secretKeys.service_role || serviceKey;
    } catch {
      return new Response('Supabase service key configuration error', { status: 500 });
    }
  }
  const firebaseJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON') || Deno.env.get('FCM_SERVICE_ACCOUNT_JSON') || '';
  if (!supabaseUrl || !serviceKey || !firebaseJson || !expectedSecret) {
    return new Response('Push service is not configured', { status: 500 });
  }

  let account: FirebaseServiceAccount;
  let accessToken: string;
  try {
    account = parseServiceAccount(firebaseJson);
    accessToken = await getFcmAccessToken(account);
  } catch (error) {
    console.error('Admin push credential failure:', error instanceof Error ? error.message : 'unknown');
    return new Response('FCM credentials are unavailable or invalid', { status: 502 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (event.actor_user_id) {
    const { data: adminActor, error: actorError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', event.actor_user_id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();
    if (actorError) {
      console.error('Could not verify activity actor');
      return new Response('Could not verify activity actor', { status: 500 });
    }
    if (adminActor) return Response.json({ sent: 0, failed: 0, skipped: 'admin_authored_activity' });
  }
  const { data: adminUsers, error: adminsError } = await supabase.from('admin_users').select('user_id').eq('role', 'admin').limit(500);
  if (adminsError) {
    console.error('Could not load current admin users');
    return new Response('Could not load admins', { status: 500 });
  }
  const adminIds = new Set((adminUsers || []).map((row) => row.user_id as string));
  if (!adminIds.size) return Response.json({ sent: 0, failed: 0, skipped: 'no_admin_users' });

  const { data: registered, error: tokensError } = await supabase.from('admin_push_tokens').select('token,user_id').limit(2000);
  if (tokensError) {
    console.error('Could not load admin push tokens');
    return new Response('Could not load registered devices', { status: 500 });
  }
  const tokens = ((registered || []) as AdminPushToken[]).filter((row) => adminIds.has(row.user_id));
  if (!tokens.length) return Response.json({ sent: 0, failed: 0, skipped: 'no_admin_devices' });

  const notification = buildNotification(event);
  let sent = 0;
  let failed = 0;
  const sendResults = await Promise.all(tokens.map(async ({ token }) => {
    const data: Record<string, string> = {
      notification_id: String(event.id),
      kind: notification.kind,
      type: notification.type || notification.kind,
      title: notification.title,
      body: notification.body,
      channel: notification.channel,
      url: notification.actionUrl,
      action_url: notification.actionUrl,
      actions: notification.actions,
    };
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ message: { token, android: { priority: 'HIGH' }, data } }),
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return { sent: true };
      const errorCode = await safeErrorCode(response);
      if (errorCode === 'UNREGISTERED') {
        await supabase.from('admin_push_tokens').delete().eq('token', token);
        await supabase.from('push_devices').delete().eq('token', token);
      }
      console.error('FCM delivery failed:', errorCode);
      return { sent: false };
    } catch {
      console.error('FCM request failed');
      return { sent: false };
    }
  }));
  for (const result of sendResults) {
    if (result.sent) {
      sent += 1;
    } else {
      failed += 1;
    }
  }
  return Response.json({ sent, failed });
});
