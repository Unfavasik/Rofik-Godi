import { supabase } from './supabase';

type CreateOrderResponse = {
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  currency: 'INR';
  orderNumber: string;
  prefill: { name: string; email: string; contact: string };
};

type VerifyResponse = { verified: true; orderNumber: string; paymentStatus: 'paid' };
type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  config: { display: { hide: Array<{ method: string }> } };
  handler: (response: RazorpaySuccess) => void | Promise<void>;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', callback: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let checkoutScriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
    const script = existing || document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => window.Razorpay ? resolve() : reject(new Error('Razorpay Checkout could not be loaded.'));
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded. Check your connection and retry.'));
    if (!existing) document.head.appendChild(script);
  }).catch((error: unknown) => {
    checkoutScriptPromise = null;
    throw error;
  });

  return checkoutScriptPromise!;
}

async function edgeErrorMessage(error: { message: string; context?: unknown }): Promise<string> {
  const context = error.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as { error?: string; message?: string };
      if (body.error || body.message) return body.error || body.message || error.message;
    } catch {
      // Keep the SDK's safe fallback message when the response is not JSON.
    }
  }
  return error.message || 'Payment could not be verified. Check My Orders before retrying.';
}

export async function openRazorpayCheckout(orderNumber: string): Promise<VerifyResponse> {
  const client = supabase;
  if (!client) throw new Error('Supabase is not configured for this preview.');

  const { data: createData, error: createError } = await client.functions.invoke<CreateOrderResponse>(
    'create-razorpay-order',
    { body: { orderNumber } },
  );
  if (createError) throw new Error(await edgeErrorMessage(createError));
  if (!createData?.razorpayOrderId || !createData.keyId || !createData.amount) {
    throw new Error('Razorpay did not return a valid checkout order.');
  }

  await loadCheckoutScript();
  if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable in this browser.');

  return new Promise<VerifyResponse>((resolve, reject) => {
    let settled = false;
    const finish = (value: VerifyResponse | Error) => {
      if (settled) return;
      settled = true;
      if (value instanceof Error) reject(value);
      else resolve(value);
    };

    const checkout = new window.Razorpay!({
      key: createData.keyId,
      amount: createData.amount,
      currency: createData.currency,
      name: 'Rofik Godi Centre',
      description: `Pickup order #${createData.orderNumber}`,
      order_id: createData.razorpayOrderId,
      prefill: createData.prefill,
      theme: { color: '#D9232D' },
      config: { display: { hide: [{ method: 'upi' }] } },
      handler: async (response) => {
        const { data, error } = await client.functions.invoke<VerifyResponse>(
          'verify-razorpay-payment',
          { body: { ...response, orderNumber: createData.orderNumber } },
        );
        if (error) {
          finish(new Error(await edgeErrorMessage(error)));
          return;
        }
        if (!data?.verified || data.paymentStatus !== 'paid') {
          finish(new Error('Payment could not be confirmed yet. Check My Orders before retrying.'));
          return;
        }
        finish(data);
      },
      modal: {
        ondismiss: () => finish(new Error('Payment was not completed. You can retry from checkout.')),
      },
    });

    checkout.on('payment.failed', (response) => {
      finish(new Error(response.error?.description || 'Razorpay could not complete this payment. Please retry.'));
    });
    checkout.open();
  });
}
