import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CatalogStatus } from '../src/components/CatalogStatus';
import { ShopView } from '../src/components/ShopView';

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

describe('catalog feedback', () => {
  it('shows an explicit empty state and an accurate zero count instead of a fake total', () => {
    const html = renderShop();
    expect(html).toContain('0 products found');
    expect(html).toContain('No active products yet');
    expect(html).not.toContain('128 products found');
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
