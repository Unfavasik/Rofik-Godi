import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { rpc: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() },
}));
vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { AdminActivityView } from '../src/components/AdminActivityView';
import {
  loadAdminActivityEvents,
  loadAdminActivityUnreadCount,
  markAdminActivityRead,
  markAllAdminActivityRead,
  updateAdminSupportRequestStatus,
} from '../src/lib/supabaseAdminActivity';

const eventRow = {
  id: 'event-1',
  event_type: 'order_created',
  entity_type: 'order',
  entity_id: 'order-1',
  actor_user_id: 'customer-1',
  subject_user_id: 'customer-1',
  actor_name: 'Amina Rider',
  actor_email: 'amina@example.test',
  customer_name: 'Amina Rider',
  customer_email: 'amina@example.test',
  customer_phone: '9000000001',
  title: 'New order placed',
  body: 'Order #RGC-123 was placed.',
  details: {
    order_number: 'RGC-123',
    total: 1240,
    items: [{ product_name: 'Seat cover', quantity: 1 }],
  },
  created_at: '2026-10-16T10:00:00Z',
  read_at: null,
};

describe('admin activity feed', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads and normalizes the real feed RPC rows', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [eventRow], error: null });

    const result = await loadAdminActivityEvents(150);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_list_activity_feed', {
      p_limit: 150,
      p_before_created_at: null,
      p_before_id: null,
    });
    expect(result.error).toBeNull();
    expect(result.data[0]).toMatchObject({
      id: 'event-1',
      entity_type: 'order',
      customer_name: 'Amina Rider',
      details: eventRow.details,
    });
  });

  it('passes both keyset cursor values when loading older activity', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [eventRow], error: null });
    const cursor = { createdAt: '2026-10-15T09:00:00Z', id: 'event-cursor' };

    const result = await loadAdminActivityEvents(200, cursor);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_list_activity_feed', {
      p_limit: 200,
      p_before_created_at: cursor.createdAt,
      p_before_id: cursor.id,
    });
    expect(result.error).toBeNull();
  });

  it('loads unread count and records per-admin read state through narrow RPCs', async () => {
    supabaseMock.rpc
      .mockResolvedValueOnce({ data: 5, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: 5, error: null })
      .mockResolvedValueOnce({ data: { id: 'ticket-1', status: 'resolved' }, error: null });

    expect(await loadAdminActivityUnreadCount()).toEqual({ count: 5, error: null });
    expect(await markAdminActivityRead('event-1')).toEqual({ error: null });
    expect(await markAllAdminActivityRead()).toEqual({ count: 5, error: null });
    expect(await updateAdminSupportRequestStatus('ticket-1', 'resolved')).toEqual({ error: null });
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, 'admin_unread_activity_count');
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, 'admin_mark_activity_read', {
      p_event_id: 'event-1',
    });
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(3, 'admin_mark_all_activity_read');
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(4, 'admin_update_customer_support_status', {
      p_request_id: 'ticket-1',
      p_status: 'resolved',
    });
  });

  it('renders a full-page notification inbox with categories and search instead of a compact popup', () => {
    const html = renderToStaticMarkup(
      <AdminActivityView
        onViewOrder={() => undefined}
        onViewReview={() => undefined}
        onViewCustomer={() => undefined}
        onViewProduct={() => undefined}
        onViewCoupon={() => undefined}
        onViewCampaign={() => undefined}
        adminUserId="admin-1"
        notify={() => undefined}
      />,
    );

    expect(html).toContain('All notifications');
    expect(html).toContain('Search activity');
    expect(html).toContain('All activity');
    expect(html).toContain('Support');
    expect(html).toContain('Products');
    expect(html).toContain('Coupons');
    expect(html).toContain('Campaigns');
  });
});
