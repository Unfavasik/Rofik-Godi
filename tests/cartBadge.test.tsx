import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CartBadge } from '../src/components/CartBadge';
import { Header } from '../src/components/Header';
import { ShopView } from '../src/components/ShopView';
import { PRODUCTS } from '../src/data/products';

describe('CartBadge pop/bounce feedback', () => {
  it('hides when count is 0 unless showZero is enabled and caps counts above 99', () => {
    expect(renderToStaticMarkup(<CartBadge count={0} />)).toBe('');

    const zeroHtml = renderToStaticMarkup(<CartBadge count={0} showZero />);
    expect(zeroHtml).toContain('data-cart-badge="true"');
    expect(zeroHtml).toContain('>0<');

    const singleHtml = renderToStaticMarkup(<CartBadge count={3} />);
    expect(singleHtml).toContain('data-cart-badge="true"');
    expect(singleHtml).toContain('>3<');

    const cappedHtml = renderToStaticMarkup(<CartBadge count={120} />);
    expect(cappedHtml).toContain('>99+<');
  });

  it('renders CartBadge inside Header and ShopView cart buttons', () => {
    const headerHtml = renderToStaticMarkup(
      <Header
        cartCount={4}
        onOpenCart={() => undefined}
      />,
    );
    expect(headerHtml).toContain('data-cart-badge="true"');
    expect(headerHtml).toContain('>4<');

    const shopHtml = renderToStaticMarkup(
      <ShopView
        products={PRODUCTS.slice(0, 1)}
        wishlist={[]}
        cartCount={2}
        isLoading={false}
        error={null}
        onRetry={() => undefined}
        onBack={() => undefined}
        onSearch={() => undefined}
        onSelectProduct={() => undefined}
        onQuickAdd={() => undefined}
        isQuickAddInCart={() => false}
        onToggleWishlist={() => undefined}
        onOpenCart={() => undefined}
        sortLabel="Featured"
        activeFilterCount={0}
        onOpenSort={() => undefined}
        onOpenFilter={() => undefined}
      />,
    );
    expect(shopHtml).toContain('data-cart-badge="true"');
    expect(shopHtml).toContain('>2<');
  });
});
