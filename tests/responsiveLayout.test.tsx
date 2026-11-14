import React from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));

import { CheckoutModal } from '../src/components/CheckoutModal';
import { CheckoutCouponValidator } from '../src/components/CheckoutCouponValidator';
import { CartDrawer } from '../src/components/CartDrawer';
import { WishlistModal } from '../src/components/WishlistModal';
import { BottomSheet } from '../src/components/BottomSheet';
import { MyOrdersView } from '../src/components/MyOrdersView';
import { CustomerOrdersModal } from '../src/components/CustomerOrdersModal';
import { ContactSupportView } from '../src/components/ContactSupportView';
import { SupportCenter } from '../src/components/SupportCenter';
import { SettingsView } from '../src/components/SettingsView';
import { AccountDeletionView } from '../src/components/AccountDeletionView';
import { SearchView } from '../src/components/SearchView';
import { CouponManagement } from '../src/components/CouponManagement';
import { BannersView, NotificationsView, ReportsView } from '../src/components/AdminSections';
import { AdminProductManager } from '../src/components/AdminProductManager';
import { AdminPanel } from '../src/components/AdminPanel';
import { AccountView } from '../src/components/AccountView';
import { I18nProvider } from '../src/lib/i18n';
import { PRODUCTS } from '../src/data/products';
import type { CartItem, CustomerOrderRecord } from '../src/types';

const sampleProduct = {
  ...PRODUCTS[0],
  id: 'prod-resp-1',
  slug: 'royal-ribbed-seat-cover',
  title: 'Royal Ribbed Waterproof Seat Cover',
  category: 'bike' as const,
  categoryLabel: 'Bike Covers',
  price: 650,
  originalPrice: 899,
  rating: 4.9,
  reviewCount: 42,
  image: '/images/sample.jpg',
  inStock: true,
  description: 'Waterproof ribbed bike seat cover.',
  compatibility: ['Royal Enfield Classic 350', 'Honda Shine 125'],
};

const sampleCart: CartItem[] = [
  {
    cartItemId: 'cart-1',
    product: sampleProduct,
    unitPrice: 650,
    quantity: 1,
    selectedColor: { name: 'Jet Black', hex: '#111111', images: ['/images/sample.jpg'] },
  },
];

const sampleOrder: CustomerOrderRecord = {
  id: 'order-1',
  order_number: 'RG-1001',
  order_slug: 'rg-1001',
  customer_name: 'Aarav Mondal',
  customer_phone: '+91 9876543210',
  fulfillment_method: 'STORE_PICKUP',
  pickup_store: 'Rofik Godi Centre',
  pickup_note: 'Pickup requested: 15 Nov 2026, 11:00 AM - 01:00 PM',
  vehicle_type: 'Bike',
  vehicle_company: 'Royal Enfield',
  vehicle_model: 'Classic 350 Signals',
  payment_method: 'PAY_AT_STORE',
  payment_status: 'PENDING',
  status: 'NEW',
  subtotal: 650,
  discount: 0,
  total: 650,
  created_at: '2026-11-13T06:00:00.000Z',
  order_items: [
    {
      product_id: sampleProduct.id,
      product_name: sampleProduct.title,
      color: 'Jet Black',
      unit_price: 650,
      quantity: 1,
      image_url: '/images/sample.jpg',
    },
  ],
};

describe('Global responsive meta and CSS invariants', () => {
  it('enforces viewport-fit=cover and mobile scaling meta in index.html', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain('width=device-width, initial-scale=1, viewport-fit=cover');
  });

  it('enforces global border-box, max-width 100%, overflow-x hidden, and safe-area padding in src/index.css', () => {
    const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');
    expect(css).toContain('max-width: 100%;');
    expect(css).toContain('overflow-x: hidden;');
    expect(css).toContain('box-sizing: border-box;');
    expect(css).toContain('padding-bottom: env(safe-area-inset-bottom);');
  });

  it('prevents w-screen and unguarded fixed-width dialogs across all components', () => {
    const componentsDir = join(process.cwd(), 'src/components');
    const files = readdirSync(componentsDir).filter((file) => file.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(20);

    for (const file of files) {
      const content = readFileSync(join(componentsDir, file), 'utf8');
      expect(content, `${file} should not use w-screen`).not.toMatch(/\bw-screen\b/);
      expect(content, `${file} should not use raw w-[100vw]`).not.toMatch(/\bw-\[100vw\]/);
    }
  });
});

