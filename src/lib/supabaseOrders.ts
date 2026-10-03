import type { OrderDetails } from '../types';
import { supabase } from './supabase';

const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

export async function createSupabaseOrder(order: OrderDetails) {
  if (!supabase) return { synced: false, error: null };
  const paymentMethod = order.paymentMethod === 'card' ? 'CARD' : order.paymentMethod === 'upi' ? 'UPI' : 'COD';
  const { data, error } = await supabase.from('orders').insert({
    order_number: order.orderId,
    customer_name: order.customerName,
    customer_phone: order.phone,
    delivery_address: `${order.address}, ${order.city} - ${order.pincode}`,
    payment_method: paymentMethod,
    status: order.status,
    subtotal: order.subtotal,
    delivery_fee: order.deliveryFee,
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
