import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../src/data/products';
import { refreshCartFromCatalog } from '../src/lib/cart';
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

describe('persisted cart reconciliation', () => {
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
});
