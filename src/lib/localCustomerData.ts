import type { CustomerNotificationRecord, CustomerOrderRecord, OrderDetails } from '../types';

const ordersKey = (userId: string) => `work-app:${userId}:orders`;
const notificationsKey = (userId: string) => `work-app:${userId}:notifications`;

function readRows<T>(key: string): T[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

function writeRows<T>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    // Keep the current session usable if local storage is unavailable or full.
  }
}

function localOrderCode() {
  const bytes = new Uint8Array(6);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes.set(Array.from({ length: bytes.length }, () => Math.floor(Math.random() * 256)));
  const code = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `LOCAL-${code}`;
}

export function saveLocalCustomerOrder(userId: string, order: OrderDetails): OrderDetails {
  const generatedCode = order.orderId || localOrderCode();
  const savedOrder = { ...order, orderId: generatedCode, pickupToken: order.pickupToken || generatedCode };
  const row: CustomerOrderRecord = {
    id: savedOrder.orderId,
    order_number: savedOrder.orderId,
    customer_name: savedOrder.customerName,
    customer_phone: savedOrder.phone,
    payment_method: savedOrder.paymentMethod === 'pay_at_store' ? 'PAY_AT_STORE' : 'PAY_ONLINE',
    payment_status: 'PENDING',
    status: savedOrder.status,
    subtotal: savedOrder.subtotal,
    discount: savedOrder.discount,
    total: savedOrder.total,
    vehicle_model: savedOrder.vehicleModel,
    fulfillment_method: 'STORE_PICKUP',
    pickup_store: savedOrder.pickupStore,
    created_at: savedOrder.createdAt,
    order_items: savedOrder.items.map((item) => ({
      product_name: item.product.title,
      color: item.selectedColor?.name || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
  };
  writeRows(ordersKey(userId), [row, ...readRows<CustomerOrderRecord>(ordersKey(userId))].slice(0, 50));
  const notification: CustomerNotificationRecord = {
    id: `local-notification-${savedOrder.orderId}`,
    kind: 'order',
    title: 'Order received',
    body: `Your store-pickup order #${savedOrder.orderId} has been received.`,
    action_url: '/profile',
    read_at: null,
    created_at: savedOrder.createdAt,
  };
  writeRows(notificationsKey(userId), [notification, ...readRows<CustomerNotificationRecord>(notificationsKey(userId))].slice(0, 50));
  return savedOrder;
}

export function listLocalCustomerOrders(userId: string): CustomerOrderRecord[] {
  return readRows<CustomerOrderRecord>(ordersKey(userId));
}

export function listLocalCustomerNotifications(userId: string): CustomerNotificationRecord[] {
  return readRows<CustomerNotificationRecord>(notificationsKey(userId));
}

export function markLocalCustomerNotificationRead(userId: string, id: string) {
  const readAt = new Date().toISOString();
  writeRows(notificationsKey(userId), listLocalCustomerNotifications(userId).map((row) => row.id === id ? { ...row, read_at: readAt } : row));
}
