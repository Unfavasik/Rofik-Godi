import type { OrderDetails } from '../types';
import { supabase } from './supabase';

const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

export async function createSupabaseOrder(order: OrderDetails) {
  if (!supabase) return { synced: false, error: null };
  const paymentMethod = order.paymentMethod === 'pay_online' ? 'PAY_ONLINE' : 'PAY_AT_STORE';
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('orders').insert({
    order_number: order.orderId,
    user_id: userData.user?.id || null,
    customer_name: order.customerName,
    customer_phone: order.phone,
    payment_method: paymentMethod,
    payment_status: order.paymentStatus === 'paid' ? 'PAID' : 'PENDING',
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    vehicle_model: order.vehicleModel,
    fulfillment_method: order.fulfillmentMethod,
    pickup_store: order.pickupStore,
    pickup_note: order.note || null,
    total: order.total,
  }).select('id').single();
  if (error || !data) return { synced: false, error: error || new Error('Order was not created') };

  const { error: itemsError } = await supabase.from('order_items').insert(order.items.map((item) => ({
    order_id: data.id,
    product_id: isUuid(item.product.id) ? item.product.id : null,
    product_name: item.product.title,
    color: item.selectedColor?.name || '',
    quantity: item.quantity,
    unit_price: item.unitPrice,
  })));
  return { synced: !itemsError, error: itemsError || null };
}
