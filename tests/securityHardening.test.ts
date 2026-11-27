import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { getAuthCallbackUrl } from '../src/lib/oauthRedirect';
import { readCustomerNotificationCache, writeCustomerNotificationCache } from '../src/lib/localCache';
import { readLocalPriceDropAlerts } from '../src/lib/priceDropAlerts';
import {
  getSupportRequest,
  listMySupportRequests,
  listSupportMessages,
  sendSupportMessage,
} from '../src/lib/supabaseSupport';

const repoRoot = path.resolve(__dirname, '..');

const memoryStore = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
  clear: () => {
    memoryStore.clear();
  },
};

describe('frontend security hardening', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    memoryStore.clear();
    vi.stubGlobal('localStorage', localStorageStub);
    vi.stubGlobal('window', {
      location: { origin: 'https://rofikgodicenter.pages.dev' },
      dispatchEvent: vi.fn(),
    });
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'customer-1' } },
      error: null,
    });
  });

  it('blocks PostgREST filter injection in support request & message cursors before calling .or()', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      or: vi.fn(),
      limit: vi.fn(async () => ({ data: [], error: null })),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.or.mockReturnValue(query);
    supabaseMock.from.mockReturnValue(query);

    const reqRes = await listMySupportRequests('customer-1', {
      lastMessageAt: '2026-11-26T10:00:00Z),id.neq.00000000-0000-0000-0000-000000000000',
      id: 'ticket-1',
    });
    expect(reqRes.error?.message).toMatch(/invalid/i);
    expect(query.or).not.toHaveBeenCalled();

    const msgRes = await listSupportMessages('ticket-1', 'customer-1', {
      createdAt: '2026-11-26T10:00:00Z',
      id: 'bad,is_admin.eq.true',
    });
    expect(msgRes.error?.message).toMatch(/invalid/i);
    expect(query.or).not.toHaveBeenCalled();
  });

  it('rejects malformed support request IDs before calling Supabase queries or RPCs', async () => {
    const getRes = await getSupportRequest('ticket-1,user_id.neq.customer-1', 'customer-1');
    expect(getRes.error?.message).toMatch(/invalid/i);
    expect(supabaseMock.from).not.toHaveBeenCalled();

    const sendRes = await sendSupportMessage({
      requestId: '../admin',
      message: 'test',
      expectedUserId: 'customer-1',
    });
    expect(sendRes.error?.message).toMatch(/invalid/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('sanitizes notification cache URLs and strips prototype pollution keys from local storage', () => {
    writeCustomerNotificationCache('customer-1', [
      {
        id: 'n1',
        kind: 'promo',
        title: 'Sale',
        body: 'Check this out',
        action_url: 'javascript:alert(1)',
        image_url: '//evil.example/img.png',
        read_at: null,
        created_at: '2026-11-26T10:00:00Z',
      },
    ]);

    const cached = readCustomerNotificationCache('customer-1');
    expect(cached).toHaveLength(1);
    expect(cached[0].action_url).toBeNull();
    expect(cached[0].image_url).toBeNull();

    localStorage.setItem(
      'rofik-godi:user:customer-1:price-drop-alerts:v1',
      '[{"id":"a1","productId":"p1","productTitle":"Seat","productImage":"javascript:alert(1)","thresholdPrice":500,"initialPrice":700,"createdAt":"2026-11-26T10:00:00Z","updatedAt":"2026-11-26T10:00:00Z","triggeredAt":null,"__proto__":{"polluted":true}}]',
    );
    const alerts = readLocalPriceDropAlerts('customer-1');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].productImage).toBeNull();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('falls back safely when configured OAuth redirect URL uses an unsafe scheme', () => {
    vi.stubEnv('NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL', 'javascript:alert(document.domain)');
    try {
      expect(getAuthCallbackUrl()).toBe(`${window.location.origin}/auth/callback`);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('backend & configuration security controls', () => {
  it('enforces distributed SQL rate limiting and column-immutable RLS triggers in migration', () => {
    const migration = fs
      .readFileSync(
        path.join(repoRoot, 'supabase/migrations/20261126140000_security_hardening_and_rate_limits.sql'),
        'utf8',
      )
      .toLowerCase();
    expect(migration).toContain('create table if not exists public.api_rate_limits');
    expect(migration).toContain('revoke all on table public.api_rate_limits from public, anon, authenticated');
    expect(migration).toContain('create or replace function public.require_rate_limit');
    expect(migration).toContain("errcode = 'p0429'");
    expect(migration).toContain('create or replace function public.enforce_edge_rate_limit');
    expect(migration).toContain('notifications_guard_customer_update');
    expect(migration).toContain("(to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at')");
    expect(migration).toContain('price_drop_alerts_guard_write');
    expect(migration).toContain('validate_coupon');
    expect(migration).toContain('create_store_pickup_order_v3');
    expect(migration).toContain('create_customer_support_request');
  });

  it('hardens all Supabase Edge Functions against wildcard CORS, unbounded payloads, and missing rate limits', () => {
    const edgeDirs = [
      'create-razorpay-order',
      'verify-razorpay-payment',
      'razorpay-webhook',
      'autofill-product-details',
      'send-order-confirmation',
      'send-account-deletion-email',
      'send-admin-push',
      'push-notification',
    ];

    for (const dir of edgeDirs) {
      const source = fs.readFileSync(path.join(repoRoot, 'supabase/functions', dir, 'index.ts'), 'utf8');
      expect(source, `${dir} must not use wildcard CORS`).not.toContain("'Access-Control-Allow-Origin': '*'");
      expect(source, `${dir} must not use wildcard CORS`).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(source, `${dir} must bound request body size`).toMatch(/readBounded(?:Json|Bytes)/);
    }

    for (const rateLimitedDir of [
      'create-razorpay-order',
      'verify-razorpay-payment',
      'razorpay-webhook',
      'autofill-product-details',
      'send-order-confirmation',
      'send-account-deletion-email',
    ]) {
      const source = fs.readFileSync(path.join(repoRoot, 'supabase/functions', rateLimitedDir, 'index.ts'), 'utf8');
      expect(source, `${rateLimitedDir} must enforce distributed rate limiting`).toContain('enforce_edge_rate_limit');
    }

    const autofill = fs.readFileSync(path.join(repoRoot, 'supabase/functions/autofill-product-details/index.ts'), 'utf8');
    expect(autofill).toContain("redirect: 'error'");
  });

  it('includes strict CSP and HTTP security headers and avoids unsafe DOM sinks or Math.random IDs', () => {
    const headers = fs.readFileSync(path.join(repoRoot, 'public/_headers'), 'utf8');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('Content-Security-Policy:');
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain("object-src 'none'");

    const storeMap = fs.readFileSync(path.join(repoRoot, 'src/components/StoreLocationView.tsx'), 'utf8');
    expect(storeMap).not.toContain('iconEl.innerHTML');

    const adminCustomer = fs.readFileSync(path.join(repoRoot, 'src/components/AdminCustomerProfile.tsx'), 'utf8');
    expect(adminCustomer).not.toContain('Math.random(');
    expect(adminCustomer).toContain('generateSecureToken');
  });
});
