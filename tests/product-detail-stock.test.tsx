import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProductDetailModal } from '../src/components/ProductDetailModal';
import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/types';

const renderDetails = (product: Product) => renderToStaticMarkup(
  <ProductDetailModal
    products={[product]}
    product={product}
    onClose={() => {}}
    onAddToCart={() => {}}
    isWishlisted={false}
    onToggleWishlist={() => {}}
    onNotifyMe={() => {}}
  />,
);

describe('product availability awareness', () => {
  it('replaces purchase actions with Notify me when out of stock', () => {
    const html = renderDetails({ ...PRODUCTS[0]!, inStock: false });
    expect(html).toContain('Out of stock');
    expect(html).toContain('Notify me when this product is back in stock');
    expect(html).toContain('>Notify me</button>');
    expect(html).not.toContain('Buy Now');
  });
});
