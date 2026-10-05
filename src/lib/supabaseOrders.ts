import type { CustomerOrderRecord, OrderDetails } from '../types';
import { supabase } from './supabase';
import { normalizeCouponFailureMessage } from './couponErrors';

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
    return { synced: false, error: new Error('Service configuration unavailable. Please try again.'), order: null };
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
  if (error) return { synced: false, error: new Error(normalizeCouponFailureMessage(error.message)), order: null };
  if (!data) return { synced: false, error: new Error('The secure order service returned no order.'), order: null };

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

export async function issueMyStorePickupToken(orderNumber: string) {
  if (!supabase) return { data: null, error: new Error('Service configuration unavailable. Please try again.') };
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) return { data: null, error: new Error('Sign in to view your pickup QR.') };
  const { data, error } = await supabase.rpc('issue_my_store_pickup_token', {
    p_order_number: orderNumber.trim(),
  });
  return { data: data as string | null, error };
}

export async function listMyOrders(expectedUserId: string): Promise<CustomerOrderRecord[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || userData.user.id !== expectedUserId) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,vehicle_model,fulfillment_method,pickup_store,pickup_note,created_at,order_items(product_id,product_name,color,quantity,unit_price)')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  const orders = (data as unknown as CustomerOrderRecord[]).map((order) => ({
    ...order,
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    order_items: (order.order_items || []).map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
    })),
  }));
  const productIds = [...new Set(orders.flatMap((order) => order.order_items || []).map((item) => item.product_id).filter((id): id is string => Boolean(id)))];
  if (!productIds.length) return orders;
  const { data: productRows } = await supabase.from('products').select('id,image_url').in('id', productIds);
  const productImages = new Map((productRows || []).map((product) => [String(product.id), String(product.image_url || '')]));
  return orders.map((order) => ({
    ...order,
    order_items: (order.order_items || []).map((item) => ({ ...item, image_url: item.product_id ? productImages.get(item.product_id) || null : null })),
  }));
}