describe('Storefront & Checkout mobile-first responsive markup', () => {
  it('renders CheckoutModal as a full-width mobile bottom sheet with pinned header, vertical scroller, and safe-area footer', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <CheckoutModal
          isOpen
          onClose={() => undefined}
          items={sampleCart}
          discount={0}
          couponCode=""
          onClearCart={() => undefined}
          userId="user-1"
          onOrderPlaced={() => undefined}
          onUpdateQuantity={() => undefined}
        />
      </I18nProvider>,
    );

    expect(html).toContain('overflow-x-hidden');
    expect(html).toContain('w-full max-w-full');
    expect(html).toContain('sm:max-w-[960px]');
    expect(html).toContain('overflow-y-auto overflow-x-hidden');
    expect(html).toContain('pb-[max(0.75rem,env(safe-area-inset-bottom))]');
    expect(html).toContain('₹650');
  });

  it('renders CheckoutCouponValidator with flex-wrap mobile controls, 44px button, and 16px mobile input font size', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <CheckoutCouponValidator
          couponInput=""
          onCouponInputChange={() => undefined}
          appliedCoupon={null}
          errorMessage=""
          isValidating={false}
          onApply={() => undefined}
          onRemove={() => undefined}
        />
      </I18nProvider>,
    );

    expect(html).toContain('min-w-0');
    expect(html).toContain('min-h-11');
    expect(html).toContain('text-base');
  });

  it('renders CartDrawer, WishlistModal, and BottomSheet with full mobile width and overflow-x-hidden', () => {
    const cartHtml = renderToStaticMarkup(
      <I18nProvider language="en">
        <CartDrawer
          isOpen
          onClose={() => undefined}
          items={sampleCart}
          userId="user-1"
          onUpdateQuantity={() => undefined}
          onRemoveItem={() => undefined}
          onProceedToCheckout={() => undefined}
        />
      </I18nProvider>,
    );
    expect(cartHtml).toContain('w-full max-w-full sm:max-w-[420px]');
    expect(cartHtml).toContain('overflow-x-hidden');

    const wishlistHtml = renderToStaticMarkup(
      <WishlistModal
        isOpen
        onClose={() => undefined}
        wishlist={[sampleProduct]}
        onRemoveWishlist={() => undefined}
        onSelectProduct={() => undefined}
        onAddToCart={() => undefined}
        isInCart={() => false}
        onOpenCart={() => undefined}
      />,
    );
    expect(wishlistHtml).toContain('w-full max-w-full sm:max-w-[440px]');
    expect(wishlistHtml).toContain('overflow-x-hidden');

    const sheetHtml = renderToStaticMarkup(
      <BottomSheet open title="Mobile Sheet Title" onClose={() => undefined}>
        <p>Inside sheet</p>
      </BottomSheet>,
    );
    expect(sheetHtml).toContain('w-full max-w-full');
    expect(sheetHtml).toContain('sm:max-w-lg');
    expect(sheetHtml).toContain('overflow-x-hidden overflow-y-auto');
    expect(sheetHtml).toContain('min-h-11 min-w-11');
  });

  it('renders Orders, Support, Search, Settings, and Account screens with grid-cols-1 defaults and overflow guards', () => {
    const myOrdersHtml = renderToStaticMarkup(
      <MyOrdersView
        orders={[sampleOrder]}
        loading={false}
        products={[sampleProduct]}
        reviews={[]}
        customerName="Aarav"
        onClose={() => undefined}
        onShop={() => undefined}
        onReview={() => undefined}
      />,
    );
    expect(myOrdersHtml).toContain('overflow-x-hidden');
    expect(myOrdersHtml).toContain('min-w-0');

    const customerOrdersHtml = renderToStaticMarkup(
      <I18nProvider language="en">
        <CustomerOrdersModal
          orders={[sampleOrder]}
          reviews={[]}
          loading={false}
          customerName="Aarav"
          currentUserId="user-1"
          onClose={() => undefined}
          onReview={() => undefined}
        />
      </I18nProvider>,
    );
    expect(customerOrdersHtml).toContain('w-full max-w-full');
    expect(customerOrdersHtml).toContain('overflow-x-hidden');

    const contactSupportHtml = renderToStaticMarkup(
      <ContactSupportView
        currentUserId="user-1"
        isAuthenticated
        onBack={() => undefined}
        onOpenSupportRequests={() => undefined}
      />,
    );
    expect(contactSupportHtml).toContain('max-w-full overflow-x-hidden');
    expect(contactSupportHtml).toContain('grid-cols-1');

    const supportCenterHtml = renderToStaticMarkup(
      <SupportCenter
        currentUserId="user-1"
        customerName="Aarav"
        isAuthenticated
        onBack={() => undefined}
        onSelectRequest={() => undefined}
      />,
    );
    expect(supportCenterHtml).toContain('overflow-x-hidden');
    expect(supportCenterHtml).toContain('min-h-11');

    const settingsHtml = renderToStaticMarkup(
      <I18nProvider language="en">
        <SettingsView onBack={() => undefined} isAuthenticated />
      </I18nProvider>,
    );
    expect(settingsHtml).toContain('overflow-x-hidden');

    const guestDeletionHtml = renderToStaticMarkup(
      <AccountDeletionView onBack={() => undefined} isAuthenticated={false} />,
    );
    expect(guestDeletionHtml).toContain('overflow-x-hidden');
    expect(guestDeletionHtml).toContain('Sign in to manage account deletion');
    expect(guestDeletionHtml).toContain('Back to settings');

    const authDeletionHtml = renderToStaticMarkup(
      <AccountDeletionView
        onBack={() => undefined}
        isAuthenticated
        onOpenContactSupport={() => undefined}
        onOpenNotificationSettings={() => undefined}
      />,
    );
    expect(authDeletionHtml).toContain('overflow-x-hidden');
    expect(authDeletionHtml).toContain('Delete account');

    const searchHtml = renderToStaticMarkup(
      <SearchView
        products={[sampleProduct]}
        isCatalogLoading={false}
        catalogError={null}
        onRetryCatalog={() => undefined}
        searchQuery=""
        setSearchQuery={() => undefined}
        onSelectProduct={() => undefined}
        onQuickAddToCart={() => undefined}
        isQuickAddInCart={() => false}
        onOpenCart={() => undefined}
        wishlist={[]}
        onToggleWishlist={() => undefined}
        onBackToHome={() => undefined}
      />,
    );
    expect(searchHtml).toContain('overflow-x-hidden');
    expect(searchHtml).toContain('text-base');

    const accountHtml = renderToStaticMarkup(
      <AccountView
        currentUser={undefined}
        onOpenWishlist={() => undefined}
      />,
    );
    expect(accountHtml).toContain('overflow-x-hidden');
  });

  it('renders Admin workspace & sub-views without desktop-locked overflow grids', () => {
    const adminHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminPanel />
      </MemoryRouter>,
    );
    expect(adminHtml).toContain('w-full max-w-full overflow-x-hidden');
    expect(adminHtml).toContain('max-w-[85vw]');
    expect(adminHtml).toContain('grid-cols-1');

    const productMgrHtml = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/admin/products']}>
        <AdminProductManager initialProducts={[sampleProduct]} notify={() => undefined} />
      </MemoryRouter>,
    );
    expect(productMgrHtml).toContain('max-w-full overflow-x-hidden');
    expect(productMgrHtml).toContain('grid-cols-1 gap-3 sm:grid-cols-3');
    expect(productMgrHtml).toContain('text-base');

    const couponMgrHtml = renderToStaticMarkup(
      <CouponManagement notify={() => undefined} />,
    );
    expect(couponMgrHtml).toContain('overflow-x-hidden');

    const bannersHtml = renderToStaticMarkup(<BannersView notify={() => undefined} />);
    expect(bannersHtml).toContain('overflow-x-hidden');
    expect(bannersHtml).toContain('min-h-11');

    const notificationsHtml = renderToStaticMarkup(
      <NotificationsView
        notifications={[]}
        customers={[]}
        onRead={() => undefined}
        onReadAll={() => undefined}
        onCampaignDeleted={() => undefined}
        notify={() => undefined}
      />,
    );
    expect(notificationsHtml).toContain('grid-cols-1');

    const reportsHtml = renderToStaticMarkup(
      <ReportsView metrics={null} orders={[]} onExport={() => undefined} onNavigate={() => undefined} />,
    );
    expect(reportsHtml).toContain('grid-cols-1');
  });

  it('renders AccountView profile cleanly without role/ready text and displays bike photo with full vehicle fitment name', () => {
    const html = renderToStaticMarkup(
      <AccountView
        currentUser={{
          id: 'user-admin',
          name: 'ASIK',
          email: 'ayatulsekh3037@gmail.com',
          phone: '+919434851618',
          vehicle: 'Bike · BSA · BSA Scrambler 650',
          avatar: '/images/avatar-sample.webp',
          isGuest: false,
        }}
        isAdmin
        onOpenWishlist={() => undefined}
        onOpenShop={() => undefined}
      />,
    );

    expect(html).not.toContain('Workshop Admin');
    expect(html).not.toContain('Verified Rider');
    expect(html).not.toContain('>Ready<');
    expect(html).toContain('ASIK');
    expect(html).toContain('ayatulsekh3037@gmail.com');
    expect(html).toContain('My Fitment Garage');
    expect(html).toContain('Bike · BSA · BSA Scrambler 650');
    expect(html).toContain('/vehicle-models/bsa-scrambler-650.webp');
    expect(html).toContain('Browse seats');
  });
});
