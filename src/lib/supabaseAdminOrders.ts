import { supabase } from './supabase';
import type { CustomerOrderRecord } from '../types';

export type AdminOrderRecord = {
  id: string;
  userId: string;
  orderNumber: string;
  customer: string;
  phone: string;
  initials: string;
  product: string;
  amount: number;
  subtotal: number;
  discount: number;
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
  pickupNote: string;
  pickedUpAt: string | null;
  completedAt: string | null;
  statusHistory: AdminOrderStatusHistoryRecord[];
  items: Array<{
    product_id?: string | null;
    product_name?: string;
    color?: string | null;
    quantity?: number;
    unit_price?: number;
  }>;
  createdAt: string;
};

export type AdminOrderStatusHistoryRecord = {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
};

export type AdminOrderTimelineEvent = {
  id: string;
  status: string;
  createdAt: string;
  note: string | null;
  kind: 'placed' | 'status';
};

export function getNextPickupOrderStatus(status: AdminOrderRecord['status']) {
  return (
    {
      NEW: 'CONFIRMED',
      CONFIRMED: 'PREPARING',
      PREPARING: 'READY_FOR_PICKUP',
      READY_FOR_PICKUP: 'PICKED_UP',
      PICKED_UP: 'COMPLETED',
    } as Partial<Record<AdminOrderRecord['status'], AdminOrderRecord['status']>>
  )[status] || null;
}

export function matchesAdminOrderSearch(order: AdminOrderRecord, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const searchable = [
    order.id,
    order.orderNumber,
    order.customer,
    order.phone,
    order.product,
    order.vehicleModel,
    order.paymentStatus,
    order.status,
    order.createdAt,
    ...order.items.map((item) => item.product_name || ''),
  ].join(' ').toLowerCase();
  return searchable.includes(normalized);
}

export function getAdminOrderTimelineEvents(order: AdminOrderRecord): AdminOrderTimelineEvent[] {
  const events: AdminOrderTimelineEvent[] = [
    { id: `placed-${order.id}`, status: 'NEW', createdAt: order.createdAt, note: null, kind: 'placed' as const },
    ...order.statusHistory.map((entry) => ({
      id: entry.id,
      status: entry.to_status,
      createdAt: entry.created_at,
      note: entry.note,
      kind: 'status' as const,
    })),
  ].filter((event) => Boolean(event.status && event.createdAt) && !Number.isNaN(Date.parse(event.createdAt)));

  const recordedStatuses = new Set(events.map((event) => event.status));
  if (order.pickedUpAt && !Number.isNaN(Date.parse(order.pickedUpAt)) && !recordedStatuses.has('PICKED_UP')) {
    events.push({ id: `picked-up-${order.id}`, status: 'PICKED_UP', createdAt: order.pickedUpAt, note: null, kind: 'status' });
  }
  if (order.completedAt && !Number.isNaN(Date.parse(order.completedAt)) && !recordedStatuses.has('COMPLETED')) {
    events.push({ id: `completed-${order.id}`, status: 'COMPLETED', createdAt: order.completedAt, note: null, kind: 'status' });
  }

  return events.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

export async function loadAdminOrders(): Promise<{
  data: AdminOrderRecord[];
  error: Error | null;
}> {
  if (!supabase) return { data: [], error: new Error('Supabase is not configured') };
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id,user_id,order_number,customer_name,customer_phone,vehicle_model,subtotal,discount,total,payment_method,payment_status,fulfillment_method,pickup_store,pickup_note,picked_up_at,completed_at,status,created_at,order_items(product_id,product_name,color,quantity,unit_price),order_status_history(id,from_status,to_status,note,created_at)',
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
            product_id?: string | null;
            product_name?: string;
            color?: string | null;
            quantity?: number;
            unit_price?: number;
          }>)
        : [];
      const normalizedItems = items.map((item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
      }));
      const statusHistory = Array.isArray(row.order_status_history)
        ? (row.order_status_history as Array<{
            id?: string;
            from_status?: string | null;
            to_status?: string;
            note?: string | null;
            created_at?: string;
          }>).map((event) => ({
            id: String(event.id || ''),
            from_status: event.from_status || null,
            to_status: String(event.to_status || ''),
            note: event.note || null,
            created_at: String(event.created_at || ''),
          }))
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
        product: normalizedItems[0]?.product_name || 'Multiple products',
        amount: Number(row.total || 0),
        subtotal: Number(row.subtotal ?? row.total ?? 0),
        discount: Number(row.discount || 0),
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
        pickupNote: String(row.pickup_note || ''),
        pickedUpAt: row.picked_up_at ? String(row.picked_up_at) : null,
        completedAt: row.completed_at ? String(row.completed_at) : null,
        statusHistory,
        items: normalizedItems,
        createdAt: String(row.created_at),
      };
    }),
    error: null,
  };
}

