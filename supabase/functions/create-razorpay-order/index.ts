import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://rofik-godi.pages.dev",
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

function getConfiguration() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  if (!razorpayKeyId || !razorpayKeySecret) return null;
  return { supabaseUrl, anonKey, serviceRoleKey, razorpayKeyId, razorpayKeySecret };
}

function isOrderNumber(value: unknown): value is string {
  return typeof value === "string" && /^RGC-[A-F0-9]{12}$/i.test(value.trim());
}

async function razorpayRequest<T>(path: string, keyId: string, keySecret: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error("Razorpay order creation failed.");
  return await response.json() as T;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const config = getConfiguration();
  if (!config) return json({ error: "Razorpay is not configured on the Supabase project yet." }, 503);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in before starting checkout." }, 401);

  const userClient = createClient(config.supabaseUrl, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const serviceClient = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Your sign-in session has expired. Sign in again." }, 401);

    const body = await req.json().catch(() => null) as { orderNumber?: unknown } | null;
    if (!isOrderNumber(body?.orderNumber)) return json({ error: "A valid order number is required." }, 400);

    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("id,order_number,user_id,customer_name,customer_phone,payment_method,payment_status,status,total")
      .eq("order_number", body.orderNumber.trim())
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (orderError || !order) return json({ error: "Order not found for this account." }, 404);
    if (order.payment_method !== "PAY_ONLINE") return json({ error: "This order is not set up for online payment." }, 409);
    if (String(order.payment_status).toUpperCase() !== "PENDING") return json({ error: "Only unpaid orders can be paid." }, 409);
    if (order.status === "CANCELLED") return json({ error: "Cancelled orders cannot be paid." }, 409);

    const totalRupees = Number(order.total);
    if (!Number.isSafeInteger(totalRupees) || totalRupees < 1) {
      return json({ error: "This order total cannot be paid online. Contact the store for help." }, 400);
    }
    const amountPaise = totalRupees * 100;
    if (!Number.isSafeInteger(amountPaise)) return json({ error: "This order total is outside the supported payment range." }, 400);

    const { data: existingAttempts, error: attemptError } = await serviceClient
      .from("payments")
      .select("provider_order_id,amount,currency")
      .eq("order_id", order.id)
      .eq("provider", "RAZORPAY")
      .in("status", ["created", "pending", "authorized"])
      .not("provider_order_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (attemptError) return json({ error: "Unable to prepare the payment record. Please try again." }, 500);

    let razorpayOrderId = existingAttempts?.[0]?.provider_order_id as string | undefined;
    if (!razorpayOrderId || Number(existingAttempts?.[0]?.amount) !== totalRupees || existingAttempts?.[0]?.currency !== "INR") {
      const providerOrder = await razorpayRequest<{ id: string; amount: number; currency: string }>(
        "/orders",
        config.razorpayKeyId,
        config.razorpayKeySecret,
        {
          amount: amountPaise,
          currency: "INR",
          receipt: order.order_number.slice(0, 40),
          notes: { order_number: order.order_number, user_id: authData.user.id },
        },
      );
      if (!providerOrder.id || providerOrder.amount !== amountPaise || providerOrder.currency !== "INR") {
        return json({ error: "Razorpay returned an invalid payment order." }, 502);
      }
      const { error: insertError } = await serviceClient.from("payments").insert({
        order_id: order.id,
        provider: "RAZORPAY",
        provider_order_id: providerOrder.id,
        status: "created",
        amount: totalRupees,
        currency: "INR",
        metadata: { order_number: order.order_number },
      });
      if (insertError) return json({ error: "Unable to save the payment attempt. Please retry checkout." }, 500);
      razorpayOrderId = providerOrder.id;
    }

    return json({
      razorpayOrderId,
      keyId: config.razorpayKeyId,
      amount: amountPaise,
      currency: "INR",
      orderNumber: order.order_number,
      prefill: {
        name: order.customer_name || "",
        email: authData.user.email || "",
        contact: order.customer_phone || "",
      },
    });
  } catch {
    return json({ error: "Unable to start Razorpay checkout. Please retry." }, 502);
  }
});
