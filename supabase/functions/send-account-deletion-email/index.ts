/// <reference lib="deno.ns" />

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const APP_URL = 'https://rofik-godi.pages.dev';
const STORE_NAME = 'ROFIK GODI CENTRE';
const STORE_SUBTITLE = 'LOCAL RIDE ESSENTIALS';
const STORE_EMAIL = 'rofikgodicentre.store@gmail.com';
const STORE_PHONE = '+91 9775333555';
const DELETE_PATH = '/account/settings/delete-account';
const RED = '#d9232d';
const NAVY = '#101828';
const MUTED = '#667085';
const LINE = '#e8edf3';
const LOG_TABLE = 'account_deletion_email_logs';
const ALLOWED_ORIGINS = new Set([APP_URL, 'http://localhost:3000', 'http://127.0.0.1:3000']);
type EmailEvent = 'scheduled' | 'cancelled';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ||
      character,
  );
}
function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}
function appUrl(path = DELETE_PATH): string {
  return new URL(path, APP_URL).toString();
}
function shell(subject: string, topStripHtml: string, badgeHtml: string, content: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title><style>@media only screen and (max-width:600px){.outer{padding:12px 6px!important}.container{width:100%!important;border-radius:14px!important}.pad{padding-left:18px!important;padding-right:18px!important}.hero{font-size:23px!important}.grid-cell{padding:5px!important}}</style></head><body style="margin:0;padding:24px 8px;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:${NAVY}"><table role="presentation" class="outer" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f7f9;padding:24px 8px"><tr><td align="center"><table role="presentation" class="container" width="500" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:500px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 8px 25px rgba(16,24,40,.10)">${topStripHtml}<tr><td class="pad" style="padding:16px 22px;border-bottom:1px solid #f0e4da"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="38" style="width:38px;height:38px;border-radius:10px;background:${RED};color:#fff;text-align:center;vertical-align:middle;font-size:14px;font-weight:900">RG</td><td style="padding-left:10px;vertical-align:middle"><div style="font-size:15px;font-weight:900;letter-spacing:.04em;color:${NAVY}">${STORE_NAME}</div><div style="margin-top:3px;font-size:8.5px;font-weight:900;letter-spacing:.18em;color:${RED}">${STORE_SUBTITLE}</div></td><td align="right" style="vertical-align:middle">${badgeHtml}</td></tr></table></td></tr>${content}<tr><td class="pad" style="padding:18px 20px 22px;border-top:1px solid #edf0f4;text-align:center;background:#fff"><div style="font-size:12px;font-weight:900;letter-spacing:.05em;color:${NAVY}">${STORE_NAME}</div><div style="margin-top:4px;font-size:11px;line-height:1.6;color:#475467">Jalangi Road, Raninagar, Keshobnagar, Berhampore, West Bengal 742102</div><div style="margin-top:7px;font-size:11px;line-height:1.8"><a href="https://maps.app.goo.gl/hRVfWHTkQ6vkrcS7A" style="color:#a71925;font-weight:800;text-decoration:underline">Open in Google Maps</a> · <a href="tel:+919775333555" style="color:#344054;font-weight:700;text-decoration:underline">${STORE_PHONE}</a><br><a href="mailto:${STORE_EMAIL}" style="color:#1a73e8;font-weight:800;text-decoration:underline">${STORE_EMAIL}</a></div></td></tr></table></td></tr></table></body></html>`;
}
function pill(label: string, success = false): string {
  return `<div style="display:inline-block;padding:7px 11px;border-radius:999px;background:${success ? '#ecfdf3' : '#fff1f2'};color:${success ? '#087443' : '#b42318'};font-size:11px;font-weight:900;letter-spacing:.06em">${label}</div>`;
}
function getEmailConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey =
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const senderEmail = Deno.env.get('ROFIK_GODI_GMAIL')?.trim() || '';
  const appPassword = (Deno.env.get('ROFIK_GODI_GMAIL_APP_PASSWORD') || '').replace(/\s+/g, '');
  if (
    !supabaseUrl ||
    !publishableKey ||
    !serviceRoleKey ||
    !validEmail(senderEmail) ||
    !appPassword
  )
    return null;
  return { supabaseUrl, publishableKey, serviceRoleKey, senderEmail, appPassword };
}
async function sendMail(
  config: NonNullable<ReturnType<typeof getEmailConfig>>,
  to: string,
  subject: string,
  text: string,
  html: string,
) {
  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: config.senderEmail, password: config.appPassword },
    },
    debug: { log: false, allowUnsecure: false },
  });
  try {
    await client.send({
      from: `${STORE_NAME} <${config.senderEmail}>`,
      to,
      subject,
      content: text,
      html,
    });
    console.info('[account-deletion-email] SMTP accepted message');
    return true;
  } catch (error) {
    console.error(
      '[account-deletion-email] SMTP send failed',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return false;
  } finally {
    try {
      await client.close();
    } catch {
      /* keep SMTP details private */
    }
  }
}
function headers(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : APP_URL,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
function response(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}
async function claimLog(
  serviceClient: SupabaseClient,
  userId: string,
  event: EmailEvent,
  scheduledFor: string,
): Promise<'claimed' | 'duplicate' | 'failed'> {
  const { error: insertError } = await serviceClient.from(LOG_TABLE).insert({
    user_id: userId,
    event,
    scheduled_for: scheduledFor,
    status: 'processing',
    attempt_count: 1,
    last_error_code: null,
  });
  if (!insertError) return 'claimed';
  if (insertError.code !== '23505') return 'failed';
  const { data: current, error: readError } = await serviceClient
    .from(LOG_TABLE)
    .select('id,status,updated_at,attempt_count')
    .eq('user_id', userId)
    .eq('event', event)
    .eq('scheduled_for', scheduledFor)
    .maybeSingle();
  if (readError || !current) return 'failed';
  const stale = current.status === 'processing' && Date.parse(String(current.updated_at)) < Date.now() - 5 * 60 * 1000;
  if (current.status === 'sent' || (current.status === 'processing' && !stale)) return 'duplicate';
  if (Number(current.attempt_count || 1) >= 20) return 'duplicate';
  const { data, error: retryError } = await serviceClient
    .from(LOG_TABLE)
    .update({
      status: 'processing',
      attempt_count: Number(current.attempt_count || 1) + 1,
      last_error_code: null,
      sent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', current.id)
    .eq('status', current.status)
    .select('id')
    .maybeSingle();
  if (retryError) return 'failed';
  return data ? 'claimed' : 'duplicate';
}

async function updateLog(
  serviceClient: SupabaseClient,
  userId: string,
  event: EmailEvent,
  scheduledFor: string,
  status: 'sent' | 'failed',
) {
  await serviceClient
    .from(LOG_TABLE)
    .update({
      status,
      last_error_code: status === 'sent' ? null : 'SMTP_DELIVERY_FAILED',
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('event', event)
    .eq('scheduled_for', scheduledFor);
}

function buildEmail(event: EmailEvent, nameValue: string, scheduledFor: string) {
  const name = escapeHtml(nameValue || 'Rider');
  const date = escapeHtml(formatDate(scheduledFor));
  const scheduledAt = Date.parse(scheduledFor);
  const daysLeft = Number.isFinite(scheduledAt)
    ? Math.max(0, Math.ceil((scheduledAt - Date.now()) / 86_400_000))
    : 7;
  const dayLabel = `${daysLeft} Day${daysLeft === 1 ? '' : 's'} Left`;
  const assetBase = `${APP_URL}/images/account-deletion`;

  if (event === 'scheduled') {
    const subject = 'Account deletion request received | Rofik Godi Centre';
    const topStrip = `<tr><td align="center" style="background:#f5e2d3;padding:8px 12px;font-size:10px;font-weight:800;letter-spacing:.05em;color:#1f2937;text-transform:uppercase">ACCOUNT SECURITY · <span style="color:${RED}">7-DAY GRACE PERIOD ACTIVE</span></td></tr>`;
    const badge = `<span style="display:inline-block;padding:5px 9px;border-radius:999px;background:#fff1f2;color:#a73539;font-size:9px;font-weight:800;white-space:nowrap">7-DAY GRACE PERIOD</span>`;
    const content = `
<tr><td style="background:#fdf2ed;padding:0"><img src="${assetBase}/deletion-scheduled-hero.jpg" alt="7-Day Account Protection Window" width="500" style="display:block;width:100%;max-width:500px;height:auto;border:0"></td></tr>
<tr><td class="pad" style="padding:24px 22px 8px;text-align:center"><span style="display:inline-block;padding:6px 11px;border-radius:999px;background:#fff1f2;color:#a73539;font-size:10px;font-weight:900;letter-spacing:.05em">DELETION REQUEST RECEIVED</span><h1 class="hero" style="margin:12px 0 8px;font-size:24px;line-height:1.2;letter-spacing:-.02em;color:${NAVY}">We’ll keep your account safe for 7 days.</h1><p style="margin:0 auto;max-width:420px;font-size:13px;line-height:1.6;color:#475467">Hi ${name}, we’ve received your request to delete your Rofik Godi Centre account. Nothing is removed right now — your account remains active until <strong style="color:#a73539">${date}</strong>.</p></td></tr>
<tr><td class="pad" style="padding:13px 20px 6px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff8f6;border:1px solid #fecdd3;border-radius:14px"><tr><td style="padding:14px 15px 10px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="vertical-align:top"><div style="font-size:9px;font-weight:800;letter-spacing:.07em;color:#991b1b;text-transform:uppercase">SCHEDULED REMOVAL DATE</div><div style="margin-top:4px;font-size:16px;font-weight:900;color:${NAVY}">${date}</div></td><td align="right" style="vertical-align:top"><div style="font-size:9px;font-weight:800;letter-spacing:.07em;color:#991b1b;text-transform:uppercase">GRACE WINDOW</div><div style="margin-top:4px;font-size:13px;font-weight:900;color:${RED}">${dayLabel}</div></td></tr></table><div style="margin-top:10px;padding-top:9px;border-top:1px dashed #fecdd3;font-size:11px;line-height:1.55;color:#7f1d1d"><strong style="color:#991b1b">You can still change your mind:</strong> Cancel the request any time before <strong>${date}</strong> to keep your profile, wishlist, and order history intact.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:10px"><tr><td style="height:6px;background:#ffe4e6;border-radius:99px;font-size:0;line-height:0"><div style="height:6px;width:35%;background:${RED};border-radius:99px;font-size:0;line-height:0">&nbsp;</div></td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:5px"><tr><td style="font-size:9px;font-weight:700;color:#991b1b">Request received</td><td align="center" style="font-size:9px;font-weight:700;color:#991b1b">7-day grace period</td><td align="right" style="font-size:9px;font-weight:700;color:#991b1b">Permanent removal</td></tr></table></td></tr></table></td></tr>
<tr><td class="pad" style="padding:11px 20px 15px;text-align:center"><a href="${escapeHtml(appUrl())}" style="display:block;padding:13px 14px;border-radius:11px;background:${RED};color:#fff;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:.02em;box-shadow:0 5px 14px rgba(217,35,45,.22)">Review or Cancel Deletion Request</a></td></tr>
<tr><td style="background:#f8fafc;padding:18px 16px 17px;border-top:1px solid #eef2f6"><div style="text-align:center;font-size:12px;font-weight:900;letter-spacing:.04em;color:${NAVY};text-transform:uppercase;margin-bottom:10px">WHAT WILL BE REMOVED AFTER ${date}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="grid-cell" width="50%" style="padding:4px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff;border:1px solid #e2e8f0;border-radius:9px"><tr><td style="padding:10px"><div style="font-size:11px;font-weight:800;color:${NAVY}"><span style="display:inline-block;padding:5px 7px;margin-right:5px;border-radius:7px;background:#fff1f2;color:${RED}">♙</span>Profile Info</div><div style="margin-top:4px;font-size:10px;line-height:1.4;color:#475467">Name, phone number, avatar photo &amp; login details.</div></td></tr></table></td><td class="grid-cell" width="50%" style="padding:4px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff;border:1px solid #e2e8f0;border-radius:9px"><tr><td style="padding:10px"><div style="font-size:11px;font-weight:800;color:${NAVY}"><span style="display:inline-block;padding:5px 7px;margin-right:5px;border-radius:7px;background:#fff1f2;color:${RED}">♡</span>Saved Items</div><div style="margin-top:4px;font-size:10px;line-height:1.4;color:#475467">Wishlist items, vehicle fitment &amp; stock alerts.</div></td></tr></table></td></tr><tr><td class="grid-cell" width="50%" style="padding:4px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff;border:1px solid #e2e8f0;border-radius:9px"><tr><td style="padding:10px"><div style="font-size:11px;font-weight:800;color:${NAVY}"><span style="display:inline-block;padding:5px 7px;margin-right:5px;border-radius:7px;background:#fff1f2;color:${RED}">✉</span>Support &amp; Alerts</div><div style="margin-top:4px;font-size:10px;line-height:1.4;color:#475467">In-app notifications &amp; support messages.</div></td></tr></table></td><td class="grid-cell" width="50%" style="padding:4px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff;border:1px solid #e2e8f0;border-radius:9px"><tr><td style="padding:10px"><div style="font-size:11px;font-weight:800;color:${NAVY}"><span style="display:inline-block;padding:5px 7px;margin-right:5px;border-radius:7px;background:#fff1f2;color:${RED}">▣</span>Order Identity</div><div style="margin-top:4px;font-size:10px;line-height:1.4;color:#475467">Past orders stay only as anonymized store records.</div></td></tr></table></td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:9px"><tr><td width="30" style="padding:9px 0 9px 10px;vertical-align:top;color:#92400e;font-size:15px">!</td><td style="padding:9px 10px 9px 4px;font-size:10px;line-height:1.45;color:#92400e"><strong>Didn’t request this deletion?</strong> Cancel the request immediately using the button above and contact our team.</td></tr></table></td></tr>`;
    const text = `${STORE_NAME}\n\nHi ${nameValue || 'Rider'}, we’ve received your request to delete your Rofik Godi Centre account. Nothing is removed now; your account remains active until ${formatDate(scheduledFor)}.\n\nCancel the request: ${appUrl()}\n\nNeed help? ${STORE_EMAIL} · ${STORE_PHONE}`;
    return { subject, text, html: shell(subject, topStrip, badge, content) };
  }

  const subject = 'Account deletion request cancelled | Rofik Godi Centre';
  const topStrip = `<tr><td align="center" style="background:#d1fadf;padding:8px 12px;font-size:10px;font-weight:800;letter-spacing:.05em;color:#087443;text-transform:uppercase">ACCOUNT SECURITY · DELETION CANCELLED &amp; RESTORED</td></tr>`;
  const badge = `<span style="display:inline-block;padding:5px 9px;border-radius:999px;background:#ecfdf3;color:#087443;font-size:9px;font-weight:800">ACCOUNT ACTIVE</span>`;
  const content = `<tr><td style="background:#ecfdf5;padding:0"><img src="${assetBase}/deletion-cancelled-hero.jpg" alt="Account Safe and Active" width="500" style="display:block;width:100%;max-width:500px;height:auto;border:0"></td></tr><tr><td class="pad" style="padding:24px 22px 8px;text-align:center"><span style="display:inline-block;padding:6px 11px;border-radius:999px;background:#ecfdf3;color:#087443;font-size:10px;font-weight:900;letter-spacing:.05em">REQUEST CANCELLED</span><h1 class="hero" style="margin:12px 0 8px;font-size:24px;line-height:1.2;color:${NAVY}">Your account is safe.</h1><p style="margin:0 auto;max-width:420px;font-size:13px;line-height:1.6;color:#475467">Hi ${name}, your account deletion request has been cancelled successfully. Your profile, saved items and account access remain active.</p></td></tr><tr><td class="pad" style="padding:13px 20px 7px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px"><tr><td style="padding:15px"><div style="font-size:13px;font-weight:900;color:#087443">Welcome back whenever you’re ready.</div><div style="margin-top:5px;font-size:11px;line-height:1.55;color:#166534">No data was removed from your account. Your saved items, order history and profile settings are still available.</div></td></tr></table></td></tr><tr><td class="pad" style="padding:12px 20px 18px;text-align:center"><a href="${escapeHtml(appUrl('/profile'))}" style="display:block;padding:13px 14px;border-radius:11px;background:${NAVY};color:#fff;text-decoration:none;font-size:13px;font-weight:900">Open My Account</a></td></tr>`;
  const text = `${STORE_NAME}\n\nHi ${nameValue || 'Rider'}, your account deletion request has been cancelled successfully. Your profile, saved items and account access remain active.\n\nOpen your account: ${appUrl('/profile')}\n\nNeed help? ${STORE_EMAIL} · ${STORE_PHONE}`;
  return { subject, text, html: shell(subject, topStrip, badge, content) };
}
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: headers(origin) });
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin);
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer '))
      return response({ error: 'Authentication required' }, 401, origin);
    let body: { event?: unknown };
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return response({ error: 'Invalid request body' }, 400, origin);
      }
      body = parsed as typeof body;
    } catch {
      return response({ error: 'Invalid request body' }, 400, origin);
    }
    const event = body.event;
    if (event !== 'scheduled' && event !== 'cancelled')
      return response({ error: 'Unsupported email event' }, 400, origin);
    const config = getEmailConfig();
    if (!config)
      return response({ error: 'Email service is temporarily unavailable' }, 503, origin);
    const userClient = createClient(config.supabaseUrl, config.publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const serviceClient = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user)
      return response({ error: 'Authentication required' }, 401, origin);
    const recipient = (authData.user.email || '').trim();
    if (!validEmail(recipient))
      return response({ ok: true, emailSent: false, reason: 'no_valid_email' }, 200, origin);
    const { data: deletion, error: deletionError } = await serviceClient
      .from('account_deletion_requests')
      .select('status,scheduled_for')
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (deletionError || !deletion)
      return response({ error: 'Deletion request not found' }, 404, origin);
    const expectedStatus = event === 'scheduled' ? 'scheduled' : 'cancelled';
    if (deletion.status !== expectedStatus)
      return response({ error: 'Deletion request status is not current' }, 409, origin);
    const claim = await claimLog(serviceClient, authData.user.id, event, deletion.scheduled_for);
    if (claim === 'duplicate')
      return response({ ok: true, emailSent: false, duplicate: true }, 200, origin);
    if (claim === 'failed')
      return response({ error: 'Email delivery could not be queued' }, 503, origin);
    const rawName = String(authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || 'Rider');
    const name = rawName.replace(/[\r\n\t\x00-\x1f\x7f]/g, ' ').trim().slice(0, 120) || 'Rider';
    const email = buildEmail(event, name, deletion.scheduled_for);
    const sent = await sendMail(config, recipient, email.subject, email.text, email.html);
    await updateLog(serviceClient, authData.user.id, event, deletion.scheduled_for, sent ? 'sent' : 'failed');
    return response({ ok: true, emailSent: sent }, 200, origin);
  } catch {
    return response({ error: 'Email service is temporarily unavailable' }, 503, origin);
  }
});
