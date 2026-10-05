/// <reference lib="deno.ns" />

import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import {
  buildOrderConfirmationEmail,
  buildOrderStatusEmail,
  buildWelcomeEmail,
  isValidCustomerEmail,
  type ConfirmationEmailOrder,
  type OrderEmailEvent,
} from './email-template.ts';

const CONFIRMATION_LOG_TABLE = 'order_confirmation_email_logs';
const STATUS_LOG_TABLE = 'order_status_email_logs';
const WELCOME_LOG_TABLE = 'welcome_email_logs';
const PUBLIC_APP_URL = 'https://rofik-godi.pages.dev';
const ALLOWED_WEB_ORIGINS = new Set([PUBLIC_APP_URL, 'http://localhost:3000', 'http://127.0.0.1:3000']);
const ALLOWED_STATUS_EVENTS = new Set<OrderEmailEvent>(['COMPLETED']);
const allowedHeaders = 'authorization, x-client-info, apikey, content-type';

function responseHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_WEB_ORIGINS.has(origin) ? origin : PUBLIC_APP_URL,
    'Access-Control-Allow-Headers': allowedHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function isOrderNumber(value: unknown): value is string {
  return typeof value === 'string' && /^RGC-[A-F0-9]{12}$/i.test(value.trim());
}

function accountUrl(_origin: string | null, path = '/profile'): string | null {
  try {
    return new URL(path, PUBLIC_APP_URL).toString();
  } catch {
    return null;
  }
}

function getEmailConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const senderEmail = Deno.env.get('ROFIK_GODI_GMAIL')?.trim() || '';
  const appPassword = (Deno.env.get('ROFIK_GODI_GMAIL_APP_PASSWORD') || '').replace(/\s+/g, '');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !senderEmail || !appPassword || !isValidCustomerEmail(senderEmail)) {
    return null;
  }
  return { supabaseUrl, publishableKey, serviceRoleKey, senderEmail, appPassword };
}

async function sendMail(
  credentials: NonNullable<ReturnType<typeof getEmailConfig>>,
  to: string,
  subject: string,
  text: string,
  html: string,
  orderNumber?: string,
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
      from: `ROFIK GODI CENTRE <${credentials.senderEmail}>`,
      to,
      subject,
      content: text,
      html,
      headers: orderNumber ? { 'X-Order-Number': orderNumber } : {},
    });
    return true;
  } catch {
    return false;
  } finally {
    if (client) {
      try { await client.close(); } catch { /* Do not log SMTP credentials or provider details. */ }
    }
  }
}

async function setLogStatus(
  serviceClient: any,
  table: string,
  filters: Record<string, string>,
  status: 'sent' | 'failed' | 'skipped',
  errorCode: string | null = null,
) {
  const values: Record<string, unknown> = {
    status,
    last_error_code: errorCode,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  };
  if (table === CONFIRMATION_LOG_TABLE) values.attempted_at = new Date().toISOString();
  else values.updated_at = new Date().toISOString();
  let query = serviceClient.from(table).update(values);
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const { error } = await query;
  if (error) console.error('Transactional email ledger update failed', { table, status });
}

async function claimRetryableLog(
  serviceClient: any,
  table: string,
  filters: Record<string, string>,
  insertValues: Record<string, unknown>,
): Promise<'claimed' | 'duplicate' | 'failed'> {
  const { error: insertError } = await serviceClient.from(table).insert(insertValues);
  if (!insertError) return 'claimed';
  if (insertError.code !== '23505') return 'failed';

  let readQuery = serviceClient.from(table).select('status,updated_at,attempt_count');
  for (const [column, value] of Object.entries(filters)) readQuery = readQuery.eq(column, value);
  const { data: current, error: readError } = await readQuery.maybeSingle();
  if (readError || !current) return 'failed';

  const isStaleProcessing = current.status === 'processing'
    && Date.parse(String(current.updated_at)) < Date.now() - 5 * 60 * 1000;
  if (current.status !== 'failed' && !isStaleProcessing) return 'duplicate';

  const attemptCount = Number(current.attempt_count || 1);
  if (attemptCount >= 20) return 'duplicate';
  let retryQuery = serviceClient.from(table)
    .update({
      status: 'processing',
      last_error_code: null,
      sent_at: null,
      updated_at: new Date().toISOString(),
      attempt_count: attemptCount + 1,
    })
    .eq('status', current.status)
    .eq('updated_at', current.updated_at)
    .select(Object.keys(filters).join(','));
  for (const [column, value] of Object.entries(filters)) retryQuery = retryQuery.eq(column, value);
  const { data, error: retryError } = await retryQuery.maybeSingle();
  if (retryError) return 'failed';
  return data ? 'claimed' : 'duplicate';
}

