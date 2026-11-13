import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase', () => ({ supabase: null }));

const mockWriteCustomerNotificationCache = vi.fn();
const mockReadCustomerNotificationCache = vi.fn();

vi.mock('../src/lib/localCache', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/localCache')>('../src/lib/localCache');
  return {
    ...actual,
    readCustomerNotificationCache: (...args: Parameters<typeof actual.readCustomerNotificationCache>) =>
      mockReadCustomerNotificationCache(...args),
    writeCustomerNotificationCache: (...args: Parameters<typeof actual.writeCustomerNotificationCache>) =>
      mockWriteCustomerNotificationCache(...args),
  };
});

import { NotificationsView } from '../src/components/NotificationsView';
import { NotificationsView as AdminNotificationsView } from '../src/components/AdminSections';
import { SupportNotificationDetails } from '../src/components/SupportNotificationDetails';
import { NewProductNotificationDetails } from '../src/components/NewProductNotificationDetails';
import { PRODUCTS } from '../src/data/products';

describe('Notifications center & detail screen redesign', () => {
  it('shows shimmer skeleton loader while notifications load with empty cache', () => {
    mockReadCustomerNotificationCache.mockReturnValue([]);
    const html = renderToStaticMarkup(
      <NotificationsView userId="user-empty" isGuest={false} onBack={() => undefined} />,
    );

    expect(html).toContain('data-testid="notifications-skeleton"');
    expect(html).toContain('skeleton-shimmer');
    expect(html).toContain('bg-[#F8FAFC]');
  });

  it('renders Mark all read, top category filter tabs, Unread only toggle, Today/Earlier groups, and quick delete button', () => {
    const nowIso = new Date().toISOString();
    const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    mockReadCustomerNotificationCache.mockReturnValue([
      {
        id: 'notif-today-unread',
        kind: 'order',
        title: 'Order #RGC-2026 is ready for pickup',
        body: 'Visit our Berhampore store anytime today.',
        action_url: '/orders',
        image_url: null,
        read_at: null,
        created_at: nowIso,
        expires_at: null,
      },
      {
        id: 'notif-earlier-read',
        kind: 'promotion',
        title: 'Weekend festival offer live',
        body: 'Use code RGC20 for 10% off custom seat covers.',
        action_url: '/shop',
        image_url: null,
        read_at: threeDaysAgoIso,
        created_at: threeDaysAgoIso,
        expires_at: null,
      },
    ]);

    const html = renderToStaticMarkup(
      <NotificationsView userId="user-active" isGuest={false} onBack={() => undefined} />,
    );

    expect(html).toContain('bg-[#F8FAFC]');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Mark all read');
    expect(html).toContain('1 unread');
    expect(html).toContain('Unread only');
    expect(html).toContain('>Today<');
    expect(html).toContain('>Earlier<');
    expect(html).toContain('bg-rose-50');
    expect(html).toContain('bg-white');
    expect(html).toContain('Quick delete notification: Order #RGC-2026 is ready for pickup');
    expect(html).toContain('Delete notification: Order #RGC-2026 is ready for pickup');
  });

  it('renders a category filter toggle at the top of Admin NotificationsView', () => {
    const html = renderToStaticMarkup(
      <AdminNotificationsView
        notifications={[
          {
            id: 'admin-notif-1',
            campaign_id: null,
            kind: 'support',
            title: 'New customer support request',
            body: 'Rider asked about bike seat stitching.',
            action_url: '/support/req-1',
            image_url: null,
            read_at: null,
            created_at: new Date().toISOString(),
          },
          {
            id: 'admin-notif-2',
            campaign_id: null,
            kind: 'order',
            title: 'New order #RGC-501',
            body: 'Customer placed a pickup order.',
            action_url: '/admin/orders',
            image_url: null,
            read_at: null,
            created_at: new Date().toISOString(),
          },
        ]}
        customers={[]}
        onRead={() => undefined}
        onReadAll={() => undefined}
        onCampaignDeleted={() => undefined}
        notify={() => undefined}
      />,
    );

    expect(html).toContain('Filter notifications by category');
    expect(html).toContain('>All<');
    expect(html).toContain('>Orders<');
    expect(html).toContain('>Promotions<');
    expect(html).toContain('>Support<');
    expect(html).toContain('>System<');
  });

  it('renders Notification Settings on light slate canvas with Save Preferences sheen CTA', () => {
    mockReadCustomerNotificationCache.mockReturnValue([]);
    const html = renderToStaticMarkup(
      <NotificationsView
        userId="user-settings"
        isGuest={false}
        settingsRouteOpen
        onBack={() => undefined}
      />,
    );

    expect(html).toContain('Notification Settings');
    expect(html).toContain('bg-[#F8FAFC]');
    expect(html).toContain('Save Preferences');
    expect(html).toContain('banner-cta-shine');
  });

  it('renders SupportNotificationDetails and NewProductNotificationDetails with cohesive light slate cards', () => {
    const supportHtml = renderToStaticMarkup(
      <SupportNotificationDetails
        requestId="req-123"
        userId="user-1"
        isAuthenticated={false}
        notificationBody="Your custom stitched cover is ready."
        notificationCreatedAt={new Date().toISOString()}
        isUnread
        onBack={() => undefined}
        onViewConversation={() => undefined}
        onContactSupport={() => undefined}
      />,
    );

    const productHtml = renderToStaticMarkup(
      <NewProductNotificationDetails
        product={{
          ...PRODUCTS[0],
          id: 'prod-new',
          slug: 'royal-seat-new',
          title: 'Royal Ribbed Bike Seat Cover',
          category: 'bike',
          categoryLabel: 'Bike Seat Cover',
          price: 799,
          originalPrice: 999,
          inStock: true,
          image: '/images/sample.webp',
          compatibility: ['BSA Scrambler 650', 'Royal Enfield Classic 350'],
          features: ['Waterproof finish', 'Reinforced seams'],
        }}
        createdAt={new Date().toISOString()}
        onBack={() => undefined}
        onViewProduct={() => undefined}
      />,
    );

    expect(supportHtml).toContain('bg-[#F8FAFC]');
    expect(supportHtml).toContain('View Conversation');
    expect(supportHtml).toContain('banner-cta-shine');

    expect(productHtml).toContain('bg-[#F8FAFC]');
    expect(productHtml).toContain('Bike Seat Cover');
    expect(productHtml).toContain('In Stock');
    expect(productHtml).toContain('View product');
    expect(productHtml).toContain('banner-cta-shine');
  });
});
