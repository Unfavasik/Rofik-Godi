import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: { auth: { getUser: vi.fn() }, rpc: vi.fn() },
}));
vi.mock('../src/lib/supabase', () => ({ supabase: supabaseMock }));

import { CustomerSupportRequestForm } from '../src/components/CustomerSupportRequestForm';
import { createCustomerSupportRequest } from '../src/lib/supabaseCustomer';

describe('customer support request', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'customer-1' } },
      error: null,
    });
  });

  it('submits the normalized request without trusting a client-provided identity', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'ticket-1', error: null });
    const result = await createCustomerSupportRequest({
      category: 'Order issue',
      subject: '  Where is my order? ',
      message: '  Please check the latest delivery update.  ',
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith('create_customer_support_request', {
      p_category: 'Order issue',
      p_subject: 'Where is my order?',
      p_message: 'Please check the latest delivery update.',
    });
    expect(result).toEqual({ id: 'ticket-1', error: null });
  });

  it('requires an authenticated customer before calling the ticket RPC', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await createCustomerSupportRequest({
      category: 'Other',
      subject: 'Need help',
      message: 'Please contact me about this issue.',
    });

    expect(result.id).toBeNull();
    expect(result.error?.message).toMatch(/sign in/i);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('surfaces database errors so the customer can retry', async () => {
    const error = new Error('Support request failed');
    supabaseMock.rpc.mockResolvedValue({ data: null, error });
    const result = await createCustomerSupportRequest({
      category: 'Payment',
      subject: 'Payment question',
      message: 'I need help with this payment.',
    });
    expect(result).toEqual({ id: null, error });
  });

  it('asks guests to sign in and keeps direct contact alternatives available', () => {
    const html = renderToStaticMarkup(
      <CustomerSupportRequestForm isAuthenticated={false} onOpenLogin={() => undefined} />,
    );
    expect(html).toContain('Sign in to continue');
    expect(html).toContain('link your message to your account and orders');
    expect(html).not.toContain('Submit request');
  });

  it('discloses privacy and content limits to authenticated customers', () => {
    const html = renderToStaticMarkup(
      <CustomerSupportRequestForm isAuthenticated onOpenLogin={() => undefined} />,
    );
    expect(html).toContain('Please do not include card details');
    expect(html).toContain('aria-label="Support category"');
    expect(html).toContain('aria-label="Support message"');
  });
});
