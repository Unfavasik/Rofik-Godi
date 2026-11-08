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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title><style>@media only screen and (max-width:600px){.outer{padding:12px 6px!important}.container{width:100%!important;border-radius:14px!important}.pad{padding-left:18px!important;padding-right:18px!important}.hero{font-size:24px!important}}</style></head><body style="margin:0;background:#fff7ef;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;color:${NAVY}"><table role="presentation" class="outer" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff7ef;padding:32px 10px"><tr><td align="center"><table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #f0e4da;border-radius:20px;overflow:hidden;box-shadow:0 12px 34px rgba(16,24,40,.08)">${topStripHtml}<tr><td class="pad" style="padding:18px 28px;border-bottom:1px solid #f0e4da"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="38" style="width:38px;height:38px;border-radius:11px;background:${RED};color:#fff;text-align:center;vertical-align:middle;font-size:15px;font-weight:900">RG</td><td style="padding-left:12px;vertical-align:middle"><div style="font-size:16px;font-weight:900;letter-spacing:.05em;color:${NAVY}">${STORE_NAME}</div><div style="margin-top:3px;font-size:9px;font-weight:900;letter-spacing:.18em;color:${RED}">${STORE_SUBTITLE}</div></td><td align="right" style="vertical-align:middle">${badgeHtml}</td></tr></table></td></tr>${content}<tr><td class="pad" style="padding:20px 28px 24px;border-top:1px solid #edf0f4;text-align:center"><div style="font-size:12px;font-weight:900;letter-spacing:.05em;color:${NAVY}">${STORE_NAME}</div><div style="margin-top:6px;font-size:12px;line-height:1.65;color:${MUTED}">Need help? <a href="mailto:${STORE_EMAIL}" style="color:#1a73e8;text-decoration:underline;font-weight:800">${STORE_EMAIL}</a> · ${STORE_PHONE}</div></td></tr></table></td></tr></table></body></html>`;
}
function pill(label: string, success = false): string {
  return `<div style="display:inline-block;padding:7px 12px;border-radius:999px;background:${success ? '#ecfdf3' : '#fff1f2'};color:${success ? '#087443' : '#b42318'};font-size:11px;font-weight:900;letter-spacing:.06em">${label}</div>`;
}

export function buildEmail(event: EmailEvent, nameValue: string, scheduledFor: string) {
  const name = escapeHtml(nameValue || 'Rider');
  const date = escapeHtml(formatDate(scheduledFor));
  const manageUrl = appUrl();
  const assetBase = `${APP_URL}/images/account-deletion`;

  if (event === 'scheduled') {
    const subject = 'Account deletion request received | Rofik Godi Centre';
    const topStrip = `<tr><td align="center" style="background:#F5E2D3;padding:9px 16px;font-size:10.5px;font-weight:800;letter-spacing:.06em;color:#1F2937;text-transform:uppercase">ACCOUNT SECURITY · <span style="color:${RED}">7-DAY GRACE PERIOD ACTIVE</span></td></tr>`;
    const badge = `<span style="display:inline-block;padding:5px 10px;border-radius:999px;background:#fff1f2;color:#b42318;font-size:10px;font-weight:800">7-DAY GRACE PERIOD</span>`;
    const content = `<tr><td style="background:#FDF2ED;padding:0"><img src="${assetBase}/deletion-scheduled-hero.jpg" alt="7-Day Account Protection Window" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr><tr><td class="pad" style="padding:26px 28px 10px;text-align:center">${pill('DELETION REQUEST RECEIVED')}<h1 class="hero" style="margin:14px 0 8px;font-size:26px;line-height:1.22;letter-spacing:-.02em;color:${NAVY}">We’ll keep your account safe for 7 days.</h1><p style="margin:0 auto;max-width:440px;font-size:14px;line-height:1.7;color:#475467">Hi ${name}, your request has been received. Nothing is removed right now — your account remains active until <strong style="color:${NAVY}">${date}</strong>.</p></td></tr><tr><td class="pad" style="padding:16px 28px 8px"><div style="padding:18px;border:1px solid #fecdd3;border-radius:16px;background:#fff7f7"><div style="font-size:14px;font-weight:900;color:#991b1b">You can still change your mind</div><div style="margin-top:6px;font-size:12.5px;line-height:1.7;color:#7f1d1d">Nothing will be permanently removed during the grace period. Cancel the request before <strong>${date}</strong> to keep your account, saved favourites, and order history.</div></div></td></tr><tr><td class="pad" style="padding:14px 28px 22px;text-align:center"><a href="${manageUrl}" style="display:inline-block;padding:14px 28px;border-radius:11px;background:${RED};color:#fff;text-decoration:none;font-size:14px;font-weight:900">Review or Cancel Deletion Request</a></td></tr><tr><td class="pad" style="background:#f8fafc;padding:20px 28px;border-top:1px solid #edf0f4"><div style="font-size:12px;font-weight:900;letter-spacing:.05em;color:${NAVY};text-transform:uppercase;margin-bottom:8px">What will be removed after ${date}:</div><div style="font-size:12px;line-height:1.85;color:#475467">• <strong style="color:${NAVY}">Profile information:</strong> Name, phone number, avatar &amp; login details<br>• <strong style="color:${NAVY}">Saved items:</strong> Wishlist, preferences &amp; stock alerts<br>• <strong style="color:${NAVY}">Messages &amp; support:</strong> Notifications &amp; support conversations<br>• <strong style="color:${NAVY}">Order identity:</strong> Past orders stay only as anonymized store records</div></td></tr>`;
    const text = `${STORE_NAME}\n\nHi ${nameValue || 'Rider'},\n\nYour account deletion request has been received. Your account remains active until ${formatDate(scheduledFor)}.\n\nNothing will be permanently removed during the 7-day grace period. Cancel the request here: ${manageUrl}\n\nNeed help? ${STORE_EMAIL} · ${STORE_PHONE}`;
    return { subject, text, html: shell(subject, topStrip, badge, content) };
  }

  const subject = 'Account deletion request cancelled | Rofik Godi Centre';
  const topStrip = `<tr><td align="center" style="background:#D1FADF;padding:9px 16px;font-size:10.5px;font-weight:800;letter-spacing:.06em;color:#087443;text-transform:uppercase">ACCOUNT SECURITY · DELETION CANCELLED &amp; RESTORED</td></tr>`;
  const badge = `<span style="display:inline-block;padding:5px 10px;border-radius:999px;background:#ecfdf3;color:#087443;font-size:10px;font-weight:800">ACCOUNT ACTIVE</span>`;
  const content = `<tr><td style="background:#ECFDF5;padding:0"><img src="${assetBase}/deletion-cancelled-hero.jpg" alt="Account Safe and Active" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr><tr><td class="pad" style="padding:26px 28px 10px;text-align:center">${pill('REQUEST CANCELLED', true)}<h1 class="hero" style="margin:14px 0 8px;font-size:26px;line-height:1.22;letter-spacing:-.02em;color:${NAVY}">Your account is safe.</h1><p style="margin:0 auto;max-width:440px;font-size:14px;line-height:1.7;color:#475467">Hi ${name}, your account deletion request has been cancelled successfully. Your profile, saved items and account access remain active.</p></td></tr><tr><td class="pad" style="padding:16px 28px 25px"><div style="padding:18px;border:1px solid #d1fadf;border-radius:16px;background:#f0fdf4"><div style="font-size:14px;font-weight:900;color:#087443">Welcome back whenever you’re ready.</div><div style="margin-top:7px;font-size:12.5px;line-height:1.7;color:#166534">Your saved favourites, store-pickup order history, and profile settings are still available in your account.</div></div><div style="margin-top:18px;text-align:center"><a href="${appUrl('/profile')}" style="display:inline-block;padding:14px 28px;border-radius:11px;background:${NAVY};color:#fff;text-decoration:none;font-size:14px;font-weight:900">Open my account</a></div></td></tr>`;
  const text = `${STORE_NAME}\n\nHi ${nameValue || 'Rider'},\n\nYour account deletion request has been cancelled successfully. Your profile, saved items and account access remain active.\n\nOpen your account: ${appUrl('/profile')}\n\nNeed help? ${STORE_EMAIL} · ${STORE_PHONE}`;
  return { subject, text, html: shell(subject, topStrip, badge, content) };
}
const LOG_TABLE = 'account_deletion_email_logs';
const allowedHeaders = 'authorization, x-client-info, apikey, content-type';

function responseHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : APP_URL,
    'Access-Control-Allow-Headers': allowedHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function getEmailConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const senderEmail = Deno.env.get('ROFIK_GODI_GMAIL')?.trim() || '';
  const appPassword = (Deno.env.get('ROFIK_GODI_GMAIL_APP_PASSWORD') || '').replace(/\s+/g, '');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !senderEmail || !appPassword || !validEmail(senderEmail)) return null;
  return { supabaseUrl, publishableKey, serviceRoleKey, senderEmail, appPassword };
}

async function sendMail(
  credentials: NonNullable<ReturnType<typeof getEmailConfig>>,
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<boolean> {
  let client: SMTPClient | null = null;
  try {
    client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: { username: credentials.senderEmail, password: credentials.appPassword },
      },
      debug: { log: false, allowUnsecure: false },
    });
    await client.send({
      from: `${STORE_NAME} <${credentials.senderEmail}>`,
      to,
      subject,
      content: text,
      html,
    });
    return true;
  } catch {
    return false;
  } finally {
    if (client) {
      try { await client.close(); } catch { /* Do not expose SMTP details. */ }
    }
  }
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

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: responseHeaders(origin) });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) return jsonResponse({ error: 'Authentication required' }, 401, origin);
    let body: { event?: unknown };
    try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request body' }, 400, origin); }
    if (body.event !== 'scheduled' && body.event !== 'cancelled') return jsonResponse({ error: 'Invalid email event' }, 400, origin);
    const event = body.event as EmailEvent;
    const credentials = getEmailConfig();
    if (!credentials) return jsonResponse({ error: 'Email service is temporarily unavailable' }, 503, origin);
    const userClient = createClient(credentials.supabaseUrl, credentials.publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const serviceClient = createClient(credentials.supabaseUrl, credentials.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: 'Authentication required' }, 401, origin);
    const recipient = (authData.user.email || '').trim();
    if (!validEmail(recipient)) return jsonResponse({ ok: true, emailSent: false, reason: 'NO_VALID_CUSTOMER_EMAIL' }, 200, origin);
    const { data: deletionRequest, error: requestError } = await serviceClient
      .from('account_deletion_requests')
      .select('status,scheduled_for')
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (requestError || !deletionRequest) return jsonResponse({ error: 'Account deletion request not found' }, 404, origin);
    if ((event === 'scheduled' && deletionRequest.status !== 'scheduled') || (event === 'cancelled' && deletionRequest.status !== 'cancelled')) {
      return jsonResponse({ error: 'Account deletion state does not match email event' }, 409, origin);
    }
    const scheduledFor = String(deletionRequest.scheduled_for);
    const claim = await claimLog(serviceClient, authData.user.id, event, scheduledFor);
    if (claim === 'duplicate') return jsonResponse({ ok: true, emailSent: false, duplicate: true }, 200, origin);
    if (claim === 'failed') return jsonResponse({ error: 'Could not queue account email' }, 503, origin);
    const fullName = String(authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || 'Rider').trim().slice(0, 120) || 'Rider';
    const email = buildEmail(event, fullName, scheduledFor);
    const sent = await sendMail(credentials, recipient, email.subject, email.text, email.html);
    await updateLog(serviceClient, authData.user.id, event, scheduledFor, sent ? 'sent' : 'failed');
    return jsonResponse({ ok: true, emailSent: sent }, 200, origin);
  } catch {
    return jsonResponse({ error: 'Account email service is temporarily unavailable' }, 503, request.headers.get('origin'));
  }
});
