import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProductDetailModal } from '../src/components/ProductDetailModal';
import { PRODUCTS } from '../src/data/products';
import { getCartItemUnitPrice } from '../src/lib/cart';
import type { Product } from '../src/types';

const renderDetails = (product: Product, initialColorName?: string) =>
  renderToStaticMarkup(
    <ProductDetailModal
      products={PRODUCTS}
      product={product}
      onClose={() => {}}
      onAddToCart={() => {}}
      onBuyNow={() => {}}
      isWishlisted={false}
      onToggleWishlist={() => {}}
      onNotifyMe={() => {}}
      initialColorName={initialColorName}
    />,
  );

describe('product availability awareness and product detail page UI/UX', () => {
  it('replaces purchase actions with Notify me when out of stock', () => {
    const html = renderDetails({ ...PRODUCTS[0]!, inStock: false });
    expect(html).toContain('Out of stock');
    expect(html).toContain('Notify me when this product is back in stock');
    expect(html).toContain('>Notify me</button>');
    expect(html).not.toContain('Buy Now');
  });

  it('renders desktop split-view layout, mobile sticky bar, and light-slate crimson shine theme', () => {
    const html = renderDetails(PRODUCTS[0]!);
    expect(html).toContain('bg-[#F8FAFC]');
    expect(html).toContain('lg:grid-cols-12');
    expect(html).toContain('lg:col-span-7');
    expect(html).toContain('lg:col-span-5');
    expect(html).toContain('lg:sticky');
    expect(html).toContain('lg:hidden');
    expect(html).toContain('banner-cta-shine');
    expect(html).toContain('aspect-square');
    expect(html).not.toContain('aspect-[4/3]');
    expect(html).toContain('Zoom product image');
    expect(html).toContain('Add to wishlist');
    expect(html).toContain('>Like<');
    expect(html).toContain('>Zoom<');
    expect(html).not.toContain('pointer-events-none absolute inset-x-0 top-0');
    expect(html).not.toContain('w-screen');
    expect(html).not.toContain('w-[100vw]');
  });

  it('exposes inline thickness, stitch, embroidery, vehicle fitment, and quantity controls', () => {
    const customizableProduct =
      PRODUCTS.find((p) => p.isCustomizable && p.thicknessOptions.length > 0) ?? PRODUCTS[0]!;
    const html = renderDetails(customizableProduct);
    expect(html).toContain('Color Finish');
    expect(html).toContain('Foam Thickness &amp; Cushioning');
    expect(html).toContain('Stitch Pattern');
    expect(html).toContain('Custom Name Embroidery');
    expect(html).toContain('Vehicle Fitment Check');
    expect(html).toContain('Decrease quantity');
    expect(html).toContain('Increase quantity');
  });

  it('displays accurate workshop pickup and Razorpay/counter trust guarantees without delivery claims', () => {
    const html = renderDetails(PRODUCTS[0]!);
    expect(html).toContain('Workshop Pickup &amp; Free Fitment');
    expect(html).toContain('7-Day Defect Replacement');
    expect(html).toContain('Razorpay Online or Pay at Workshop');
    expect(html).not.toContain('Free Delivery');
  });

  it('computes custom embroidery unit pricing consistently for Add to Cart and Buy Now', () => {
    const product = PRODUCTS.find((p) => p.isCustomizable) ?? PRODUCTS[0]!;
    const baseThickness = product.thicknessOptions[0] ?? { label: 'Standard', extraPrice: 0 };
    const withoutEmbroidery = getCartItemUnitPrice(product, baseThickness, '');
    const withEmbroidery = getCartItemUnitPrice(product, baseThickness, 'ASIK 07');
    expect(withEmbroidery - withoutEmbroidery).toBe(150);
  });

  it('renders sticky Product Highlights navigation tabs linked to Description, Specifications, Embroidery Details, and Reviews', () => {
    const customizableProduct = PRODUCTS.find((p) => p.isCustomizable) ?? PRODUCTS[0]!;
    const html = renderDetails(customizableProduct);
    expect(html).toContain('aria-label="Product Highlights navigation"');
    expect(html).toContain('Product Highlights');
    expect(html).toContain('sticky top-2');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-controls="pdp-section-description"');
    expect(html).toContain('aria-controls="pdp-section-specifications"');
    expect(html).toContain('aria-controls="pdp-section-embroidery"');
    expect(html).toContain('aria-controls="pdp-section-reviews"');
    expect(html).toContain('id="pdp-section-description"');
    expect(html).toContain('id="pdp-section-specifications"');
    expect(html).toContain('id="pdp-section-embroidery"');
    expect(html).toContain('Embroidery Details');
  });
});
