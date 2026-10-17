import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function verifyWebhookSignature(rawBody: Uint8Array, signatureHex: string, secret: string): Promise<boolean> {
  const signature = hexToBytes(signatureHex);
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return await crypto.subtle.verify("HMAC", key, signature, rawBody);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Webhook is not configured." }, 503);
  }

  const rawBody = new Uint8Array(await req.arrayBuffer());
  const signature = req.headers.get("x-razorpay-signature") || "";
  if (!await verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return json({ error: "Invalid Razorpay webhook signature." }, 401);
  }

  let event: { event?: string; payload?: { payment?: { entity?: {
    id?: string; order_id?: string; amount?: number; currency?: string; status?: string; captured?: boolean;
  } } } };
  try {
    event = JSON.parse(new TextDecoder().decode(rawBody)) as typeof event;
  } catch {
    return json({ error: "Invalid webhook JSON." }, 400);
  }

  // Acknowledge unrelated subscribed events. Payment state changes only for a captured payment.
  if (event.event !== "payment.captured") return json({ received: true, ignored: true });
  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id || !Number.isSafeInteger(payment.amount)
    || payment.currency !== "INR" || (payment.status !== "captured" && payment.captured !== true)) {
    return json({ error: "Captured payment details are incomplete." }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await serviceClient.rpc("mark_razorpay_payment_paid", {
    p_razorpay_order_id: payment.order_id,
    p_razorpay_payment_id: payment.id,
    p_amount_paise: payment.amount,
    p_currency: payment.currency,
  });
  if (error || !data) {
    // A non-2xx response asks Razorpay to retry after a transient database failure.
    return json({ error: "Payment event could not be recorded yet." }, 503);
  }

  return json({ received: true, recorded: true, alreadyVerified: data.already_verified === true });
});
