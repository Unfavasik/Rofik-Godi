import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../src/data/products';
import { addOrMergeCartItem, buildReorderCartItems, canReconcileCartFromCatalog, createDefaultCartItem, hasMatchingCartItem, refreshCartFromCatalog, resolveStitchPatternSelection, sanitizePersistedCart, toggleCartItem } from '../src/lib/cart';
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
  it('toggles the same default product configuration into and out of the cart', () => {
    const defaultItem = createDefaultCartItem(originalProduct, 'home-default');
    const added = toggleCartItem([], defaultItem);
    expect(added).toHaveLength(1);
    expect(hasMatchingCartItem(added, { ...defaultItem, cartItemId: 'shop-default' })).toBe(true);

    const removed = toggleCartItem(added, { ...defaultItem, cartItemId: 'shop-default' });
    expect(removed).toHaveLength(0);
  });

  it('keeps an identical product configuration as one cart line without auto-incrementing quantity', () => {
    const fromHome: CartItem = { ...cartItem, cartItemId: 'home-add', quantity: 1, customEmbroideryText: undefined, selectedStitch: undefined };
    const fromShop: CartItem = { ...fromHome, cartItemId: 'shop-add', quantity: 2, selectedStitch: '' };
    const merged = addOrMergeCartItem([fromHome], fromShop);

    expect(merged).toHaveLength(1);
    expect(merged[0].cartItemId).toBe('home-add');
    expect(merged[0].quantity).toBe(1);
    expect(addOrMergeCartItem([], fromShop)[0].quantity).toBe(2);
  });

  it('keeps distinct color or embroidery configurations separate and leaves quantity changes to cart controls', () => {
    const baseLine: CartItem = { ...cartItem, customEmbroideryText: undefined, quantity: 98 };
    const otherColor: CartItem = { ...baseLine, cartItemId: 'other-color', selectedColor: { ...baseLine.selectedColor, name: 'Different color', hex: '#FFFFFF' }, quantity: 1 };
    const embroidered: CartItem = { ...baseLine, cartItemId: 'embroidered', customEmbroideryText: 'Rider', quantity: 1 };

    expect(addOrMergeCartItem([baseLine], otherColor)).toHaveLength(2);
    expect(addOrMergeCartItem([baseLine], embroidered)).toHaveLength(2);
    expect(addOrMergeCartItem([baseLine], { ...baseLine, cartItemId: 'extra', quantity: 4 })[0].quantity).toBe(98);
  });

  it('never invents a default stitch pattern that is absent from the product catalog', () => {
    expect(resolveStitchPatternSelection([], 'Standard')).toBeUndefined();
    expect(resolveStitchPatternSelection(['Quilted Diamond'])).toBe('Quilted Diamond');
    expect(resolveStitchPatternSelection(['Quilted Diamond'], 'Standard')).toBe('Quilted Diamond');
  });

  it('sanitizes stored data and clamps quantities to the transaction limit', () => {
    const [safe] = sanitizePersistedCart([{ ...cartItem, quantity: 500 }, null, { cartItemId: 'broken' }]);
    expect(safe.quantity).toBe(99);
    expect(sanitizePersistedCart({ not: 'an array' })).toEqual([]);
  });

  it('coalesces identical duplicate cart lines already saved in local storage', () => {
    const merged = sanitizePersistedCart([
      { ...cartItem, cartItemId: 'legacy-one', quantity: 70 },
      { ...cartItem, cartItemId: 'legacy-two', quantity: 60 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].cartItemId).toBe('legacy-one');
    expect(merged[0].quantity).toBe(99);
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

  it('replaces stale saved stitch choices with an available option or no stitch', () => {
    const staleItem = { ...cartItem, selectedStitch: 'Standard' };
    const withStitches = { ...originalProduct, stitchPatterns: ['Quilted Diamond'] };
    const withoutStitches = { ...originalProduct, stitchPatterns: [] };

    expect(refreshCartFromCatalog([staleItem], [withStitches])[0].selectedStitch).toBe('Quilted Diamond');
    expect(refreshCartFromCatalog([staleItem], [withoutStitches])[0].selectedStitch).toBeUndefined();
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

  it('rebuilds a completed order with current prices and the same supported selections', () => {
    const currentProduct: Product = {
      ...originalProduct,
      price: 700,
      inStock: true,
      colors: [{ name: 'Blue', hex: '#2563EB', bgClass: 'bg-blue-600' }],
      thicknessOptions: [{ label: 'Premium', extraPrice: 35 }],
      stitchPatterns: ['Diamond'],
      isCustomizable: true,
    };
    const result = buildReorderCartItems([{
      product_id: currentProduct.id,
      product_name: currentProduct.title,
      color: 'Blue',
      quantity: 2,
      unit_price: 1,
      selected_thickness: 'Premium',
      selected_stitch: 'Diamond',
      custom_embroidery_text: '  Rider  ',
    }], [currentProduct]);

    expect(result.skippedItems).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      quantity: 2,
      selectedColor: { name: 'Blue', hex: '#2563EB' },
      selectedThickness: { label: 'Premium', extraPrice: 35 },
      selectedStitch: 'Diamond',
      customEmbroideryText: 'Rider',
      unitPrice: 885,
    });
    expect(result.items[0].product.price).toBe(700);
  });

  it('skips products no longer in the live catalog or currently out of stock', () => {
    const outOfStock = { ...originalProduct, id: 'out-of-stock', inStock: false };
    const result = buildReorderCartItems([
      { product_id: 'removed-product', product_name: 'Removed item', color: null, quantity: 1, unit_price: 100 },
      { product_id: outOfStock.id, product_name: 'Sold out item', color: null, quantity: 1, unit_price: 100 },
    ], [outOfStock]);

    expect(result.items).toEqual([]);
    expect(result.skippedItems).toEqual(['Removed item', 'Sold out item']);
  });
});
