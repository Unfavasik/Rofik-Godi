import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryState = vi.hoisted(() => ({
  gtCalled: false,
  selectArg: '',
  eqCalls: [] as Array<[string, unknown]>,
  orderCalls: [] as Array<[string, { ascending: boolean }]>,
  limitArg: null as number | null,
  rows: [] as Array<Record<string, unknown>>,
  authUserId: 'user-123' as string | null,
}));

vi.mock('../src/lib/supabase', () => {
  const createChain = () => {
    const chain = {
      select: (columns: string) => {
        queryState.selectArg = columns;
        return chain;
      },
      eq: (column: string, value: unknown) => {
        queryState.eqCalls.push([column, value]);
        return chain;
      },
      gt: () => {
        queryState.gtCalled = true;
        return chain;
      },
      order: (column: string, options: { ascending: boolean }) => {
        queryState.orderCalls.push([column, options]);
        return chain;
      },
      limit: (count: number) => {
        queryState.limitArg = count;
        return Promise.resolve({ data: queryState.rows, error: null });
      },
    };
    return chain;
  };

  return {
    supabase: {
      auth: {
        getUser: async () => ({
          data: {
            user: queryState.authUserId ? { id: queryState.authUserId } : null,
          },
          error: null,
        }),
      },
      from: () => createChain(),
    },
  };
});

import { listMyNotifications } from '../src/lib/supabaseCustomer';
import {
  CUSTOMER_NOTIFICATIONS_UPDATED_EVENT,
  CUSTOMER_ORDERS_UPDATED_EVENT,
  notifyCustomerNotificationsUpdated,
  notifyCustomerOrdersUpdated,
  readCustomerNotificationCache,
  writeCustomerNotificationCache,
} from '../src/lib/localCache';

describe('Customer order & status notifications pipeline', () => {
  beforeEach(() => {
    queryState.gtCalled = false;
    queryState.selectArg = '';
    queryState.eqCalls = [];
    queryState.orderCalls = [];
    queryState.limitArg = null;
    queryState.authUserId = 'user-123';
    queryState.rows = [];
  });

  it('fetches notifications without client-clock expires_at filtering so skewed device clocks never hide order updates', async () => {
    const pastRelativeToSkewedClient = '2025-01-01T00:00:00.000Z';
    queryState.rows = [
      {
        id: 'notif-order-1',
        kind: 'order',
        title: 'Order confirmed',
        body: 'Order RG-2026-0001 is confirmed for pickup.',
        action_url: '/my-order/order/rg-2026-0001',
        image_url: null,
        read_at: null,
        created_at: '2025-01-01T00:00:00.000Z',
        expires_at: pastRelativeToSkewedClient,
      },
    ];

    const items = await listMyNotifications('user-123');

    expect(queryState.gtCalled).toBe(false);
    expect(queryState.eqCalls).toEqual([['user_id', 'user-123']]);
    expect(queryState.orderCalls).toEqual([['created_at', { ascending: false }]]);
    expect(queryState.limitArg).toBe(50);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Order confirmed');
  });

  it('preserves cached notifications even if expires_at appears behind a skewed client clock', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    try {
      writeCustomerNotificationCache('user-clock-skew', [
        {
          id: 'notif-1',
          kind: 'order',
          title: 'Order placed',
          body: 'We received pickup order RG-100.',
          action_url: '/my-order/order/rg-100',
          image_url: null,
          read_at: null,
          created_at: '2024-06-01T10:00:00.000Z',
          expires_at: '2024-06-08T10:00:00.000Z',
        },
      ]);

      const cached = readCustomerNotificationCache('user-clock-skew');
      expect(cached).toHaveLength(1);
      expect(cached[0].id).toBe('notif-1');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('dispatches live update events for both notifications and customer orders', () => {
    const dispatched: Array<{ type: string; detail: unknown }> = [];
    const fakeWindow = {
      dispatchEvent: (event: Event) => {
        dispatched.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        });
        return true;
      },
    };
    vi.stubGlobal('window', fakeWindow);

    try {
      notifyCustomerNotificationsUpdated('user-42');
      notifyCustomerOrdersUpdated('user-42');

      expect(dispatched).toEqual([
        { type: CUSTOMER_NOTIFICATIONS_UPDATED_EVENT, detail: { userId: 'user-42' } },
        { type: CUSTOMER_ORDERS_UPDATED_EVENT, detail: { userId: 'user-42' } },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
