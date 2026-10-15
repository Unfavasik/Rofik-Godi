import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CatalogStatus } from '../src/components/CatalogStatus';
import { ProductCard } from '../src/components/ProductCard';
import { ShopView } from '../src/components/ShopView';
import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/types';

const sampleProduct = PRODUCTS[0]!;

const renderShop = (overrides: Partial<React.ComponentProps<typeof ShopView>> = {}) => renderToStaticMarkup(
  <ShopView
    products={[]}
    wishlist={[]}
    cartCount={0}
    isLoading={false}
    error={null}
    onRetry={() => {}}
    onBack={() => {}}
    onSearch={() => {}}
    onSelectProduct={() => {}}
    onQuickAdd={() => {}}
    onToggleWishlist={() => {}}
    onOpenCart={() => {}}
    {...overrides}
  />,
);

const renderCard = (product: Product, layoutMode: 'grid' | 'list' | 'shelf' = 'grid', isWishlisted = false) => renderToStaticMarkup(
  <ProductCard
    product={product}
    layoutMode={layoutMode}
    onSelectProduct={() => {}}
    onQuickAddToCart={() => {}}
    isWishlisted={isWishlisted}
    onToggleWishlist={() => {}}
  />,
);

describe('catalog feedback', () => {
  it('shows an explicit empty state and an accurate zero count instead of a fake total', () => {
    const html = renderShop();
    expect(html).toContain('0 products found');
    expect(html).toContain('No products found');
    expect(html).not.toContain('128 products found');
  });

  it('uses renderable products as the shared source for count, categories, and cards', () => {
    const renderable = {
      ...sampleProduct,
      id: 'valid-product',
      title: 'Renderable seat cover',
      categoryLabel: 'Bike Covers',
    };
    const invalid = {
      ...sampleProduct,
      id: 'missing-title',
      title: '   ',
      categoryLabel: 'Invalid category',
    };
    const html = renderShop({ products: [renderable, invalid] });

    expect(html).toContain('1 product found');
    expect(html).toContain('Renderable seat cover');
    expect(html).toContain('Bike Covers');
    expect(html).not.toContain('Invalid category');
  });

  it('shows the empty state if backend rows exist but none has both an id and title', () => {
    const invalidProduct = { ...sampleProduct, id: '', title: 'Missing identifier' };
    const html = renderShop({ products: [invalidProduct] });

    expect(html).toContain('0 products found');
    expect(html).toContain('No products found');
    expect(html).not.toContain('Products Catalog');
  });

  it.each(['grid', 'list'] as const)('shows an image placeholder in %s mode when the image URL is blank', (layoutMode) => {
    const product = { ...sampleProduct, image: '' };
    const html = renderCard(product, layoutMode);

    expect(html).toContain('Image unavailable');
    expect(html).not.toContain('src=""');
  });

  it.each(['grid', 'list', 'shelf'] as const)('uses a semantic keyboard-operable opener for %s product cards', (layoutMode) => {
    const html = renderCard(sampleProduct, layoutMode);

    expect(html).toContain(`<button type="button" aria-label="View ${sampleProduct.title}"`);
    expect(html).not.toContain('<article onClick');
    expect(html).not.toContain('role="button"');
  });

  it.each(['grid', 'list', 'shelf'] as const)('announces the wishlist toggle state in %s product cards', (layoutMode) => {
    const added = renderCard(sampleProduct, layoutMode, true);
    const notAdded = renderCard(sampleProduct, layoutMode, false);

    expect(added).toContain('aria-label="Remove from Wishlist"');
    expect(added).toContain('aria-pressed="true"');
    expect(notAdded).toContain('aria-label="Add to Wishlist"');
    expect(notAdded).toContain('aria-pressed="false"');
  });

  it.each(['grid', 'list', 'shelf'] as const)('disables quick-add for out-of-stock %s product cards', (layoutMode) => {
    const html = renderCard({ ...sampleProduct, inStock: false }, layoutMode);

    expect(html).toContain('aria-label="Out of stock"');
    expect(html).toContain('disabled=""');
  });

  it('shows a loading status while the catalog request is pending', () => {
    const html = renderShop({ isLoading: true });
    expect(html).toContain('Loading products…');
    expect(html).toContain('role="status"');
  });

  it('shows a safe retry action instead of exposing backend errors', () => {
    const retry = vi.fn();
    const html = renderToStaticMarkup(<CatalogStatus state="error" onRetry={retry} />);
    expect(html).toContain('Couldn’t load the product catalog');
    expect(html).toContain('Try again');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('service_role');
  });
});
