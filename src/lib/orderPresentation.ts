import type { CustomerOrderRecord } from '../types';

type OrderItem = CustomerOrderRecord['order_items'][number];

export const isOrderComplete = (status: string) => status === 'COMPLETED' || status === 'PICKED_UP';

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
