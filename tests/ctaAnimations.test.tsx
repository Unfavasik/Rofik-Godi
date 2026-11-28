import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase', () => ({ supabase: null }));

import { CartDrawer } from '../src/components/CartDrawer';
import { CheckoutCouponValidator } from '../src/components/CheckoutCouponValidator';
import { ProductCard } from '../src/components/ProductCard';
import { CustomerSupportRequestForm } from '../src/components/CustomerSupportRequestForm';
import { ReviewComposer } from '../src/components/ReviewComposer';
import { AdminNotificationComposer } from '../src/components/AdminNotificationComposer';
import { Header } from '../src/components/Header';
import { CartArcOverlay } from '../src/components/CartArcOverlay';
import Onboarding from '../src/components/Onboarding';
import { I18nProvider } from '../src/lib/i18n';
import { computeParabolicArcTrajectory } from '../src/lib/motionChoreography';
import { PRODUCTS } from '../src/data/products';
import type { CartItem } from '../src/types';

const sampleProduct = {
  ...PRODUCTS[0],
  id: 'prod-shine-1',
  slug: 'royal-shine-cover',
  title: 'Royal Ribbed Seat Cover',
  category: 'bike' as const,
  price: 899,
  originalPrice: 1199,
  rating: 4.9,
  reviewCount: 42,
  image: '/images/sample.jpg',
  inStock: true,
  description: 'Waterproof ribbed cover.',
  compatibility: ['Bike'],
};

const sampleItems: CartItem[] = [
  {
    cartItemId: 'item-1',
    product: sampleProduct,
    unitPrice: 899,
    quantity: 1,
    selectedColor: { name: 'Jet Black', hex: '#111111', images: ['/images/sample.jpg'] },
  },
];

