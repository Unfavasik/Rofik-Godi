import type { CustomerOrderRecord } from '../types';

type OrderItem = CustomerOrderRecord['order_items'][number];

export const isOrderComplete = (status: string) => status === 'COMPLETED' || status === 'PICKED_UP';

/** The one-time pickup QR is shown only when the admin scanner can accept it. */
export const canShowPickupQr = (status: string) => status === 'READY_FOR_PICKUP';

/** Customer cancellation is offered only before workshop confirmation and before payment. */
export const canCancelCustomerOrder = (status: string, paymentStatus?: string | null) =>
  status.trim().toUpperCase() === 'NEW' && paymentStatus?.trim().toUpperCase() !== 'PAID';

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

export type CustomerOrderStatusEvent = { to_status: string; created_at: string };
export type CustomerOrderTimelineStep = {
  key: string;
  label: string;
  state: 'complete' | 'current' | 'upcoming';
  timestamp: string | null;
};

/** Build customer-facing milestones from the persisted order status and status history. */
export const getCustomerOrderTimeline = (
  status: string,
  createdAt: string,
  history: CustomerOrderStatusEvent[] = [],
): CustomerOrderTimelineStep[] => {
  const normalizedStatus = status.trim().toUpperCase();
  const events = [...history].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const timestampFor = (...statuses: string[]) => {
    const event = statuses.map((candidate) => events.find((row) => row.to_status.toUpperCase() === candidate)).find(Boolean);
    return event?.created_at || null;
  };

  if (normalizedStatus === 'CANCELLED') {
    return [
      { key: 'placed', label: 'Placed', state: 'complete', timestamp: createdAt || null },
      { key: 'cancelled', label: 'Cancelled', state: 'current', timestamp: timestampFor('CANCELLED') },
    ];
  }

  const activeIndex = normalizedStatus === 'PICKED_UP' || normalizedStatus === 'COMPLETED' ? 3
    : normalizedStatus === 'READY_FOR_PICKUP' ? 2
      : normalizedStatus === 'CONFIRMED' || normalizedStatus === 'PREPARING' ? 1 : 0;
  const definitions = [
    { key: 'placed', label: 'Placed', timestamp: createdAt || null },
    { key: 'confirmed', label: 'Confirmed', timestamp: timestampFor('CONFIRMED', 'PREPARING') },
    { key: 'ready', label: 'Ready for pickup', timestamp: timestampFor('READY_FOR_PICKUP') },
    { key: 'completed', label: 'Completed', timestamp: timestampFor('COMPLETED', 'PICKED_UP') },
  ];
  return definitions.map((step, index) => ({
    ...step,
    state: index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming',
  }));
};

/** Extract the store-generated order number from an in-app notification. */
export const getNotificationOrderNumber = (content: string) =>
  content.match(/\bRGC-[A-Z0-9]{8,32}\b/i)?.[0].toUpperCase() || null;

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
