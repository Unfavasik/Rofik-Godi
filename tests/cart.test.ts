import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../src/data/products';
import { canReconcileCartFromCatalog, refreshCartFromCatalog, sanitizePersistedCart } from '../src/lib/cart';
import type { CartItem, Product } from '../src/types';

const originalProduct = PRODUCTS[0];
const cartItem: CartItem = {
  cartItemId: 'cart-item-1',
  product: { ...originalProduct, price: 100, inStock: true },
  quantity: 2,
  selectedColor: originalProduct.colors[0],
  selectedThickness: { label: 'Standard', extraPrice: 0 },
  customEmbroideryText: 'Rider',
  unitPrice: 250,
};
const customSeatItem: CartItem = {
  ...cartItem,
  cartItemId: 'custom-seat-cart-item',
  product: { ...originalProduct, id: 'custom-seat-1728000000000', title: 'Custom seat', price: 1319 },
  selectedThickness: { label: 'high_density', extraPrice: 0 },
  unitPrice: 1319,
};

describe('persisted cart reconciliation', () => {
  it('sanitizes stored data and clamps quantities to the transaction limit', () => {
    const [safe] = sanitizePersistedCart([{ ...cartItem, quantity: 500 }, null, { cartItemId: 'broken' }]);
    expect(safe.quantity).toBe(99);
    expect(sanitizePersistedCart({ not: 'an array' })).toEqual([]);
  });

  it('replaces cached product data and recomputes current prices and stock', () => {
    const currentProduct: Product = {
      ...originalProduct,
      title: 'Updated seat cover',
      price: 650,
      inStock: false,
      thicknessOptions: [{ label: 'Standard', extraPrice: 25 }],
    };

    const [refreshed] = refreshCartFromCatalog([cartItem], [currentProduct]);

    expect(refreshed.product.title).toBe('Updated seat cover');
    expect(refreshed.product.inStock).toBe(false);
    expect(refreshed.unitPrice).toBe(825); // ₹650 + ₹25 thickness + ₹150 embroidery
    expect(refreshed.quantity).toBe(2);
  });

  it('removes saved items whose products are no longer in the catalog', () => {
    expect(refreshCartFromCatalog([cartItem], [])).toEqual([]);
  });

  it('does not reconcile or delete the cart when catalog loading fails or returns no products', () => {
    expect(canReconcileCartFromCatalog(true, new Error('offline'), PRODUCTS)).toBe(false);
    expect(canReconcileCartFromCatalog(true, null, [])).toBe(false);
    expect(canReconcileCartFromCatalog(false, null, PRODUCTS)).toBe(false);
    expect(canReconcileCartFromCatalog(true, null, PRODUCTS)).toBe(true);
  });

  it('preserves custom-seat products and their already-calculated price unchanged', () => {
    expect(refreshCartFromCatalog([customSeatItem], PRODUCTS)).toEqual([customSeatItem]);
  });
});
