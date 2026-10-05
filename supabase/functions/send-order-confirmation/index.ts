import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts';
import { buildOrderConfirmationEmail, isValidCustomerEmail } from './email-template.ts';

const LOG_TABLE = 'order_confirmation_email_logs';
const allowedHeaders = 'authorization, x-client-info, apikey, content-type';

function responseHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || 'null',
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

function accountUrl(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const parsed = new URL(origin);
    const isLocalHttp = parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (parsed.protocol !== 'https:' && !isLocalHttp) return null;
    return new URL('/profile', parsed.origin).toString();
  } catch {
    return null;
  }
}

async function setEmailLogStatus(
  serviceClient: ReturnType<typeof createClient>,
  orderId: string,
  status: 'sent' | 'failed' | 'skipped',
  errorCode: string | null = null,
) {
  const { error } = await serviceClient
    .from(LOG_TABLE)
    .update({
      status,
      last_error_code: errorCode,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    })
    .eq('order_id', orderId);
  if (error) console.error('Order confirmation email ledger update failed', { status });
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const senderEmail = Deno.env.get('ROFIK_GODI_GMAIL')?.trim() || '';
    const appPassword = (Deno.env.get('ROFIK_GODI_GMAIL_APP_PASSWORD') || '').replace(/\s+/g, '');
    if (!supabaseUrl || !publishableKey || !serviceRoleKey || !senderEmail || !appPassword || !isValidCustomerEmail(senderEmail)) {
      console.error('Order confirmation email configuration is incomplete');
      return jsonResponse({ error: 'Email service is temporarily unavailable' }, 503, origin);
    }

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: 'Authentication required' }, 401, origin);

    let body: { orderNumber?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400, origin);
    }
    if (!isOrderNumber(body.orderNumber)) return jsonResponse({ error: 'Invalid order number' }, 400, origin);
    const orderNumber = body.orderNumber.trim().toUpperCase();

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select('id,user_id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,fulfillment_method,pickup_store,created_at,order_items(product_id,product_name,quantity,unit_price)')
      .eq('user_id', authData.user.id)
      .eq('order_number', orderNumber)
      .maybeSingle();
    if (orderError || !order) return jsonResponse({ error: 'Order not found' }, 404, origin);

    const recipient = (authData.user.email || '').trim();
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
    const { error: claimError } = await serviceClient.from(LOG_TABLE).insert({
      order_id: order.id,
      user_id: authData.user.id,
      status: hasRecipient ? 'processing' : 'skipped',
      last_error_code: hasRecipient ? null : 'NO_VALID_CUSTOMER_EMAIL',
    });
    if (claimError?.code === '23505') return jsonResponse({ ok: true, emailSent: false, duplicate: true }, 200, origin);
    if (claimError) {
      console.error('Order confirmation email idempotency claim failed', { orderNumber });
      return jsonResponse({ error: 'Email could not be queued' }, 503, origin);
    }
    if (!hasRecipient) {
      console.info('Order confirmation email skipped: no valid customer email', { orderNumber });
      return jsonResponse({ ok: true, emailSent: false, reason: 'no_valid_customer_email' }, 200, origin);
    }

    const email = buildOrderConfirmationEmail({
      orderNumber: order.order_number,
      createdAt: order.created_at,
      customerName: order.customer_name || authData.user.user_metadata?.full_name || 'Customer',
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
    });

    let client: SMTPClient | null = null;
    try {
      client = new SMTPClient({
        connection: {
          hostname: 'smtp.gmail.com',
          port: 465,
          tls: true,
          auth: { username: senderEmail, password: appPassword },
        },
        debug: { log: false, allowUnsecure: false },
      });
      await client.send({
        from: `ROFIK GODI CENTRE <${senderEmail}>`,
        to: recipient,
        subject: email.subject,
        content: email.text,
        html: email.html,
        headers: { 'X-Order-Number': order.order_number },
      });
      await setEmailLogStatus(serviceClient, order.id, 'sent');
      console.info('Order confirmation email sent', { orderNumber });
      return jsonResponse({ ok: true, emailSent: true }, 200, origin);
    } catch {
      await setEmailLogStatus(serviceClient, order.id, 'failed', 'SMTP_DELIVERY_FAILED');
      console.warn('Order confirmation email delivery failed', { orderNumber });
      return jsonResponse({ ok: true, emailSent: false }, 200, origin);
    } finally {
      if (client) {
        try { await client.close(); } catch { /* No credential or SMTP detail is logged. */ }
      }
    }
  } catch {
    console.error('Order confirmation email request failed');
    return jsonResponse({ error: 'Email service is temporarily unavailable' }, 503, origin);
  }
});
