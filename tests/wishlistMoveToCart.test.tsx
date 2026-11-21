import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WishlistModal } from '../src/components/WishlistModal';
import { PRODUCTS } from '../src/data/products';
import { addOrMergeCartItem, createDefaultCartItem } from '../src/lib/cart';
import type { Product } from '../src/types';

describe('Wishlist Move to Cart', () => {
  it('renders a Move to Cart button for every in-stock product and disables out-of-stock items', () => {
    const inStockProduct: Product = {
      ...PRODUCTS[0],
      id: 'prod-in-stock',
      title: 'Racing Edge Seat Cover',
      inStock: true,
      stockQuantity: 10,
    };
    const outOfStockProduct: Product = {
      ...PRODUCTS[0],
      id: 'prod-out-of-stock',
      title: 'Limited Carbon Cover',
      inStock: false,
      stockQuantity: 0,
    };

    const html = renderToStaticMarkup(
      <WishlistModal
        isOpen
        onClose={() => undefined}
        wishlist={[inStockProduct, outOfStockProduct]}
        onRemoveWishlist={() => undefined}
        onSelectProduct={() => undefined}
        onAddToCart={() => undefined}
        onMoveToCart={() => undefined}
        isInCart={() => false}
        cartCount={2}
        onOpenCart={() => undefined}
      />,
    );

    expect(html).toContain('aria-label="Move Racing Edge Seat Cover to cart"');
    expect(html).toContain('>Move to Cart<');
    expect(html).toContain('aria-label="Limited Carbon Cover is out of stock"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('data-cart-badge="true"');
    expect(html).toContain('>2<');
    expect(html).toContain('Move All to Cart (1)');
  });

  it('adds wishlist items idempotently without removing already-present cart items', () => {
    const product: Product = {
      ...PRODUCTS[0],
      id: 'prod-1',
      title: 'Apex Grid',
      inStock: true,
    };
    const first = addOrMergeCartItem([], createDefaultCartItem(product, 'item-1'));
    expect(first).toHaveLength(1);

    const movedAgain = addOrMergeCartItem(first, createDefaultCartItem(product, 'item-2'));
    expect(movedAgain).toHaveLength(1);
    expect(movedAgain[0].product.id).toBe('prod-1');
  });
});
