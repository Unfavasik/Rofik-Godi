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
    isQuickAddInCart={() => false}
    onToggleWishlist={() => {}}
    onOpenCart={() => {}}
    sortLabel="Popular & Recommended"
    activeFilterCount={0}
    onOpenSort={() => {}}
    onOpenFilter={() => {}}
    {...overrides}
  />,
);

const renderCard = (product: Product, layoutMode: 'grid' | 'list' | 'shelf' = 'grid', isWishlisted = false, isInCart = false, onNotifyMe?: React.ComponentProps<typeof ProductCard>['onNotifyMe']) => renderToStaticMarkup(
  <ProductCard
    product={product}
    layoutMode={layoutMode}
    onSelectProduct={() => {}}
    onQuickAddToCart={() => {}}
    isInCart={isInCart}
    onOpenCart={() => {}}
    isWishlisted={isWishlisted}
    onToggleWishlist={() => {}}
    onNotifyMe={onNotifyMe}
  />,
);

describe('catalog feedback', () => {
  it('shows an explicit empty state and an accurate zero count instead of a fake total', () => {
    const html = renderShop();
    expect(html).toContain('0 products found');
    expect(html).toContain('No products found');
    expect(html).toContain('aria-label="Sort products"');
    expect(html).toContain('aria-label="Filter products"');
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

  it.each(['grid', 'list', 'shelf'] as const)('announces the wishlist toggle state and heart-beat pulse class in %s product cards', (layoutMode) => {
    const added = renderCard(sampleProduct, layoutMode, true);
    const notAdded = renderCard(sampleProduct, layoutMode, false);

    expect(added).toContain('aria-label="Remove from Wishlist"');
    expect(added).toContain('aria-pressed="true"');
    expect(added).toContain('wishlist-heartbeat');
    expect(notAdded).toContain('aria-label="Add to Wishlist"');
    expect(notAdded).toContain('aria-pressed="false"');
    expect(notAdded).not.toContain('wishlist-heartbeat');
  });

  it('does not invent a zero-star score and formats catalog pricing with a real savings badge', () => {
    const unrated = renderCard({ ...sampleProduct, rating: 0, reviewCount: 0 });
    expect(unrated).not.toContain('>0.0</span>');
    expect(unrated).toContain('₹499');
    expect(unrated).toContain('₹799');
    expect(unrated).toContain('Save 38%');

    const reviewed = renderCard({ ...sampleProduct, rating: 4.7, reviewCount: 12 }, 'list');
    expect(reviewed).toContain('4.7');
    expect(reviewed).toContain('(12 reviews)');
  });

  it.each(['grid', 'list', 'shelf'] as const)('offers Go to Cart for an in-cart product in %s cards', (layoutMode) => {
    const inCart = renderCard(sampleProduct, layoutMode, false, true);
    const notInCart = renderCard(sampleProduct, layoutMode, false, false);

    expect(inCart).toContain('aria-label="Go to Cart"');
    expect(inCart).toContain('title="Go to Cart"');
    expect(inCart).not.toContain('Remove from cart');
    expect(notInCart).toContain('aria-label="Add to cart"');
  });

  it.each(['grid', 'list', 'shelf'] as const)('offers Notify me for out-of-stock %s product cards', (layoutMode) => {
    const html = renderCard({ ...sampleProduct, inStock: false }, layoutMode, false, false, () => {});

    expect(html).toContain('aria-label="Notify me when in stock"');
    expect(html).toContain('>Notify me</button>');
    expect(html).toContain('Out of stock');
    expect(html).not.toContain('disabled=""');
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

  it.each(['grid', 'shelf'] as const)('renders 1:1 square (800x800 ratio) image containers on %s product cards', (layoutMode) => {
    const html = renderCard(sampleProduct, layoutMode);
    expect(html).toContain('aspect-square');
    expect(html).not.toContain('h-[112px]');
    expect(html).not.toContain('h-[132px]');
  });
});
