import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AdminPanel } from '../src/components/AdminPanel';

describe('admin workspace', () => {
  it('renders the requested admin navigation and dashboard panels', () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/admin']}><AdminPanel /></MemoryRouter>);
    for (const label of [
      'Dashboard',
      'Orders',
      'Products',
      'Categories',
      'Customers',
      'Reviews',
      'Coupons',
      'Banners',
      'Notifications',
      'Reports',
      'Settings',
    ]) {
      expect(html).toContain(label);
    }
    for (const panel of [
      'Sales overview',
      'Order status',
      'Recent orders',
      'Top products',
      'Quick actions',
    ]) {
      expect(html).toContain(panel);
    }
  });

  it('hydrates the selected admin section from its direct route', () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/admin/products']}><AdminPanel /></MemoryRouter>);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Products</h1>');
  });

  it('opens the customer profile as a route-backed admin page', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/admin/customers/customer-404']}>
        <AdminPanel />
      </MemoryRouter>,
    );
    expect(html).toContain('Customers</h1>');
    expect(html).toContain('Loading customer profile');
    expect(html).not.toContain(' / Profile');
    expect(html).toContain('Back to customers');
    expect(html).not.toContain('fixed inset-0 z-50 flex justify-end bg-slate-950/40');
  });
});
