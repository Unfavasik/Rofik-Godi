import type { CustomerOrderRecord, OrderDetails } from '../types';
import { supabase } from './supabase';
import { normalizeCouponFailureMessage } from './couponErrors';
import { getCartItemUnitPrice, MAX_ORDER_ITEM_QUANTITY, MAX_ORDER_LINE_ITEMS } from './cart';

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const missingOrderOptionColumns = (error: { message?: string } | null) => Boolean(error && /selected_thickness|selected_stitch|custom_embroidery_text/i.test(error.message || ''));

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
  if (order.items.length < 1 || order.items.length > MAX_ORDER_LINE_ITEMS || order.items.some(
    (item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ORDER_ITEM_QUANTITY,
  )) {
    return { synced: false, error: new Error('Your cart has an invalid quantity. Each item must be between 1 and 99, with at most 50 different items.'), order: null };
  }
  if (order.items.some((item) => !isUuid(item.product.id))) {
    return { synced: false, error: new Error('One or more products are not synced to the secure order catalog.'), order: null };
  }

  const { data, error } = await supabase.rpc('create_store_pickup_order_v2', {
    p_items: order.items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      color: item.selectedColor?.name || '',
      thickness_label: item.selectedThickness?.label || 'Standard',
      stitch: item.selectedStitch || '',
      embroidery_text: item.customEmbroideryText?.trim() || '',
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
    items: order.items.map((item) => ({
      ...item,
      unitPrice: getCartItemUnitPrice(item.product, item.selectedThickness, item.customEmbroideryText),
    })),
    orderId: result.order_number,
    status: result.status || 'NEW',
    paymentStatus: result.payment_status?.toLowerCase() === 'paid' ? 'paid' : 'pending',
    subtotal: Number(result.subtotal),
    discount: Number(result.discount),
    total: Number(result.total),
    createdAt: result.created_at || order.createdAt,
    pickupToken: result.pickup_token,
  };
  try {
    const emailRequest = supabase.functions.invoke('send-order-confirmation', {
      body: { orderNumber: savedOrder.orderId },
    });
    void Promise.resolve(emailRequest)
      .then((response) => {
        if (response?.error) console.warn('Order confirmation email request failed');
      })
      .catch(() => console.warn('Order confirmation email request failed'));
  } catch {
    console.warn('Order confirmation email request failed');
  }
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
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!userData.user || userData.user.id !== expectedUserId) return [];
  let response = await supabase
    .from('orders')
    .select('id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,vehicle_model,fulfillment_method,pickup_store,pickup_note,created_at,order_items(product_id,product_name,color,quantity,unit_price,selected_thickness,selected_stitch,custom_embroidery_text)')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (missingOrderOptionColumns(response.error)) {
    response = await (supabase.from('orders')
      .select('id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,vehicle_model,fulfillment_method,pickup_store,pickup_note,created_at,order_items(product_id,product_name,color,quantity,unit_price)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(50) as unknown as typeof response);
  }
  const { data, error } = response;
  if (error) throw error;
  if (!data) return [];
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

export async function getMyOrderByNumber(expectedUserId: string, orderNumber: string): Promise<CustomerOrderRecord | null> {
  if (!supabase) return null;
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!userData.user || userData.user.id !== expectedUserId) return null;

  let response = await supabase
    .from('orders')
    .select('id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,vehicle_model,fulfillment_method,pickup_store,pickup_note,created_at,order_items(product_id,product_name,color,quantity,unit_price,selected_thickness,selected_stitch,custom_embroidery_text)')
    .eq('user_id', userData.user.id)
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (missingOrderOptionColumns(response.error)) {
    response = await (supabase.from('orders')
      .select('id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,vehicle_model,fulfillment_method,pickup_store,pickup_note,created_at,order_items(product_id,product_name,color,quantity,unit_price)')
      .eq('user_id', userData.user.id)
      .eq('order_number', orderNumber)
      .maybeSingle() as unknown as typeof response);
  }
  const { data, error } = response;
  if (error) throw error;
  if (!data) return null;

  const order = data as unknown as CustomerOrderRecord;
  const productIds = [...new Set((order.order_items || []).map((item) => item.product_id).filter((id): id is string => Boolean(id)))];
  const { data: productRows } = productIds.length
    ? await supabase.from('products').select('id,image_url').in('id', productIds)
    : { data: [] };
  const productImages = new Map((productRows || []).map((product) => [String(product.id), String(product.image_url || '')]));

  return {
    ...order,
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    order_items: (order.order_items || []).map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
      image_url: item.product_id ? productImages.get(item.product_id) || null : null,
    })),
  };
}
