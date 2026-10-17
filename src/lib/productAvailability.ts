import type { Product } from '../types';

export type ProductAvailabilityState = 'in-stock' | 'low-stock' | 'out-of-stock';

export function getProductAvailability(product: Pick<Product, 'inStock' | 'stockQuantity' | 'lowStockThreshold'>): {
  state: ProductAvailabilityState;
  label: string;
} {
  if (!product.inStock) return { state: 'out-of-stock', label: 'Out of stock' };

  // stock_quantity = 0 with in_stock = true is the established untracked-inventory convention.
  const quantity = Number(product.stockQuantity);
  const threshold = Number.isFinite(product.lowStockThreshold)
    ? Math.max(0, Math.floor(product.lowStockThreshold as number))
    : 5;
  if (Number.isInteger(quantity) && quantity > 0 && quantity <= threshold) {
    return { state: 'low-stock', label: `Only ${quantity} left` };
  }
  return { state: 'in-stock', label: 'In stock' };
}
