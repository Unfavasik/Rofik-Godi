import { describe, expect, it } from 'vitest';
import { getProductAvailability } from '../src/lib/productAvailability';

describe('product availability presentation', () => {
  it('shows a low-stock count up to the configured threshold', () => {
    expect(getProductAvailability({ inStock: true, stockQuantity: 3, lowStockThreshold: 5 })).toEqual({ state: 'low-stock', label: 'Only 3 left' });
  });

  it('shows In stock above the threshold and for untracked zero quantities', () => {
    expect(getProductAvailability({ inStock: true, stockQuantity: 6, lowStockThreshold: 5 }).label).toBe('In stock');
    expect(getProductAvailability({ inStock: true, stockQuantity: 0, lowStockThreshold: 5 }).label).toBe('In stock');
    expect(getProductAvailability({ inStock: true }).label).toBe('In stock');
  });

  it('shows Out of stock when the live stock flag is false', () => {
    expect(getProductAvailability({ inStock: false, stockQuantity: 0, lowStockThreshold: 5 })).toEqual({ state: 'out-of-stock', label: 'Out of stock' });
  });
});
