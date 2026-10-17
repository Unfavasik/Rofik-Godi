import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function verifyCheckoutSignature(message: string, signatureHex: string, secret: string): Promise<boolean> {
  const signature = hexToBytes(signatureHex);
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(message));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
    return json({ error: "Razorpay is not configured on the Supabase project yet." }, 503);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in before verifying payment." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Your sign-in session has expired. Sign in again." }, 401);

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
    const providerOrderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";
    if (!/^RGC-[A-F0-9]{12}$/i.test(orderNumber)
      || !/^order_[A-Za-z0-9]+$/.test(providerOrderId)
      || !/^pay_[A-Za-z0-9]+$/.test(paymentId)
      || !hexToBytes(signature)) {
      return json({ error: "Razorpay returned invalid payment details." }, 400);
    }

    const signatureValid = await verifyCheckoutSignature(
      `${providerOrderId}|${paymentId}`,
      signature,
      razorpayKeySecret,
    );
    if (!signatureValid) return json({ error: "Razorpay payment signature is invalid." }, 400);

    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("id,order_number,user_id,payment_method,payment_status,status,total")
      .eq("order_number", orderNumber)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (orderError || !order) return json({ error: "Order not found for this account." }, 404);
    if (order.payment_method !== "PAY_ONLINE" || order.status === "CANCELLED") {
      return json({ error: "This order cannot accept an online payment." }, 409);
    }

    const { data: attempt, error: attemptError } = await serviceClient
      .from("payments")
      .select("provider_order_id,amount,currency")
      .eq("order_id", order.id)
      .eq("provider", "RAZORPAY")
      .eq("provider_order_id", providerOrderId)
      .maybeSingle();
    if (attemptError || !attempt) return json({ error: "Razorpay order is not linked to this order." }, 409);

    const providerResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}` },
    });
    if (!providerResponse.ok) return json({ error: "Razorpay could not confirm the payment. Check My Orders before retrying." }, 502);
    const providerPayment = await providerResponse.json() as {
      id?: string; order_id?: string; amount?: number; currency?: string; status?: string; captured?: boolean;
    };

    const totalRupees = Number(order.total);
    const expectedPaise = totalRupees * 100;
    if (providerPayment.id !== paymentId
      || providerPayment.order_id !== providerOrderId
      || providerPayment.amount !== expectedPaise
      || providerPayment.currency !== "INR"
      || Number(attempt.amount) !== totalRupees
      || attempt.currency !== "INR") {
      return json({ error: "Razorpay payment details do not match the order total." }, 409);
    }
    if (providerPayment.status !== "captured" && providerPayment.captured !== true) {
      return json({ error: "Razorpay has not captured this payment yet. Check My Orders for the latest status." }, 409);
    }

    const { data: result, error: recordError } = await serviceClient.rpc("mark_razorpay_payment_paid", {
      p_razorpay_order_id: providerOrderId,
      p_razorpay_payment_id: paymentId,
      p_amount_paise: expectedPaise,
      p_currency: "INR",
    });
    if (recordError || !result) return json({ error: "Payment is confirmed by Razorpay but the order update is still pending. Check My Orders shortly." }, 503);

    return json({ verified: true, orderNumber, paymentStatus: "paid" });
  } catch {
    return json({ error: "Payment verification is temporarily unavailable. Check My Orders before retrying." }, 502);
  }
});
