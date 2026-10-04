import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminPanel } from '../src/components/AdminPanel';

describe('admin workspace', () => {
  it('renders the requested admin navigation and dashboard panels', () => {
    const html = renderToStaticMarkup(<AdminPanel />);
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
});
