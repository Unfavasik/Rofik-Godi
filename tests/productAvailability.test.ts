import { describe, expect, it } from 'vitest';
import { getProductAvailability } from '../src/lib/productAvailability';

describe('product availability presentation', () => {
  it('shows In stock without quantity tracking', () => {
    expect(getProductAvailability({ inStock: true }).label).toBe('In stock');
  });

  it('shows Out of stock when the live stock flag is false', () => {
    expect(getProductAvailability({ inStock: false })).toEqual({ state: 'out-of-stock', label: 'Out of stock' });
  });
});
