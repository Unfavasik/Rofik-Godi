import type { CustomerOrderRecord, OrderDetails } from '../types';
import { supabase } from './supabase';
import { listLocalCustomerOrders, saveLocalCustomerOrder } from './localCustomerData';

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

type SecureOrderResponse = {
  id: string;
  order_number: string;
  status: OrderDetails['status'];
  payment_status: string;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  pickup_token: string;
};

export async function createSupabaseOrder(order: OrderDetails, expectedUserId: string, couponCode = '') {
  if (!supabase) {
    if (couponCode.trim() || order.discount > 0) {
      return { synced: false, error: new Error('Coupon discounts require the secure Supabase order service. Please reconnect and try again.'), order: null };
    }
    const localOrder = saveLocalCustomerOrder(expectedUserId, order);
    return { synced: false, error: null, order: localOrder };
  }

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user || userData.user.id !== expectedUserId) {
    return { synced: false, error: new Error('Your sign-in session is unavailable. Please sign in again.'), order: null };
  }
  if (order.items.some((item) => !isUuid(item.product.id))) {
    return { synced: false, error: new Error('One or more products are not synced to the secure order catalog.'), order: null };
  }

  const { data, error } = await supabase.rpc('create_store_pickup_order', {
    p_items: order.items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      color: item.selectedColor?.name || '',
    })),
    p_customer_name: order.customerName,
    p_customer_phone: order.phone,
    p_vehicle_model: order.vehicleModel,
    p_note: order.note || null,
    p_payment_method: order.paymentMethod === 'pay_at_store' ? 'PAY_AT_STORE' : 'PAY_ONLINE',
    p_coupon_code: couponCode.trim().toUpperCase() || null,
  });
  if (error || !data) return { synced: false, error: error || new Error('The secure order service returned no order.'), order: null };

  const result = (Array.isArray(data) ? data[0] : data) as unknown as SecureOrderResponse;
  if (!result?.order_number) return { synced: false, error: new Error('The secure order service returned an invalid order.'), order: null };
  const savedOrder: OrderDetails = {
    ...order,
    orderId: result.order_number,
    status: result.status || 'NEW',
    paymentStatus: result.payment_status?.toLowerCase() === 'paid' ? 'paid' : 'pending',
    subtotal: Number(result.subtotal),
    discount: Number(result.discount),
    total: Number(result.total),
    createdAt: result.created_at || order.createdAt,
    pickupToken: result.pickup_token,
  };
  return { synced: true, error: null, order: savedOrder };
}

export async function listMyOrders(expectedUserId: string): Promise<CustomerOrderRecord[]> {
  if (!supabase) return listLocalCustomerOrders(expectedUserId);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || userData.user.id !== expectedUserId) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,vehicle_model,fulfillment_method,pickup_store,created_at,order_items(product_id,product_name,color,quantity,unit_price)')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data as unknown as CustomerOrderRecord[];
}
