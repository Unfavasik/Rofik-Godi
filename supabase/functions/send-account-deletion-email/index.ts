/// <reference lib="deno.ns" />

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const APP_URL = 'https://rofik-godi.pages.dev';
const STORE_NAME = 'ROFIK GODI CENTRE';
const STORE_SUBTITLE = 'CUSTOM SEAT COMFORT';
const STORE_EMAIL = 'rofikgodicentre.store@gmail.com';
const STORE_PHONE = '+91 9775333555';
const DELETE_PATH = '/account/settings/delete-account';
const ALLOWED_ORIGINS = new Set([APP_URL, 'http://localhost:3000', 'http://127.0.0.1:3000']);

type EmailEvent = 'scheduled' | 'cancelled';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(date);
}

function appUrl(): string {
  return new URL(DELETE_PATH, APP_URL).toString();
}

function emailShell(subject: string, content: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title><style>@media only screen and (max-width:600px){.container{width:100%!important}.pad{padding-left:18px!important;padding-right:18px!important}}</style></head><body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f8fb;padding:24px 10px"><tr><td align="center"><table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e8edf3;border-radius:16px;overflow:hidden"><tr><td class="pad" style="padding:24px 28px;background:#ffffff;border-bottom:3px solid #d9232d"><div style="font-size:18px;font-weight:800;letter-spacing:.06em;color:#0f172a">${STORE_NAME}</div><div style="margin-top:4px;font-size:10px;font-weight:700;letter-spacing:.18em;color:#d9232d">${STORE_SUBTITLE}</div></td></tr>${content}<tr><td class="pad" style="padding:22px 28px 24px;border-top:1px solid #edf0f4"><div style="font-size:12px;font-weight:800;letter-spacing:.05em;color:#0f172a">${STORE_NAME}</div><div style="margin-top:6px;font-size:12px;color:#64748b">Need help? <a href="mailto:${STORE_EMAIL}" style="color:#1a73e8;text-decoration:underline">${STORE_EMAIL}</a> · ${STORE_PHONE}</div></td></tr></table></td></tr></table></body></html>`;
}

function buildEmail(event: EmailEvent, name: string, scheduledFor: string) {
  const safeName = escapeHtml(name || 'Rider');
  const date = escapeHtml(formatDate(scheduledFor));
  const link = appUrl();
  if (event === 'scheduled') {
    const subject = 'Account deletion request received | Rofik Godi Centre';
    const content = `<tr><td class="pad" style="padding:28px 28px 8px"><div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#fff1f2;color:#b91c1c;font-size:11px;font-weight:700">DELETION REQUEST RECEIVED</div><h1 style="margin:15px 0 8px;font-size:24px;line-height:1.25;color:#0f172a">We’ll keep your account safe for 7 days.</h1><p style="margin:0;font-size:14px;line-height:1.65;color:#475569">Hi ${safeName}, your account deletion request has been received. Your account remains active until <strong style="color:#0f172a">${date}</strong>.</p></td></tr><tr><td class="pad" style="padding:20px 28px"><div style="padding:16px;border:1px solid #fecdd3;border-radius:14px;background:#fff7f7"><div style="font-size:13px;font-weight:800;color:#991b1b">You can still change your mind</div><div style="margin-top:7px;font-size:12px;line-height:1.65;color:#7f1d1d">Nothing will be permanently removed during the grace period. Open your account settings and cancel the request before the date above.</div></div></td></tr><tr><td class="pad" style="padding:0 28px 24px"><a href="${link}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#d9232d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Review deletion request</a></td></tr>`;
    const text = `${STORE_NAME}\n\nHi ${name || 'Rider'},\n\nYour account deletion request has been received. Your account remains active until ${formatDate(scheduledFor)}.\n\nNothing will be permanently removed during the 7-day grace period. You can cancel the request here: ${link}\n\nNeed help? ${STORE_EMAIL} · ${STORE_PHONE}`;
    return { subject, text, html: emailShell(subject, content) };
  }

  const subject = 'Account deletion request cancelled | Rofik Godi Centre';
  const content = `<tr><td class="pad" style="padding:28px 28px 8px"><div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#e8f8f0;color:#087443;font-size:11px;font-weight:700">REQUEST CANCELLED</div><h1 style="margin:15px 0 8px;font-size:24px;line-height:1.25;color:#0f172a">Your account is safe.</h1><p style="margin:0;font-size:14px;line-height:1.65;color:#475569">Hi ${safeName}, your account deletion request has been cancelled successfully. Your profile, saved items and account access remain active.</p></td></tr><tr><td class="pad" style="padding:20px 28px 24px"><a href="${APP_URL}/profile" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">Open my account</a></td></tr>`;
  const text = `${STORE_NAME}\n\nHi ${name || 'Rider'},\n\nYour account deletion request has been cancelled successfully. Your profile, saved items and account access remain active.\n\nOpen your account: ${APP_URL}/profile\n\nNeed help? ${STORE_EMAIL} · ${STORE_PHONE}`;
  return { subject, text, html: emailShell(subject, content) };
}

function getEmailConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const senderEmail = Deno.env.get('ROFIK_GODI_GMAIL')?.trim() || '';
  const appPassword = (Deno.env.get('ROFIK_GODI_GMAIL_APP_PASSWORD') || '').replace(/\s+/g, '');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !validEmail(senderEmail) || !appPassword) return null;
  return { supabaseUrl, publishableKey, serviceRoleKey, senderEmail, appPassword };
}

async function sendMail(config: NonNullable<ReturnType<typeof getEmailConfig>>, to: string, subject: string, text: string, html: string) {
  const client = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: config.senderEmail, password: config.appPassword } }, debug: { log: false, allowUnsecure: false } });
  try {
    await client.send({ from: `${STORE_NAME} <${config.senderEmail}>`, to, subject, content: text, html });
    return true;
  } catch {
    return false;
  } finally {
    try { await client.close(); } catch { /* keep SMTP details private */ }
  }
}

function headers(origin: string | null) {
  return { 'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : APP_URL, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
}

function response(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers(origin), 'Content-Type': 'application/json; charset=utf-8' } });
}

async function claimLog(serviceClient: SupabaseClient, userId: string, event: EmailEvent, scheduledFor: string) {
  const { error } = await serviceClient.from('account_deletion_email_logs').insert({ user_id: userId, event, scheduled_for: scheduledFor, status: 'processing', attempt_count: 1 });
  if (!error) return 'claimed' as const;
  if (error.code === '23505') return 'duplicate' as const;
  return 'failed' as const;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: headers(origin) });
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405, origin);
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) return response({ error: 'Authentication required' }, 401, origin);
    const body = await request.json() as { event?: unknown };
    const event = body.event;
    if (event !== 'scheduled' && event !== 'cancelled') return response({ error: 'Unsupported email event' }, 400, origin);
    const config = getEmailConfig();
    if (!config) return response({ error: 'Email service is temporarily unavailable' }, 503, origin);
    const userClient = createClient(config.supabaseUrl, config.publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const serviceClient = createClient(config.supabaseUrl, config.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return response({ error: 'Authentication required' }, 401, origin);
    const recipient = (authData.user.email || '').trim();
    if (!validEmail(recipient)) return response({ ok: true, emailSent: false, reason: 'no_valid_email' }, 200, origin);
    const { data: deletion, error: deletionError } = await serviceClient.from('account_deletion_requests').select('status,scheduled_for').eq('user_id', authData.user.id).maybeSingle();
    if (deletionError || !deletion) return response({ error: 'Deletion request not found' }, 404, origin);
    const expectedStatus = event === 'scheduled' ? 'scheduled' : 'cancelled';
    if (deletion.status !== expectedStatus) return response({ error: 'Deletion request status is not current' }, 409, origin);
    const claim = await claimLog(serviceClient, authData.user.id, event, deletion.scheduled_for);
    if (claim === 'duplicate') return response({ ok: true, emailSent: false, duplicate: true }, 200, origin);
    if (claim === 'failed') return response({ error: 'Email delivery could not be queued' }, 503, origin);
    const name = String(authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || 'Rider').trim().slice(0, 120) || 'Rider';
    const email = buildEmail(event, name, deletion.scheduled_for);
    const sent = await sendMail(config, recipient, email.subject, email.text, email.html);
    await serviceClient.from('account_deletion_email_logs').update({ status: sent ? 'sent' : 'failed', last_error_code: sent ? null : 'SMTP_DELIVERY_FAILED', sent_at: sent ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('user_id', authData.user.id).eq('event', event).eq('scheduled_for', deletion.scheduled_for);
    return response({ ok: true, emailSent: sent }, 200, origin);
  } catch {
    return response({ error: 'Email service is temporarily unavailable' }, 503, origin);
  }
});
