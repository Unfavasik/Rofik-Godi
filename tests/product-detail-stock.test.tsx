import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProductDetailModal } from '../src/components/ProductDetailModal';
import { ProductReviews } from '../src/components/ProductReviews';
import { CustomerReviews } from '../src/components/CustomerReviews';
import { PRODUCTS } from '../src/data/products';
import { getCartItemUnitPrice } from '../src/lib/cart';
import { filterAndSortReviews } from '../src/lib/supabaseReviews';
import type { Product } from '../src/types';

const renderDetails = (product: Product, initialColorName?: string, isWishlisted = false) =>
  renderToStaticMarkup(
    <ProductDetailModal
      products={PRODUCTS}
      product={product}
      onClose={() => {}}
      onAddToCart={() => {}}
      onBuyNow={() => {}}
      isWishlisted={isWishlisted}
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

  it('renders desktop split-view layout, mobile sticky bar, and classic-glass theme', () => {
    const html = renderDetails(PRODUCTS[0]!);
    expect(html).toContain('bg-[#F8FAFC]');
    expect(html).toContain('classic-glass');
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

  it('applies the wishlist heart-beat pulse animation class in ProductDetailModal when wishlisted', () => {
    const notWishlistedHtml = renderDetails(PRODUCTS[0]!, undefined, false);
    const wishlistedHtml = renderDetails(PRODUCTS[0]!, undefined, true);

    expect(notWishlistedHtml).not.toContain('wishlist-heartbeat');
    expect(wishlistedHtml).toContain('wishlist-heartbeat');
    expect(wishlistedHtml).toContain('Remove from wishlist');
    expect(wishlistedHtml).toContain('>Liked<');
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

  it('removes the sticky Product Highlights navigation mode while retaining product info sections', () => {
    const customizableProduct = PRODUCTS.find((p) => p.isCustomizable) ?? PRODUCTS[0]!;
    const html = renderDetails(customizableProduct);
    expect(html).not.toContain('aria-label="Product Highlights navigation"');
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain('Description');
    expect(html).toContain('Specifications');
    expect(html).toContain('Embroidery Details');
  });

  it('shows Verified Customer badge linking to order history only for verified purchases of the specific product', () => {
    const product = PRODUCTS[0]!;
    const html = renderToStaticMarkup(
      <ProductReviews
        productId={product.id}
        productTitle={product.title}
        isAuthenticated={true}
        customerId="cust-1"
        onRequestLogin={() => {}}
        initialOrders={[
          {
            id: 'ord-1',
            order_number: 'RGC-1042',
            status: 'COMPLETED',
            order_items: [{ product_id: product.id }],
          },
        ]}
        initialReviews={[
          {
            id: 'rev-own-verified',
            product_id: product.id,
            order_id: 'ord-1',
            customer_id: 'cust-1',
            author_name: 'Ayan Mondal',
            rating: 5,
            review_text: 'Perfect fit on my bike seat.',
            is_verified_purchase: true,
            is_published: true,
            created_at: '2026-11-10T10:00:00Z',
          },
          {
            id: 'rev-other-verified',
            product_id: product.id,
            order_id: 'ord-2',
            customer_id: 'cust-2',
            author_name: 'Rabiul Sk',
            rating: 5,
            review_text: 'Great grip and finish.',
            is_verified_purchase: true,
            is_published: true,
            created_at: '2026-11-09T10:00:00Z',
          },
          {
            id: 'rev-unverified',
            product_id: product.id,
            order_id: '',
            customer_id: 'cust-3',
            author_name: 'Guest Reviewer',
            rating: 4,
            review_text: 'Looks nice.',
            is_verified_purchase: false,
            is_published: true,
            created_at: '2026-11-08T10:00:00Z',
          },
        ]}
      />,
    );

    expect(html).toContain('Verified Customer');
    expect(html).toContain('href="/my-order/order/rgc-1042"');
    expect(html).toContain('href="/my-orders"');
    expect((html.match(/>Verified Customer</g) || []).length).toBe(2);

    const homeReviewsHtml = renderToStaticMarkup(
      <CustomerReviews
        initialReviews={[
          {
            id: 'home-rev-1',
            product_id: product.id,
            order_id: 'ord-9',
            customer_id: 'cust-9',
            author_name: 'Imran Ali',
            rating: 5,
            review_text: 'Sturdy stitching.',
            is_verified_purchase: true,
            is_published: true,
            created_at: '2026-11-11T10:00:00Z',
            product_name: product.title,
          },
        ]}
      />,
    );
    expect(homeReviewsHtml).toContain('Verified Customer');
    expect(homeReviewsHtml).toContain('href="/my-orders"');
  });

  it('filters and sorts CustomerReviews and ProductReviews by Most Recent, Highest Rating, and Verified Purchases Only', () => {
    const product = PRODUCTS[0]!;
    const sampleReviews = [
      {
        id: 'rev-recent-low',
        product_id: product.id,
        order_id: '',
        customer_id: 'cust-10',
        author_name: 'Newest Unverified',
        rating: 3,
        review_text: 'Decent cover.',
        is_verified_purchase: false,
        is_published: true,
        created_at: '2026-11-12T10:00:00Z',
        product_name: product.title,
      },
      {
        id: 'rev-older-high-verified',
        product_id: product.id,
        order_id: 'ord-55',
        customer_id: 'cust-11',
        author_name: 'Top Rated Verified',
        rating: 5,
        review_text: 'Superb cushioning and waterproof stitch.',
        is_verified_purchase: true,
        is_published: true,
        created_at: '2026-11-05T10:00:00Z',
        product_name: product.title,
      },
    ];

    const byRecent = filterAndSortReviews(sampleReviews, 'most-recent', product.id);
    expect(byRecent.map((r) => r.id)).toEqual(['rev-recent-low', 'rev-older-high-verified']);

    const byHighest = filterAndSortReviews(sampleReviews, 'highest-rating', product.id);
    expect(byHighest.map((r) => r.id)).toEqual(['rev-older-high-verified', 'rev-recent-low']);

    const verifiedOnly = filterAndSortReviews(sampleReviews, 'verified-only', product.id);
    expect(verifiedOnly.map((r) => r.id)).toEqual(['rev-older-high-verified']);

    const customerReviewsHighestHtml = renderToStaticMarkup(
      <CustomerReviews initialReviews={sampleReviews} initialFilter="highest-rating" />,
    );
    expect(customerReviewsHighestHtml).toContain('aria-label="Filter and sort customer reviews"');
    expect(customerReviewsHighestHtml).toContain('>Most Recent<');
    expect(customerReviewsHighestHtml).toContain('>Highest Rating<');
    expect(customerReviewsHighestHtml).toContain('>Verified Purchases Only<');
    expect(customerReviewsHighestHtml.indexOf('Top Rated Verified')).toBeLessThan(
      customerReviewsHighestHtml.indexOf('Newest Unverified'),
    );

    const customerReviewsVerifiedHtml = renderToStaticMarkup(
      <CustomerReviews initialReviews={sampleReviews} initialFilter="verified-only" />,
    );
    expect(customerReviewsVerifiedHtml).toContain('Top Rated Verified');
    expect(customerReviewsVerifiedHtml).not.toContain('Newest Unverified');

    const productReviewsVerifiedHtml = renderToStaticMarkup(
      <ProductReviews
        productId={product.id}
        productTitle={product.title}
        isAuthenticated={false}
        onRequestLogin={() => {}}
        initialReviews={sampleReviews}
        initialFilter="verified-only"
      />,
    );
    expect(productReviewsVerifiedHtml).toContain('Top Rated Verified');
    expect(productReviewsVerifiedHtml).not.toContain('Newest Unverified');
  });
});
