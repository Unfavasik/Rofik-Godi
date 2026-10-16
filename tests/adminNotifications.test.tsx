import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
  },
}));

vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { NotificationAudiencePicker } from '../src/components/NotificationAudiencePicker';
import {
  addAdminCustomerNoteAndNotify,
  deleteAdminNotificationCampaign,
  loadAdminNotificationCampaigns,
  sendAdminNotification,
} from '../src/lib/supabaseAdmin';
import type { AdminCustomer } from '../src/lib/supabaseAdmin';

const payload = {
  title: 'New arrival',
  body: 'A new seat cover is ready.',
  kind: 'product',
  actionUrl: '/shop',
  imageUrl: 'https://cdn.example.test/product.webp',
};

const customers: AdminCustomer[] = [
  { id: 'user-1', name: 'Amina Rider', email: 'amina@example.test', phone: '9000000001', orderCount: 2, totalSpent: 500, lastOrder: null, createdAt: '2026-10-01T00:00:00Z', status: 'Active' },
  { id: 'user-2', name: 'Bikash Das', email: 'bikash@example.test', phone: '9000000002', orderCount: 0, totalSpent: 0, lastOrder: null, createdAt: '2026-10-02T00:00:00Z', status: 'New' },
];

describe('admin customer notifications', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
  });

  it('sends to selected user IDs through the admin-only RPC and reports the recipient count', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 1, error: null });
    const result = await sendAdminNotification({ ...payload, userIds: ['user-1'] });

    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_send_notification', {
      p_title: 'New arrival',
      p_body: 'A new seat cover is ready.',
      p_kind: 'product',
      p_action_url: '/shop',
      p_image_url: 'https://cdn.example.test/product.webp',
      p_user_ids: ['user-1'],
    });
    expect(result).toEqual({ count: 1, error: null });
  });

  it('uses a null recipient list for an all-customer broadcast', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 42, error: null });
    const result = await sendAdminNotification({ ...payload, userIds: null });

    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_send_notification', expect.objectContaining({ p_user_ids: null }));
    expect(result.count).toBe(42);
  });

  it('requires an authenticated account before calling the notification RPC', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await sendAdminNotification({ ...payload, userIds: ['user-1'] });

    expect(result.error?.message).toMatch(/administrator sign-in required/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('atomically saves a note and sends its exact text only to the selected customer', async () => {
    const note = { id: 'note-1', category: 'Delivery', content: 'Please call before delivery.', createdAt: '2026-10-16T10:00:00.000Z', author: 'Admin', customerNotifiedAt: '2026-10-16T10:00:00.000Z' };
    supabaseMock.rpc.mockResolvedValue({ data: note, error: null });

    const result = await addAdminCustomerNoteAndNotify({ customerId: 'user-1', noteId: 'note-1', category: 'Delivery', content: 'Please call before delivery.' });

    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_add_customer_note_and_notify', {
      p_customer_id: 'user-1',
      p_note_id: 'note-1',
      p_category: 'Delivery',
      p_content: 'Please call before delivery.',
    });
    expect(result).toEqual({ data: note, error: null });
  });

  it('does not call the note RPC without an authenticated admin session', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await addAdminCustomerNoteAndNotify({ customerId: 'user-1', noteId: 'note-1', category: 'Delivery', content: 'Please call before delivery.' });

    expect(result.error?.message).toMatch(/administrator sign-in required/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('surfaces note-delivery errors so the draft can be retried', async () => {
    const error = new Error('Notification insert failed');
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    const result = await addAdminCustomerNoteAndNotify({ customerId: 'user-1', noteId: 'note-1', category: 'Delivery', content: 'Please call before delivery.' });

    expect(result.error).toBe(error);
  });

  it('loads grouped campaign history with recipient counts', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [{ campaign_id: 'campaign-1', kind: 'announcement', title: 'Store update', body: 'A message', action_url: '/shop', image_url: null, created_at: '2026-10-05T10:00:00Z', recipient_count: 7 }],
      error: null,
    });

    const result = await loadAdminNotificationCampaigns();

    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_list_notification_campaigns');
    expect(result.data).toEqual([{ campaign_id: 'campaign-1', kind: 'announcement', title: 'Store update', body: 'A message', action_url: '/shop', image_url: null, created_at: '2026-10-05T10:00:00Z', recipient_count: 7 }]);
    expect(result.error).toBeNull();
  });

  it('deletes the selected campaign through the server-side admin RPC', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 7, error: null });

    const result = await deleteAdminNotificationCampaign('campaign-1');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('admin_delete_notification_campaign', { p_campaign_id: 'campaign-1' });
    expect(result).toEqual({ count: 7, error: null });
  });

  it('renders all-user and selected-user audience choices with identifiable accounts', () => {
    const html = renderToStaticMarkup(
      <NotificationAudiencePicker
        customers={customers}
        audience="SELECTED"
        selectedUserIds={['user-1']}
        onAudienceChange={() => undefined}
        onSelectedUserIdsChange={() => undefined}
        allowNone
      />,
    );

    expect(html).toContain('All customers');
    expect(html).toContain('Selected customers');
    expect(html).toContain('Amina Rider');
    expect(html).toContain('bikash@example.test');
    expect(html).toContain('1 selected');
  });
});