async function claimConfirmationLog(
  serviceClient: any,
  orderId: string,
  userId: string,
  hasRecipient: boolean,
): Promise<'claimed' | 'duplicate' | 'failed'> {
  const initialStatus = hasRecipient ? 'processing' : 'skipped';
  const { error: insertError } = await serviceClient.from(CONFIRMATION_LOG_TABLE).insert({
    order_id: orderId,
    user_id: userId,
    status: initialStatus,
    last_error_code: hasRecipient ? null : 'NO_VALID_CUSTOMER_EMAIL',
  });
  if (!insertError) return 'claimed';
  if (insertError.code !== '23505') return 'failed';

  const { data: current, error: readError } = await serviceClient
    .from(CONFIRMATION_LOG_TABLE)
    .select('status,attempted_at')
    .eq('order_id', orderId)
    .maybeSingle();
  if (readError || !current) return 'failed';
  const isStaleProcessing = current.status === 'processing'
    && Date.parse(String(current.attempted_at)) < Date.now() - 5 * 60 * 1000;
  if (!hasRecipient || (current.status !== 'failed' && !isStaleProcessing)) return 'duplicate';

  const { data, error: retryError } = await serviceClient
    .from(CONFIRMATION_LOG_TABLE)
    .update({ status: 'processing', last_error_code: null, sent_at: null, attempted_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('status', current.status)
    .eq('attempted_at', current.attempted_at)
    .select('order_id')
    .maybeSingle();
  if (retryError) return 'failed';
  return data ? 'claimed' : 'duplicate';
}

async function createClients(
  supabaseUrl: string,
  publishableKey: string,
  serviceRoleKey: string,
  authorization: string,
) {
  const userClient: any = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient: any = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return { error: 'Authentication required' as const };
  return { userClient, serviceClient, user: authData.user };
}

async function handleWelcomeEmail(
  origin: string | null,
  credentials: NonNullable<ReturnType<typeof getEmailConfig>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown>; email_confirmed_at?: string | null; confirmed_at?: string | null; created_at?: string },
  serviceClient: any,
) {
  const recipient = (user.email || '').trim();
  const createdAt = user.created_at ? Date.parse(user.created_at) : NaN;
  const isRecentAccount = Number.isFinite(createdAt) && Date.now() - createdAt <= 30 * 24 * 60 * 60 * 1000;
  if (!isValidCustomerEmail(recipient) || !(user.email_confirmed_at || user.confirmed_at) || !isRecentAccount) {
    return jsonResponse({ ok: true, emailSent: false, reason: 'not_a_recent_confirmed_account' }, 200, origin);
  }

  const claim = await claimRetryableLog(
    serviceClient,
    WELCOME_LOG_TABLE,
    { user_id: user.id },
    { user_id: user.id, status: 'processing', last_error_code: null },
  );
  if (claim === 'duplicate') return jsonResponse({ ok: true, emailSent: false, duplicate: true }, 200, origin);
  if (claim === 'failed') return jsonResponse({ error: 'Welcome email could not be queued' }, 503, origin);

  const fullName = String(user.user_metadata?.full_name || user.user_metadata?.name || 'Rider').trim().slice(0, 120) || 'Rider';
  const email = buildWelcomeEmail(fullName, accountUrl(origin, '/home'));
  const sent = await sendMail(credentials, recipient, email.subject, email.text, email.html);
  await setLogStatus(serviceClient, WELCOME_LOG_TABLE, { user_id: user.id }, sent ? 'sent' : 'failed', sent ? null : 'SMTP_DELIVERY_FAILED');
  if (!sent) {
    console.warn('Welcome email delivery failed');
    return jsonResponse({ ok: true, emailSent: false }, 200, origin);
  }
  console.info('Welcome email sent');
  return jsonResponse({ ok: true, emailSent: true }, 200, origin);
}

async function handleOrderConfirmation(
  origin: string | null,
  credentials: NonNullable<ReturnType<typeof getEmailConfig>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  serviceClient: any,
  orderNumber: string,
) {
  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id,user_id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,fulfillment_method,pickup_store,created_at,order_items(product_id,product_name,quantity,unit_price)')
    .eq('user_id', user.id)
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (orderError || !order) return jsonResponse({ error: 'Order not found' }, 404, origin);

  const recipient = (user.email || '').trim();
  let productImages = new Map<string, string>();
  const productIds = [...new Set((order.order_items || []).map((item: { product_id?: string | null }) => item.product_id).filter((id: string | null | undefined): id is string => Boolean(id)))];
  if (productIds.length) {
    const { data: products } = await serviceClient.from('products').select('id,image_url').in('id', productIds);
    productImages = new Map((products || []).map((product: { id: string; image_url?: string | null }) => [String(product.id), String(product.image_url || '')]));
  }

  const emailItems = (order.order_items || []).map((item: { product_id?: string | null; product_name: string; quantity: number; unit_price: number }) => ({
    product_name: item.product_name,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    image_url: item.product_id ? productImages.get(item.product_id) || null : null,
  }));
  const hasRecipient = isValidCustomerEmail(recipient);
  const claim = await claimConfirmationLog(serviceClient, order.id, user.id, hasRecipient);
  if (claim === 'duplicate') return jsonResponse({ ok: true, emailSent: false, duplicate: true }, 200, origin);
  if (claim === 'failed') {
    console.error('Order confirmation email idempotency claim failed');
    return jsonResponse({ error: 'Email could not be queued' }, 503, origin);
  }
  if (!hasRecipient) return jsonResponse({ ok: true, emailSent: false, reason: 'no_valid_customer_email' }, 200, origin);

  const emailData: ConfirmationEmailOrder = {
    orderNumber: order.order_number,
    createdAt: order.created_at,
    customerName: String(order.customer_name || user.user_metadata?.full_name || 'Customer').slice(0, 120),
    customerPhone: order.customer_phone || '',
    customerEmail: recipient,
    pickupStore: order.pickup_store || '',
    fulfillmentMethod: order.fulfillment_method || '',
    status: order.status || 'NEW',
    paymentStatus: order.payment_status || 'PENDING',
    paymentMethod: order.payment_method || 'PAY_AT_STORE',
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    items: emailItems,
    orderUrl: accountUrl(origin),
  };
  const email = buildOrderConfirmationEmail(emailData);
  const sent = await sendMail(credentials, recipient, email.subject, email.text, email.html, order.order_number);
  await setLogStatus(serviceClient, CONFIRMATION_LOG_TABLE, { order_id: order.id }, sent ? 'sent' : 'failed', sent ? null : 'SMTP_DELIVERY_FAILED');
  if (!sent) {
    console.warn('Order confirmation email delivery failed');
    return jsonResponse({ ok: true, emailSent: false }, 200, origin);
  }
  console.info('Order confirmation email sent', { orderNumber: order.order_number });
  return jsonResponse({ ok: true, emailSent: true }, 200, origin);
}

async function handleOrderStatusEmail(
  origin: string | null,
  credentials: NonNullable<ReturnType<typeof getEmailConfig>>,
  userClient: any,
  serviceClient: any,
  event: OrderEmailEvent,
  orderNumber: string,
) {
  const { data: isAdmin, error: adminError } = await userClient.rpc('is_admin');
  if (adminError || isAdmin !== true) return jsonResponse({ error: 'Administrator access is required' }, 403, origin);

  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id,user_id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,fulfillment_method,pickup_store,created_at,order_items(product_id,product_name,quantity,unit_price)')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (orderError || !order || order.fulfillment_method !== 'STORE_PICKUP') {
    return jsonResponse({ error: 'Store-pickup order not found' }, 404, origin);
  }
  const eventIsCurrent = String(order.status || '').toUpperCase() === event;
  let eventWasRecorded = eventIsCurrent;
  if (!eventWasRecorded) {
    const { data: statusHistory, error: historyError } = await serviceClient
      .from('order_status_history')
      .select('id')
      .eq('order_id', order.id)
      .eq('to_status', event)
      .limit(1)
      .maybeSingle();
    eventWasRecorded = !historyError && Boolean(statusHistory);
  }
  if (!eventWasRecorded) return jsonResponse({ ok: true, emailSent: false, reason: 'stale_order_event' }, 200, origin);

  const claim = await claimRetryableLog(
    serviceClient,
    STATUS_LOG_TABLE,
    { order_id: order.id, event_key: event },
    { order_id: order.id, event_key: event, status: 'processing', last_error_code: null },
  );
  if (claim === 'duplicate') return jsonResponse({ ok: true, emailSent: false, duplicate: true }, 200, origin);
  if (claim === 'failed') return jsonResponse({ error: 'Order update email could not be queued' }, 503, origin);

  const { data: customerData, error: customerError } = await serviceClient.auth.admin.getUserById(order.user_id);
  const recipient = (customerData.user?.email || '').trim();
  if (customerError || !isValidCustomerEmail(recipient)) {
    await setLogStatus(serviceClient, STATUS_LOG_TABLE, { order_id: order.id, event_key: event }, 'skipped', 'NO_VALID_CUSTOMER_EMAIL');
    return jsonResponse({ ok: true, emailSent: false, reason: 'no_valid_customer_email' }, 200, origin);
  }

  let productImages = new Map<string, string>();
  const productIds = [...new Set((order.order_items || []).map((item: { product_id?: string | null }) => item.product_id).filter((id: string | null | undefined): id is string => Boolean(id)))];
  if (productIds.length) {
    const { data: products } = await serviceClient.from('products').select('id,image_url').in('id', productIds);
    productImages = new Map((products || []).map((product: { id: string; image_url?: string | null }) => [String(product.id), String(product.image_url || '')]));
  }
  const emailItems = (order.order_items || []).map((item: { product_id?: string | null; product_name: string; quantity: number; unit_price: number }) => ({
    product_name: item.product_name,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    image_url: item.product_id ? productImages.get(item.product_id) || null : null,
  }));
  const email = buildOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: String(order.customer_name || customerData.user?.user_metadata?.full_name || 'Rider').slice(0, 120),
    pickupStore: order.pickup_store || 'ROFIK GODI CENTRE',
    event,
    items: emailItems,
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    paymentStatus: order.payment_status || 'PENDING',
    paymentMethod: order.payment_method || 'PAY_AT_STORE',
    orderUrl: accountUrl(origin),
  });
  const sent = await sendMail(credentials, recipient, email.subject, email.text, email.html, order.order_number);
  await setLogStatus(serviceClient, STATUS_LOG_TABLE, { order_id: order.id, event_key: event }, sent ? 'sent' : 'failed', sent ? null : 'SMTP_DELIVERY_FAILED');
  if (!sent) {
    console.warn('Order status email delivery failed', { event });
    return jsonResponse({ ok: true, emailSent: false }, 200, origin);
  }
  console.info('Order status email sent', { event });
  return jsonResponse({ ok: true, emailSent: true }, 200, origin);
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: responseHeaders(origin) });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, origin);

  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ error: 'Authentication required' }, 401, origin);
    }

    let body: { type?: unknown; orderNumber?: unknown; event?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400, origin);
    }
    const type = body.type === undefined ? 'order_confirmation' : body.type;
    if (type !== 'order_confirmation' && type !== 'order_status_update' && type !== 'welcome') {
      return jsonResponse({ error: 'Unsupported email type' }, 400, origin);
    }

    const credentials = getEmailConfig();
    if (!credentials) {
      console.error('Transactional email configuration is incomplete');
      return jsonResponse({ error: 'Email service is temporarily unavailable' }, 503, origin);
    }
    const clients = await createClients(
      credentials.supabaseUrl,
      credentials.publishableKey,
      credentials.serviceRoleKey,
      authorization,
    );
    if ('error' in clients) return jsonResponse({ error: clients.error }, 401, origin);

    if (type === 'welcome') {
      return await handleWelcomeEmail(origin, credentials, clients.user, clients.serviceClient);
    }
    if (!isOrderNumber(body.orderNumber)) return jsonResponse({ error: 'Invalid order number' }, 400, origin);
    const orderNumber = body.orderNumber.trim().toUpperCase();

    if (type === 'order_confirmation') {
      return await handleOrderConfirmation(origin, credentials, clients.user, clients.serviceClient, orderNumber);
    }
    if (typeof body.event !== 'string' || !ALLOWED_STATUS_EVENTS.has(body.event as OrderEmailEvent)) {
      return jsonResponse({ error: 'Invalid order update event' }, 400, origin);
    }
    return await handleOrderStatusEmail(
      origin,
      credentials,
      clients.userClient,
      clients.serviceClient,
      body.event as OrderEmailEvent,
      orderNumber,
    );
  } catch {
    console.error('Transactional email request failed');
    return jsonResponse({ error: 'Email service is temporarily unavailable' }, 503, request.headers.get('origin'));
  }
});
