import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSwrCache,
  invalidateSwrCache,
  invalidateSwrCachePrefix,
  isImageLoaded,
  markImageLoaded,
  readSwrCache,
  writeSwrCache,
} from '../src/lib/swrCache';
import { AccountDeletionView } from '../src/components/AccountDeletionView';
import { AdminReviewsView } from '../src/components/AdminReviewsView';
import { SupportCenter } from '../src/components/SupportCenter';
import type { ProductReviewRecord } from '../src/lib/supabaseReviews';
import type { SupportRequestRecord } from '../src/lib/supabaseSupport';

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
};

describe('SWR cache utility and warm-cache screen hydration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T10:00:00Z'));
    clearSwrCache();
  });

  afterEach(() => {
    clearSwrCache();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('stores, reads, expires, and invalidates entries by key or prefix', () => {
    writeSwrCache('user:123:orders', [{ id: 'ord-1' }]);
    writeSwrCache('user:123:reviews', [{ id: 'rev-1' }]);
    writeSwrCache('public:customer-coupons', [{ id: 'cpn-1' }]);

    expect(readSwrCache('user:123:orders')).toEqual([{ id: 'ord-1' }]);

    vi.advanceTimersByTime(5_000);
    expect(readSwrCache('user:123:orders', 10_000)).toEqual([{ id: 'ord-1' }]);
    expect(readSwrCache('user:123:orders', 1_000)).toBeUndefined();

    invalidateSwrCache('public:customer-coupons');
    expect(readSwrCache('public:customer-coupons')).toBeUndefined();

    invalidateSwrCachePrefix('user:123:');
    expect(readSwrCache('user:123:orders')).toBeUndefined();
    expect(readSwrCache('user:123:reviews')).toBeUndefined();
  });

  it('hydrates from sessionStorage when available and clears everything on sign-out reset', () => {
    const storage = createMemoryStorage();
    vi.stubGlobal('window', { sessionStorage: storage });

    writeSwrCache('admin:reviews', [{ id: 'rev-1' }]);
    expect(storage.length).toBe(1);

    // Simulate reload where in-memory map was cleared before window.sessionStorage
    storage.setItem(
      'rofik-godi:swr:v1:user:abc:profile',
      JSON.stringify({ data: { full_name: 'Ayan' }, savedAt: Date.now() }),
    );
    expect(readSwrCache<{ full_name: string }>('user:abc:profile')).toEqual({ full_name: 'Ayan' });

    markImageLoaded('https://cdn.example.com/avatar.webp');
    expect(isImageLoaded('https://cdn.example.com/avatar.webp')).toBe(true);
    expect(isImageLoaded('')).toBe(false);

    clearSwrCache();
    expect(readSwrCache('admin:reviews')).toBeUndefined();
    expect(readSwrCache('user:abc:profile')).toBeUndefined();
    expect(isImageLoaded('https://cdn.example.com/avatar.webp')).toBe(false);
    expect(storage.length).toBe(0);
  });

  it('renders AccountDeletionView without loading skeleton when deletion status is cached', () => {
    const coldHtml = renderToStaticMarkup(
      <AccountDeletionView isAuthenticated={true} onBack={vi.fn()} />,
    );
    expect(coldHtml).toContain('skeleton-shimmer');
    expect(coldHtml).not.toContain('Why are you leaving?');

    writeSwrCache('user:account-deletion', { request: null });
    const warmHtml = renderToStaticMarkup(
      <AccountDeletionView isAuthenticated={true} onBack={vi.fn()} />,
    );
    expect(warmHtml).not.toContain('skeleton-shimmer');
    expect(warmHtml).toContain('Why are you leaving?');

    clearSwrCache();
    const afterLogoutHtml = renderToStaticMarkup(
      <AccountDeletionView isAuthenticated={true} onBack={vi.fn()} />,
    );
    expect(afterLogoutHtml).toContain('skeleton-shimmer');
  });

  it('renders AdminReviewsView immediately from warm cache without showing loading state', () => {
    const coldHtml = renderToStaticMarkup(
      <AdminReviewsView notify={vi.fn()} query="" />,
    );
    expect(coldHtml).toContain('Loading reviews…');
    expect(coldHtml).toContain('skeleton-shimmer');

    const cachedReviews: ProductReviewRecord[] = [
      {
        id: 'rev-cached-1',
        product_id: 'prod-1',
        product_name: 'Royal Classic Seat Cover',
        customer_id: 'cust-1',
        order_id: 'ord-1',
        author_name: 'Sohail',
        rating: 5,
        review_text: 'Super comfortable finish.',
        is_verified_purchase: true,
        is_published: true,
        created_at: '2026-11-10T10:00:00Z',
        updated_at: '2026-11-10T10:00:00Z',
      },
    ];
    writeSwrCache('admin:reviews', cachedReviews);

    const warmHtml = renderToStaticMarkup(
      <AdminReviewsView notify={vi.fn()} query="" />,
    );
    expect(warmHtml).not.toContain('Loading reviews…');
    expect(warmHtml).toContain('Royal Classic Seat Cover');
    expect(warmHtml).toContain('Super comfortable finish.');
  });

  it('renders SupportCenter tickets immediately on warm cache instead of re-showing skeleton', () => {
    const coldHtml = renderToStaticMarkup(
      <SupportCenter
        currentUserId="cust-cache-1"
        isAuthenticated={true}
        onBack={vi.fn()}
        onSelectRequest={vi.fn()}
      />,
    );
    expect(coldHtml).toContain('Loading requests…');
    expect(coldHtml).toContain('support-ticket-list-skeleton');

    const cachedTicket: SupportRequestRecord = {
      id: 'req-cache-1',
      user_id: 'cust-cache-1',
      category: 'Order issue',
      subject: 'Stitching check before pickup',
      message: 'Please confirm pickup window',
      status: 'open',
      created_at: '2026-11-18T08:00:00Z',
      updated_at: '2026-11-18T09:00:00Z',
      last_message_at: '2026-11-18T09:00:00Z',
      related_order_id: null,
      order_number: 'ORD-707',
      attachment_count: 0,
    };
    writeSwrCache('user:cust-cache-1:support-requests', {
      data: [cachedTicket],
      hasMore: false,
      cursor: null,
    });

    const warmHtml = renderToStaticMarkup(
      <SupportCenter
        currentUserId="cust-cache-1"
        isAuthenticated={true}
        onBack={vi.fn()}
        onSelectRequest={vi.fn()}
      />,
    );
    expect(warmHtml).not.toContain('Loading requests…');
    expect(warmHtml).not.toContain('support-ticket-list-skeleton');
    expect(warmHtml).toContain('Stitching check before pickup');
  });
});