describe('Banner CTA shine & motion roll-out', () => {
  it('defines periodic bannerCtaShine, disabled guards, and reduced-motion rules in src/index.css', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    expect(css).toContain('@keyframes bannerCtaShine');
    expect(css).toContain('.banner-cta-shine');
    expect(css).toContain('.banner-cta-shine:disabled::after');
    expect(css).toContain(".banner-cta-shine[aria-disabled='true']::after");
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('applies banner-cta-shine and icon slide to CartDrawer Proceed to Checkout CTA', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <CartDrawer
          isOpen
          onClose={() => undefined}
          items={sampleItems}
          userId="user-1"
          onUpdateQuantity={() => undefined}
          onRemoveItem={() => undefined}
          onProceedToCheckout={() => undefined}
        />
      </I18nProvider>,
    );

    expect(html).toContain('Proceed to Checkout');
    expect(html).toContain('banner-cta-shine');
    expect(html).toContain('group/cta');
    expect(html).toContain('group-hover/cta:translate-x-0.5');
  });

  it('renders animated EmptyCartState and engaging Shop Now CTA when CartDrawer is empty', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <CartDrawer
          isOpen
          onClose={() => undefined}
          onShopNow={() => undefined}
          items={[]}
          userId="user-1"
          onUpdateQuantity={() => undefined}
          onRemoveItem={() => undefined}
          onProceedToCheckout={() => undefined}
        />
      </I18nProvider>,
    );

    expect(html).toContain('data-testid="cart-empty-state"');
    expect(html).toContain('data-testid="cart-empty-shop-now"');
    expect(html).toContain('Your cart is empty');
    expect(html).toContain('Shop Now');
    expect(html).toContain('banner-cta-shine');
    expect(html).toContain('group-hover/cta:translate-x-1');
  });

  it('applies banner-cta-shine to CheckoutCouponValidator Apply CTA', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <CheckoutCouponValidator
          couponInput="RIDE100"
          onCouponInputChange={() => undefined}
          appliedCoupon={null}
          errorMessage=""
          isValidating={false}
          onApply={() => undefined}
          onRemove={() => undefined}
        />
      </I18nProvider>,
    );

    expect(html).toContain('banner-cta-shine');
    expect(html).toContain('group/cta');
  });

  it('applies banner-cta-shine to ProductCard quick-add CTA in both card layouts', () => {
    const listHtml = renderToStaticMarkup(
      <I18nProvider language="en">
        <ProductCard
          product={sampleProduct}
          onSelectProduct={() => undefined}
          onQuickAddToCart={() => undefined}
          isWishlisted={false}
          onToggleWishlist={() => undefined}
          onOpenCart={() => undefined}
          layoutMode="list"
        />
      </I18nProvider>,
    );
    const gridHtml = renderToStaticMarkup(
      <I18nProvider language="en">
        <ProductCard
          product={sampleProduct}
          onSelectProduct={() => undefined}
          onQuickAddToCart={() => undefined}
          isWishlisted={false}
          onToggleWishlist={() => undefined}
          onOpenCart={() => undefined}
          layoutMode="grid"
        />
      </I18nProvider>,
    );

    expect(listHtml).toContain('banner-cta-shine');
    expect(gridHtml).toContain('banner-cta-shine');
  });

  it('applies banner-cta-shine to Onboarding, Support form, ReviewComposer, and AdminNotificationComposer primary CTAs', () => {
    const onboardingHtml = renderToStaticMarkup(<Onboarding onFinish={() => undefined} />);
    const supportHtml = renderToStaticMarkup(
      <CustomerSupportRequestForm isAuthenticated expectedUserId="user-1" />,
    );
    const reviewHtml = renderToStaticMarkup(
      <ReviewComposer
        productId="prod-1"
        orderId="ord-1"
        productTitle="Royal Cover"
        onClose={() => undefined}
        onSaved={() => undefined}
      />,
    );
    const adminNotifyHtml = renderToStaticMarkup(
      <AdminNotificationComposer customers={[]} onSent={() => undefined} notify={() => undefined} />,
    );

    expect(onboardingHtml).toContain('banner-cta-shine');
    expect(supportHtml).toContain('banner-cta-shine');
    expect(reviewHtml).toContain('banner-cta-shine');
    expect(adminNotifyHtml).toContain('banner-cta-shine');
  });

  it('defines squash-and-stretch, cart catch, and staging focus choreography with reduced-motion guards in src/index.css', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    expect(css).toContain('.btn-squash-stretch');
    expect(css).toContain('@keyframes cartTargetCatch');
    expect(css).toContain('.cart-target-catch');
    expect(css).toContain('@keyframes stagingFocusSpotlight');
    expect(css).toContain('.staging-focus-spotlight');
    expect(css).toContain('@keyframes stagingFocusCard');
    expect(css).toContain('.staging-focus-card');
  });

  it('wires anticipation wind-up, focus staging, squash-and-stretch buttons, and parabolic cart arc projectiles', () => {
    const headerHtml = renderToStaticMarkup(
      <I18nProvider language="en">
        <Header
          cartCount={2}
          notificationCount={1}
          onOpenCart={() => undefined}
          onOpenNotifications={() => undefined}
          onOpenAccount={() => undefined}
          searchQuery=""
          setSearchQuery={() => undefined}
          onOpenSearch={() => undefined}
        />
      </I18nProvider>,
    );
    expect(headerHtml).toContain('data-cart-target="true"');
    expect(headerHtml).toContain('btn-squash-stretch');

    const supportHtml = renderToStaticMarkup(
      <CustomerSupportRequestForm isAuthenticated expectedUserId="user-1" />,
    );
    expect(supportHtml).toContain('data-testid="support-send-button"');
    expect(supportHtml).toContain('data-send-phase="idle"');
    expect(supportHtml).toContain('data-testid="support-send-icon"');
    expect(supportHtml).toContain('data-focus-staged="false"');
    expect(supportHtml).toContain('btn-squash-stretch');

    const start = { x: 140, y: 540 };
    const end = { x: 350, y: 44 };
    const arcHtml = renderToStaticMarkup(
      <CartArcOverlay
        flights={[
          {
            id: 'flight-1',
            image: '/images/sample.jpg',
            title: sampleProduct.title,
            start,
            end,
            trajectory: computeParabolicArcTrajectory(start, end),
          },
        ]}
        onFlightComplete={() => undefined}
      />,
    );
    expect(arcHtml).toContain('data-testid="cart-arc-overlay"');
    expect(arcHtml).toContain('data-testid="cart-arc-ribbon"');
    expect(arcHtml).toContain('data-testid="cart-arc-trail"');
    expect(arcHtml).toContain('data-testid="cart-arc-projectile"');
    expect(arcHtml).toContain('+1');
  });
});
