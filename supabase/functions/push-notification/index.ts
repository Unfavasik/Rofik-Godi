import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  action_url: string | null;
  image_url: string | null;
  expires_at: string | null;
};

type WebhookPayload = {
  type: string;
  table: string;
  schema: string;
  record: NotificationRow | null;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

let cachedAccessToken = '';
let cachedAccessTokenExpiresAt = 0;

function orderSlugFromActionUrl(actionUrl: string | null) {
  if (!actionUrl) return null;
  const match = actionUrl.match(/^\/(?:my-orders|myorder|my-order)\/order\/([0-9a-f]{32})$/i);
  return match?.[1]?.toLowerCase() || null;
}

// Order pushes must always carry the order slug so a tap opens the order detail
// page directly, even when the stored action link is the legacy list-only /my-orders.
async function resolveOrderSlugForNotification(
  supabase: ReturnType<typeof createClient>,
  notification: NotificationRow,
) {
  const fromActionUrl = orderSlugFromActionUrl(notification.action_url);
  if (fromActionUrl) return fromActionUrl;
  if (notification.kind !== 'order') return null;
  const orderNumber = `${notification.title} ${notification.body} ${notification.action_url || ''}`
    .match(/\bRGC-[A-Z0-9]{8,32}\b/i)?.[0]?.toUpperCase();
  if (!orderNumber) return null;
  const { data: order } = await supabase
    .from('orders')
    .select('order_slug')
    .eq('user_id', notification.user_id)
    .eq('order_number', orderNumber)
    .limit(1)
    .maybeSingle();
  const slug = typeof order?.order_slug === 'string' ? order.order_slug.trim().toLowerCase() : '';
  return /^[0-9a-f]{32}$/.test(slug) ? slug : null;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getDefaultProjectSecret() {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const keys = JSON.parse(raw);
      if (typeof keys.default === 'string') return keys.default;
    } catch {
      return '';
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

function hasValidProjectSecret(apiKey: string | null) {
  const expected = getDefaultProjectSecret();
  if (!apiKey || !expected || apiKey.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= apiKey.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

async function getFcmAccessToken(serviceAccount: FirebaseServiceAccount) {
  if (cachedAccessToken && cachedAccessTokenExpiresAt > Date.now() + 60_000) {
    return cachedAccessToken;
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600,
  })));
  const unsignedJwt = `${header}.${claims}`;
  const pem = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const keyBytes = Uint8Array.from(atob(pem), (character) => character.charCodeAt(0));
  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signingKey, new TextEncoder().encode(unsignedJwt));
  const assertion = `${unsignedJwt}.${base64UrlEncode(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== 'string') {
    throw new Error(`FCM_AUTH_FAILED_${response.status}`);
  }
  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

function safeFcmError(data: Record<string, unknown>) {
  const error = data.error as Record<string, unknown> | undefined;
  const details = Array.isArray(error?.details) ? error.details as Array<Record<string, unknown>> : [];
  const coded = details.find((detail) => typeof detail.errorCode === 'string')?.errorCode;
  return String(coded || error?.status || 'FCM_SEND_FAILED').slice(0, 80);
}

function isVersionAtLeast(version: string | null | undefined, minimum: string) {
  if (!version) return false;
  const actual = version.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const required = minimum.split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(actual.length, required.length); index += 1) {
    const difference = (actual[index] || 0) - (required[index] || 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}

function inferNotificationType(kind: string, title: string, body: string) {
  const text = `${kind} ${title} ${body}`.toLowerCase();
  if (kind.trim().toLowerCase() === 'security' || text.includes('security')) return 'account_security';
  if (text.includes('completed') || text.includes('picked up') || text.includes('picked_up')) return 'order_completed';
  if (text.includes('payment') || text.includes('paid')) return 'payment_confirmed';
  if (text.includes('ready') || text.includes('pickup')) return 'pickup_ready';
  if (text.includes('order')) return 'order_update';
  if (text.includes('coupon') || text.includes('offer') || text.includes('promo')) return 'offer';
  if (text.includes('arrival') || text.includes('product')) return 'product_arrival';
  return 'general';
}

function parseFirebaseServiceAccount(raw: string): FirebaseServiceAccount {
  let text = raw.trim().replace(/^\uFEFF/, '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) text = text.slice(firstBrace, lastBrace + 1);
  const escapedPem = text.replace(
    /("private_key"\s*:\s*")([\s\S]*?)("\s*[,}])/,
    (_match, prefix: string, key: string, suffix: string) => `${prefix}${key.replace(/\r?\n/g, '\\n')}${suffix}`,
  );
  for (const candidate of [text, escapedPem]) {
    try {
      let parsed = JSON.parse(candidate);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (parsed && typeof parsed === 'object') return parsed as FirebaseServiceAccount;
    } catch {
      // Try the newline-normalized PEM variant before failing.
    }
  }
  throw new Error('Firebase service-account JSON could not be parsed');
}

async function resolveNotificationImageUrl(
  supabase: ReturnType<typeof createClient>,
  notification: NotificationRow,
) {
  if (notification.image_url) return notification.image_url;
  if (notification.kind === 'order') {
    const orderNumber = `${notification.title} ${notification.body} ${notification.action_url || ''}`
      .match(/\bRGC-[A-Z0-9]{8,32}\b/i)?.[0]?.toUpperCase();
    if (!orderNumber) return null;
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', notification.user_id)
      .eq('order_number', orderNumber)
      .limit(1)
      .maybeSingle();
    if (!order?.id) return null;
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id')
      .eq('order_id', order.id)
      .not('product_id', 'is', null)
      .limit(5);
    const productIds = [...new Set((orderItems || []).map((item) => item.product_id).filter((id): id is string => Boolean(id)))];
    if (!productIds.length) return null;
    const { data: products } = await supabase
      .from('products')
      .select('image_url')
      .in('id', productIds)
      .limit(5);
    const imageUrl = products?.find((product) => typeof product.image_url === 'string' && product.image_url.trim())?.image_url;
    if (!imageUrl) return null;
    try {
      const parsed = new URL(imageUrl);
      return parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
      return null;
    }
  }
  if (!notification.action_url?.startsWith('/admin/activity') && !notification.action_url?.startsWith('/admin/support')) return null;
  let requestId: string;
  try {
    requestId = new URL(notification.action_url, 'https://rofik-godi.invalid').searchParams.get('support_request') || '';
  } catch {
    return null;
  }
  if (!requestId) return null;
  const { data: events } = await supabase
    .from('admin_activity_events')
    .select('details,created_at')
    .eq('entity_type', 'support_request')
    .eq('entity_id', requestId)
    .eq('event_type', 'support_request_message_received')
    .order('created_at', { ascending: false })
    .limit(1);
  const details = events?.[0]?.details;
  const attachments = details && typeof details === 'object' && Array.isArray((details as Record<string, unknown>).attachments)
    ? (details as Record<string, unknown>).attachments as Array<Record<string, unknown>>
    : [];
  const image = attachments.find((attachment) =>
    typeof attachment.path === 'string' && typeof attachment.mime_type === 'string' && attachment.mime_type.startsWith('image/'),
  );
  if (!image || typeof image.path !== 'string') return null;
  const { data: signed } = await supabase.storage.from('support-attachments').createSignedUrl(image.path, 3600);
  return signed?.signedUrl || null;
}

// Mirrors the client-side category mapping in src/lib/notificationCategory.ts so a
// category the user disabled never reaches their device as a push notification.
type NotificationPreferenceCategory = 'offers' | 'orderUpdates' | 'workshopAlerts' | 'systemUpdates';

function isSupportNotificationRow(notification: NotificationRow): boolean {
  let supportPath = false;
  try {
    supportPath = /^\/support\/[^/]+\/?$/i.test(new URL(notification.action_url || '', 'https://rofikgodi.invalid').pathname);
  } catch {
    supportPath = false;
  }
  const text = `${notification.kind} ${notification.title} ${notification.body}`.toLowerCase();
  return supportPath || text.includes('support request') || text.includes('support ticket') ||
    text.includes('workshop replied') || text.includes('support reply');
}

function resolveNotificationPreferenceCategory(notification: NotificationRow): NotificationPreferenceCategory {
  if (isSupportNotificationRow(notification)) return 'workshopAlerts';
  const kind = notification.kind.toLowerCase();
  const text = `${notification.title} ${notification.body}`.toLowerCase();
  if (kind.includes('order') || kind.includes('pickup') || text.includes('order #') || text.includes('order ')) return 'orderUpdates';
  if (kind.includes('offer') || kind.includes('promo') || kind.includes('coupon') || text.includes('special offer') || text.includes('coupon')) return 'offers';
  return 'systemUpdates';
}

function isCategoryEnabledInMetadata(metadata: Record<string, unknown>, category: NotificationPreferenceCategory): boolean {
  const preferences = metadata.notification_preferences;
  if (!preferences || typeof preferences !== 'object') return true;
  return (preferences as Record<string, unknown>)[category] !== false;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  // Database Webhooks send the project's default secret key in the `apikey` header.
  if (!hasValidProjectSecret(request.headers.get('apikey'))) return jsonResponse({ error: 'Unauthorized' }, 401);

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }
  if (payload.type !== 'INSERT' || payload.schema !== 'public' || payload.table !== 'notifications') {
    return jsonResponse({ ignored: true });
  }
  const notification = payload.record;
  if (!notification?.id || !notification.user_id || !notification.title || !notification.body) {
    return jsonResponse({ error: 'Notification payload is incomplete' }, 400);
  }
  if (notification.expires_at && Date.parse(notification.expires_at) <= Date.now()) {
    return jsonResponse({ skipped: 'expired' });
  }

  const serviceAccountText = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKeysText = Deno.env.get('SUPABASE_SECRET_KEYS');
  let serviceKey = getDefaultProjectSecret();
  if (!serviceKey && secretKeysText) {
    try {
      const secretKeys = JSON.parse(secretKeysText);
      serviceKey = secretKeys.default || secretKeys.service_role || '';
    } catch {
      return jsonResponse({ error: 'Supabase service key configuration is invalid' }, 500);
    }
  }
  if (!serviceAccountText || !supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Push service is not configured' }, 500);
  }

  let serviceAccount: FirebaseServiceAccount;
  try {
    serviceAccount = parseFirebaseServiceAccount(serviceAccountText);
  } catch {
    return jsonResponse({ error: 'Firebase service account JSON is invalid' }, 500);
  }
  if (serviceAccount.project_id !== 'rofik-godi-centre' || !serviceAccount.client_email || !serviceAccount.private_key) {
    return jsonResponse({ error: 'Firebase service account does not match this app' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // Fail open on preference lookup errors so a transient failure never swallows an order push.
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notification.user_id);
  if (!userError && userData?.user) {
    const category = resolveNotificationPreferenceCategory(notification);
    if (!isCategoryEnabledInMetadata(userData.user.user_metadata ?? {}, category)) {
      return jsonResponse({ sent: 0, skipped: `disabled_${category}` });
    }
  }
  const { data: devices, error: devicesError } = await supabase
    .from('push_devices')
    .select('id,token,app_version')
    .eq('user_id', notification.user_id)
    .limit(200);
  if (devicesError) return jsonResponse({ error: 'Could not load registered devices' }, 500);
  if (!devices?.length) return jsonResponse({ sent: 0, skipped: 'no_registered_devices' });

  let accessToken: string;
  try {
    accessToken = await getFcmAccessToken(serviceAccount);
  } catch {
    return jsonResponse({ error: 'Could not authenticate with Firebase FCM' }, 502);
  }

  let sent = 0;
  let failed = 0;
  const notificationImageUrl = await resolveNotificationImageUrl(supabase, notification);
  const orderSlug = notification.kind === 'order'
    ? await resolveOrderSlugForNotification(supabase, notification)
    : null;
  for (const device of devices) {
    const { data: previous } = await supabase
      .from('push_delivery_logs')
      .select('status')
      .eq('notification_id', notification.id)
      .eq('device_id', device.id)
      .limit(1)
      .maybeSingle();
    if (previous?.status === 'sent') continue;
    const attemptedAt = new Date().toISOString();
    const { error: claimError } = await supabase.from('push_delivery_logs').upsert({
      notification_id: notification.id,
      device_id: device.id,
      status: 'processing',
      last_error_code: null,
      attempted_at: attemptedAt,
      sent_at: null,
    }, { onConflict: 'notification_id,device_id' });
    if (claimError) {
      failed += 1;
      continue;
    }

    const styledAndroidClient = isVersionAtLeast(device.app_version, '1.1.39');
    const notificationType = inferNotificationType(notification.kind, notification.title, notification.body);
    const message: Record<string, unknown> = {
      token: device.token,
      data: {
        notification_id: notification.id,
        kind: notification.kind || 'general',
        type: notificationType,
        title: notification.title,
        body: notification.body,
        action_url: notification.action_url || '',
        ...(orderSlug ? { order_slug: orderSlug } : {}),
        image_url: notificationImageUrl || '',
      },
      android: {
        priority: styledAndroidClient || notification.kind === 'order' ? 'HIGH' : 'NORMAL',
        ...(!styledAndroidClient ? {
          notification: {
            channel_id: 'rofik-godi-updates-premium-v1',
            sound: 'rofik_notification',
            icon: 'ic_stat_rofik',
            color: '#D9232D',
            ...(notificationImageUrl ? { image: notificationImageUrl } : {}),
          },
        } : {}),
      },
      ...(!styledAndroidClient ? {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notificationImageUrl ? { image: notificationImageUrl } : {}),
        },
      } : {}),
    };
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (response.ok) {
      sent += 1;
      await supabase.from('push_delivery_logs').update({ status: 'sent', sent_at: new Date().toISOString(), last_error_code: null })
        .eq('notification_id', notification.id).eq('device_id', device.id);
    } else {
      failed += 1;
      const errorCode = safeFcmError(result);
      await supabase.from('push_delivery_logs').update({ status: 'failed', last_error_code: errorCode })
        .eq('notification_id', notification.id).eq('device_id', device.id);
      if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
        await supabase.from('push_devices').delete().eq('id', device.id);
      }
    }
  }
  return jsonResponse({ sent, failed });
});
