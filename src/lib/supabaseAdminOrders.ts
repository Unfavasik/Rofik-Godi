import { supabase } from './supabase';

export type AdminOrderRecord = {
  id: string;
  customer: string;
  phone: string;
  initials: string;
  product: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'COMPLETED' | 'CANCELLED';
  date: string;
  channel: string;
};

export async function loadAdminOrders(): Promise<AdminOrderRecord[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('orders').select('id,order_number,customer_name,customer_phone,vehicle_model,total,payment_method,payment_status,fulfillment_method,pickup_store,status,created_at,order_items(product_name,quantity)').order('created_at', { ascending: false }).limit(50);
  if (error || !data) return null;
  return data.map((row) => {
    const customer = String(row.customer_name || 'Customer');
    const items = Array.isArray(row.order_items) ? row.order_items as Array<{ product_name?: string }> : [];
    return { id: `#${row.order_number}`, customer, phone: String(row.customer_phone || ''), initials: customer.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), product: items[0]?.product_name || 'Multiple products', amount: Number(row.total || 0), paymentMethod: String(row.payment_method || 'PAY_AT_STORE'), paymentStatus: String(row.payment_status || 'PENDING'), status: String(row.status) as AdminOrderRecord['status'], date: new Date(String(row.created_at)).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), channel: 'STORE_PICKUP' };
  });
}

function normalizeOrderNumber(orderNumber: string) {
  return orderNumber.trim().replace(/^#/, '');
}

export async function updatePickupOrderStatus(orderNumber: string, status: AdminOrderRecord['status']) {
  if (!supabase) return { error: null };
  const { error } = await supabase.rpc('admin_update_pickup_order_status', {
    p_order_number: normalizeOrderNumber(orderNumber),
    p_status: status,
  });
  return { error };
}

export async function verifyPickupPayment(orderNumber: string) {
  if (!supabase) return { error: null };
  const { error } = await supabase.rpc('admin_verify_pickup_payment', {
    p_order_number: normalizeOrderNumber(orderNumber),
  });
  return { error };
}

export async function verifyStorePickupToken(token: string) {
  if (!supabase) return { data: null, error: new Error('Service configuration unavailable. Please try again.') };
  const { data, error } = await supabase.rpc('verify_store_pickup_token', { p_token: token.trim() });
  return { data: data as { order_number?: string; status?: string; picked_up_at?: string } | null, error };
}
