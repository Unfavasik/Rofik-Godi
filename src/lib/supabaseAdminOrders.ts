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

export async function updatePickupOrderStatus(orderId: string, status: AdminOrderRecord['status']) {
  if (!supabase) return { error: null };
  const { data: userData } = await supabase.auth.getUser();
  const { data: current } = await supabase.from('orders').select('id,status').eq('order_number', orderId.replace(/^#/, '')).single();
  if (!current) return { error: new Error('Order not found') };
  const { error } = await supabase.from('orders').update({ status, picked_up_at: status === 'PICKED_UP' ? new Date().toISOString() : null, completed_at: status === 'COMPLETED' ? new Date().toISOString() : null }).eq('id', current.id);
  if (!error) await supabase.from('order_status_history').insert({ order_id: current.id, from_status: current.status || null, to_status: status, changed_by: userData.user?.id || null });
  return { error };
}

export async function verifyPickupPayment(orderNumber: string) {
  if (!supabase) return { error: null };
  const { data: order } = await supabase.from('orders').select('id,total,payment_method').eq('order_number', orderNumber.replace(/^#/, '')).single();
  if (!order) return { error: new Error('Order not found') };
  const { error: orderError } = await supabase.from('orders').update({ payment_status: 'PAID' }).eq('id', order.id);
  if (orderError) return { error: orderError };
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from('payments').insert({ order_id: order.id, provider: order.payment_method === 'PAY_ONLINE' ? 'UPI' : 'STORE', status: 'paid', amount: order.total, currency: 'INR', metadata: { verified_by: userData.user?.id || null } });
  return { error: null };
}
