import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRouteSeoMeta, SITE_CANONICAL_ORIGIN } from './seoMetadata';

test('resolveRouteSeoMeta returns indexable branded metadata for public storefront pages', () => {
  const home = resolveRouteSeoMeta('/home');
  assert.equal(home.canonicalUrl, `${SITE_CANONICAL_ORIGIN}/`);
  assert.match(home.robots, /^index, follow/);
  assert.ok(home.title.includes('Rofik Godi Centre'));
  assert.ok(home.description.length >= 100 && home.description.length <= 165);

  const about = resolveRouteSeoMeta('/settings/about');
  assert.equal(about.canonicalUrl, `${SITE_CANONICAL_ORIGIN}/settings/about`);
  assert.match(about.robots, /^index, follow/);
  assert.ok(about.title.includes('About Us'));

  const store = resolveRouteSeoMeta('/store-map');
  assert.equal(store.canonicalUrl, `${SITE_CANONICAL_ORIGIN}/store-map`);
  assert.ok(store.description.includes('Berhampore'));
});

test('resolveRouteSeoMeta formats product detail routes with INR pricing and og:type product', () => {
  const productMeta = resolveRouteSeoMeta('/shop/products/rg-prod-01', {
    product: {
      id: 'rg-prod-01',
      title: 'Premium Bike Seat Cover',
      subtitle: 'Soft, durable and comfortable',
      description: 'Heavy duty weather-resistant quilted diamond stitched seat cover.',
      price: 499,
      image: 'https://example.com/seat.webp',
      categoryLabel: 'Bike Covers',
    },
  });

  assert.equal(productMeta.ogType, 'product');
  assert.equal(productMeta.canonicalUrl, `${SITE_CANONICAL_ORIGIN}/shop/products/rg-prod-01`);
  assert.ok(productMeta.title.includes('Premium Bike Seat Cover'));
  assert.ok(productMeta.title.includes('₹499'));
  assert.equal(productMeta.ogImage, 'https://example.com/seat.webp');
  assert.match(productMeta.robots, /^index, follow/);
});

test('resolveRouteSeoMeta marks private, admin, checkout, and account routes as noindex', () => {
  for (const path of ['/admin', '/admin/orders', '/checkout', '/cart', '/my-orders', '/profile', '/settings/delete-account']) {
    const meta = resolveRouteSeoMeta(path);
    assert.equal(meta.robots, 'noindex, nofollow', `Expected noindex for ${path}`);
  }
});