export function toCustomerOrderRecord(order: AdminOrderRecord): CustomerOrderRecord {
  return {
    id: order.orderNumber,
    order_number: order.orderNumber,
    customer_name: order.customer,
    customer_phone: order.phone,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.amount,
    vehicle_model: order.vehicleModel || null,
    fulfillment_method: order.channel,
    pickup_store: order.pickupStore,
    created_at: order.createdAt,
    order_items: order.items.map((item) => ({
      product_id: item.product_id || null,
      product_name: item.product_name || 'Product',
      color: item.color || null,
      quantity: Number(item.quantity ?? 1),
      unit_price: Number(item.unit_price ?? 0),
    })),
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

async function requestOrderUpdateEmail(orderNumber: string, event: string) {
  if (!supabase || event !== 'COMPLETED') return;
  try {
    const { error } = await supabase.functions.invoke('send-order-confirmation', {
      body: { type: 'order_status_update', orderNumber: normalizeOrderNumber(orderNumber), event },
    });
    if (error) console.warn('Order update email request failed');
  } catch {
    console.warn('Order update email request failed');
  }
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
  if (!error) await requestOrderUpdateEmail(orderNumber, status);
  return { error };
}

export async function completePickupOrderManually(
  orderNumber: string,
  currentStatus: AdminOrderRecord['status'],
) {
  if (currentStatus !== 'READY_FOR_PICKUP' && currentStatus !== 'PICKED_UP') {
    return { error: new Error('Only ready or picked-up orders can be completed manually.'), partial: false };
  }

  let pickupRecorded = currentStatus === 'PICKED_UP';
  try {
    if (!pickupRecorded) {
      const pickup = await updatePickupOrderStatus(orderNumber, 'PICKED_UP');
      if (pickup.error) return { error: pickup.error, partial: false };
      pickupRecorded = true;
    }
    const completed = await updatePickupOrderStatus(orderNumber, 'COMPLETED');
    return { error: completed.error, partial: Boolean(completed.error) && pickupRecorded };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Order completion could not be recorded.'),
      partial: pickupRecorded,
    };
  }
}

export async function verifyPickupPayment(orderNumber: string) {
  if (!supabase) return { error: null };
  const { error } = await supabase.rpc('admin_verify_pickup_payment', {
    p_order_number: normalizeOrderNumber(orderNumber),
  });
  if (!error) await requestOrderUpdateEmail(orderNumber, 'PAYMENT_PAID');
  return { error };
}

export async function verifyStorePickupToken(token: string) {
  if (!supabase)
    return { data: null, error: new Error('Service configuration unavailable. Please try again.') };
  const { data, error } = await supabase.rpc('verify_store_pickup_token', {
    p_token: token.trim(),
  });
  if (!error && data?.status === 'COMPLETED' && data?.order_number) {
    await requestOrderUpdateEmail(String(data.order_number), 'COMPLETED');
  }
  return {
    data: data as { order_number?: string; status?: string; picked_up_at?: string; completed_at?: string } | null,
    error,
  };
}
