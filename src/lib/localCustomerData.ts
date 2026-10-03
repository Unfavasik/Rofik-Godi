import type { CustomerNotificationRecord, CustomerOrderRecord, OrderDetails } from '../types';

const ordersKey = (userId: string) => `work-app:${userId}:orders`;
const notificationsKey = (userId: string) => `work-app:${userId}:notifications`;
const NOTIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
    expires_at: new Date(new Date(savedOrder.createdAt).getTime() + NOTIFICATION_TTL_MS).toISOString(),
  };
  writeRows(notificationsKey(userId), [notification, ...listLocalCustomerNotifications(userId)].slice(0, 50));
  return savedOrder;
}

export function createLocalCustomerWelcomeNotification(userId: string, name: string) {
  const existing = listLocalCustomerNotifications(userId);
  if (existing.some((row) => row.kind === 'welcome')) return;
  const displayName = name.trim() || 'Rider';
  const createdAt = new Date();
  const notification: CustomerNotificationRecord = {
    id: `local-welcome-${userId}`,
    kind: 'welcome',
    title: `Welcome, ${displayName}!`,
    body: `Hi ${displayName}, welcome to Rofik Godi Centre. Explore the store and find your ride essentials here.`,
    action_url: '/home',
    read_at: null,
    created_at: createdAt.toISOString(),
    expires_at: new Date(createdAt.getTime() + NOTIFICATION_TTL_MS).toISOString(),
  };
  writeRows(notificationsKey(userId), [notification, ...existing].slice(0, 50));
}

export function listLocalCustomerOrders(userId: string): CustomerOrderRecord[] {
  return readRows<CustomerOrderRecord>(ordersKey(userId));
}

export function listLocalCustomerNotifications(userId: string): CustomerNotificationRecord[] {
  const rows = readRows<CustomerNotificationRecord>(notificationsKey(userId));
  const now = Date.now();
  let changed = false;
  const active = rows.flatMap((row) => {
    const createdAt = Date.parse(row.created_at);
    const expiresAt = row.expires_at ? Date.parse(row.expires_at) : createdAt + NOTIFICATION_TTL_MS;
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      changed = true;
      return [];
    }
    if (!row.expires_at) changed = true;
    return [{ ...row, expires_at: new Date(expiresAt).toISOString() }];
  });
  if (changed) writeRows(notificationsKey(userId), active);
  return active;
}

export function markLocalCustomerNotificationRead(userId: string, id: string) {
  const readAt = new Date().toISOString();
  writeRows(notificationsKey(userId), listLocalCustomerNotifications(userId).map((row) => row.id === id ? { ...row, read_at: readAt } : row));
}

export function deleteLocalCustomerNotification(userId: string, id: string) {
  writeRows(notificationsKey(userId), listLocalCustomerNotifications(userId).filter((row) => row.id !== id));
}
