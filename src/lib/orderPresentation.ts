import type { CustomerOrderRecord } from '../types';

type OrderItem = CustomerOrderRecord['order_items'][number];

export const isOrderComplete = (status: string) => status === 'COMPLETED' || status === 'PICKED_UP';

/** Pickup QR codes are valid only until the order is picked up, completed or cancelled. */
export const canShowPickupQr = (status: string) =>
  status !== 'PICKED_UP' && status !== 'COMPLETED' && status !== 'CANCELLED';

const statusLabels: Record<string, string> = {
  NEW: 'Order placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Being prepared',
  READY_FOR_PICKUP: 'Ready for pickup',
  PICKED_UP: 'Picked up',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const getOrderStatusLabel = (status: string) =>
  statusLabels[status] || status.replaceAll('_', ' ').toLowerCase();

/** Return one representative thumbnail per distinct product, in the order it was bought. */
export const getOrderPreviewItems = (items: OrderItem[]) => {
  const seen = new Set<string>();
  return items.filter((item, index) => {
    const key = item.product_id || `${item.product_name}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
