import { supabase } from './supabase';

export type AdminOrderRecord = {
  id: string;
  customer: string;
  initials: string;
  product: string;
  amount: number;
  status: 'Processing' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string;
  channel: string;
};

const statusMap: Record<string, AdminOrderRecord['status']> = { pending: 'Processing', confirmed: 'Confirmed', packed: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

export async function loadAdminOrders(): Promise<AdminOrderRecord[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('orders').select('id,order_number,customer_name,total,status,created_at,order_items(product_name)').order('created_at', { ascending: false }).limit(50);
  if (error || !data) return null;
  return data.map((row) => {
    const customer = String(row.customer_name || 'Customer');
    const items = Array.isArray(row.order_items) ? row.order_items as Array<{ product_name?: string }> : [];
    return { id: `#${row.order_number}`, customer, initials: customer.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), product: items[0]?.product_name || 'Multiple products', amount: Number(row.total || 0), status: statusMap[String(row.status)] || 'Processing', date: new Date(String(row.created_at)).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), channel: 'Website' };
  });
}
