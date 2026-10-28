import type { Product } from '../types';

export type ProductAvailabilityState = 'in-stock' | 'out-of-stock';

export function getProductAvailability(product: Pick<Product, 'inStock'>): {
  state: ProductAvailabilityState;
  label: string;
} {
  if (!product.inStock) return { state: 'out-of-stock', label: 'Out of stock' };
  return { state: 'in-stock', label: 'In stock' };
}
