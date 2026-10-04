import { supabase } from './supabase';

export type AdminOrderRecord = {
  id: string;
  userId: string;
  orderNumber: string;
  customer: string;
  phone: string;
  initials: string;
  product: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  status:
    | 'NEW'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'READY_FOR_PICKUP'
    | 'PICKED_UP'
    | 'COMPLETED'
    | 'CANCELLED';
  date: string;
  channel: string;
  vehicleModel: string;
  pickupStore: string;
  items: Array<{ product_name?: string; quantity?: number; unit_price?: number }>;
  createdAt: string;
};

export async function loadAdminOrders(): Promise<{
  data: AdminOrderRecord[];
  error: Error | null;
}> {
  if (!supabase) return { data: [], error: new Error('Supabase is not configured') };
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id,user_id,order_number,customer_name,customer_phone,vehicle_model,total,payment_method,payment_status,fulfillment_method,pickup_store,status,created_at,order_items(product_name,quantity,unit_price)',
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return { data: [], error };
  if (!data) return { data: [], error: new Error('No order data returned') };
  return {
    data: data.map((row) => {
      const customer = String(row.customer_name || 'Customer');
      const items = Array.isArray(row.order_items)
        ? (row.order_items as Array<{
            product_name?: string;
            quantity?: number;
            unit_price?: number;
          }>)
        : [];
      return {
        id: `#${row.order_number}`,
        userId: String(row.user_id || ''),
        orderNumber: String(row.order_number),
        customer,
        phone: String(row.customer_phone || ''),
        initials: customer
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        product: items[0]?.product_name || 'Multiple products',
        amount: Number(row.total || 0),
        paymentMethod: String(row.payment_method || 'PAY_AT_STORE'),
        paymentStatus: String(row.payment_status || 'PENDING'),
        status: String(row.status) as AdminOrderRecord['status'],
        date: new Date(String(row.created_at)).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        channel: String(row.fulfillment_method || 'STORE_PICKUP'),
        vehicleModel: String(row.vehicle_model || ''),
        pickupStore: String(row.pickup_store || ''),
        items,
        createdAt: String(row.created_at),
      };
    }),
    error: null,
  };
}

export function matchesAdminOrderToCustomer(
  order: Pick<AdminOrderRecord, 'userId' | 'phone' | 'customer'>,
  customer: { id: string; phone: string; name: string },
) {
  if (order.userId) return order.userId === customer.id;
  if (customer.phone && order.phone) return order.phone === customer.phone;
  return order.customer === customer.name;
}

function normalizeOrderNumber(orderNumber: string) {
  return orderNumber.trim().replace(/^#/, '');
}

export async function updatePickupOrderStatus(
  orderNumber: string,
  status: AdminOrderRecord['status'],
) {
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
  if (!supabase)
    return { data: null, error: new Error('Service configuration unavailable. Please try again.') };
  const { data, error } = await supabase.rpc('verify_store_pickup_token', {
    p_token: token.trim(),
  });
  return {
    data: data as { order_number?: string; status?: string; picked_up_at?: string } | null,
    error,
  };
}
