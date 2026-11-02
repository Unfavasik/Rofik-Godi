import type { Product } from '../types';

export type ProductAvailabilityState = 'in-stock' | 'low-stock' | 'out-of-stock';

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export function getProductAvailability(
  product: Pick<Product, 'inStock' | 'stockQuantity' | 'lowStockThreshold'>,
): {
  state: ProductAvailabilityState;
  label: string;
} {
  if (!product.inStock) return { state: 'out-of-stock', label: 'Out of stock' };
  const stock = product.stockQuantity;
  if (stock != null) {
    if (stock <= 0) return { state: 'out-of-stock', label: 'Out of stock' };
    if (stock <= (product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD)) {
      return { state: 'low-stock', label: `Only ${stock} left` };
    }
  }
  return { state: 'in-stock', label: 'In stock' };
}
