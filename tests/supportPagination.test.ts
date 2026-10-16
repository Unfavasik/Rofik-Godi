import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));
vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { listMySupportRequests, listSupportMessages } from '../src/lib/supabaseSupport';

type QueryBuilder = {
  select: (columns?: string) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: unknown) => QueryBuilder;
  or: (filters: string) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown[]; error: null }>;
};

const createQuery = (data: unknown[]): QueryBuilder => {
  const query = {} as QueryBuilder;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.or = vi.fn(() => query);
  query.limit = vi.fn(async () => ({ data, error: null }));
  return query;
};

describe('support history pagination', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null });
  });

  it('uses the owner-scoped ticket cursor and returns a next cursor', async () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      id: `ticket-${String(100 - index).padStart(3, '0')}`,
      user_id: 'customer-1',
      category: 'Order issue',
      subject: `Issue ${index}`,
      message: 'A sample support issue.',
      status: 'open',
      created_at: `2026-10-16T10:${String(index % 60).padStart(2, '0')}:00Z`,
      updated_at: '2026-10-16T10:00:00Z',
      last_message_at: `2026-10-${String(16 - Math.floor(index / 30)).padStart(2, '0')}T10:${String(59 - (index % 60)).padStart(2, '0')}:00Z`,
      related_order_id: null,
      attachment_count: 0,
    }));
    const query = createQuery(rows);
    supabaseMock.from.mockReturnValue(query);

    const result = await listMySupportRequests('customer-1', {
      lastMessageAt: '2026-10-10T12:00:00Z',
      id: 'cursor-ticket',
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('customer_support_requests');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'customer-1');
    expect(query.or).toHaveBeenCalledWith(
      'last_message_at.lt.2026-10-10T12:00:00Z,and(last_message_at.eq.2026-10-10T12:00:00Z,id.lt.cursor-ticket)',
    );
    expect(query.limit).toHaveBeenCalledWith(51);
    expect(result.data).toHaveLength(50);
    expect(result.hasMore).toBe(true);
    expect(result.cursor).toMatchObject({ id: result.data.at(-1)?.id });
  });

  it('returns the latest 100 messages in chronological display order and an older cursor', async () => {
    const newestFirst = Array.from({ length: 101 }, (_, index) => {
      const minute = 100 - index;
      return {
        id: `message-${String(minute).padStart(3, '0')}`,
        request_id: 'ticket-1',
        sender_user_id: 'customer-1',
        sender_role: minute % 2 ? 'customer' : 'admin',
        message: `Message ${minute}`,
        attachments: [],
        is_initial: minute === 0,
        created_at: `2026-10-16T10:${String(minute).padStart(2, '0')}:00Z`,
      };
    });
    const query = createQuery(newestFirst);
    supabaseMock.from.mockReturnValue(query);

    const result = await listSupportMessages('ticket-1', 'customer-1', {
      createdAt: '2026-10-16T08:00:00Z',
      id: 'older-message',
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('customer_support_messages');
    expect(query.eq).toHaveBeenCalledWith('request_id', 'ticket-1');
    expect(query.or).toHaveBeenCalledWith(
      'created_at.lt.2026-10-16T08:00:00Z,and(created_at.eq.2026-10-16T08:00:00Z,id.lt.older-message)',
    );
    expect(query.limit).toHaveBeenCalledWith(101);
    expect(result.data).toHaveLength(100);
    expect(result.data[0].message).toBe('Message 1');
    expect(result.data.at(-1)?.message).toBe('Message 100');
    expect(result.hasMore).toBe(true);
    expect(result.cursor).toMatchObject({ createdAt: '2026-10-16T10:01:00Z' });
  });

  it('rejects a mismatched signed-in customer before querying support records', async () => {
    const result = await listMySupportRequests('another-customer');

    expect(result.error?.message).toMatch(/sign in/i);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
