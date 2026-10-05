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
import { sendAdminNotification } from '../src/lib/supabaseAdmin';
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
