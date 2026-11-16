import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRODUCTS, WORKSHOP_INFO } from '../src/data/products';
import { CANONICAL_SITE_ORIGIN, resolveSeoPayload } from '../src/lib/seoManager';

const readRootFile = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('Static SEO & AI discovery files', () => {
  it('uses unified canonical URL and official Kadbeltal workshop details across llms.txt, llms-full.txt, robots.txt, sitemap.xml, and index.html', () => {
    const llms = readRootFile('public/llms.txt');
    const llmsFull = readRootFile('public/llms-full.txt');
    const robots = readRootFile('public/robots.txt');
    const sitemap = readRootFile('public/sitemap.xml');
    const indexHtml = readRootFile('index.html');
    const headers = readRootFile('public/_headers');

    for (const content of [llms, llmsFull, robots, sitemap, indexHtml]) {
      expect(content).toContain(CANONICAL_SITE_ORIGIN);
      expect(content).not.toContain('work-app-dun.vercel.app');
      expect(content).not.toContain('742102');
      expect(content).not.toContain('98321 45678');
    }

    for (const content of [llms, llmsFull, indexHtml]) {
      expect(content).toContain('Kadbeltal, Petrol Pump More');
      expect(content).toContain('742101');
      expect(content).toContain('+91 94348 86786');
      expect(content).toContain(WORKSHOP_INFO.email);
    }

    expect(llms).toContain('llms-full.txt');
    expect(indexHtml).toContain('rel="alternate" type="text/plain" title="LLMs.txt" href="/llms.txt"');
    expect(indexHtml).toContain('"@type": ["AutoPartsStore", "LocalBusiness"]');
    expect(indexHtml).toContain('"@type": "FAQPage"');
    expect(headers).toContain('/llms.txt');
    expect(headers).toContain('/llms-full.txt');
    expect(headers).toContain('/robots.txt');
    expect(headers).toContain('/sitemap.xml');
  });

  it('includes all bundled products and vehicle brands in llms-full.txt and sitemap.xml', () => {
    const llmsFull = readRootFile('public/llms-full.txt');
    const sitemap = readRootFile('public/sitemap.xml');

    for (const product of PRODUCTS) {
      expect(llmsFull).toContain(product.title);
      expect(llmsFull).toContain(product.id);
      expect(sitemap).toContain(`${CANONICAL_SITE_ORIGIN}/shop/products/${product.id}`);
    }

    expect(llmsFull).toContain('Hero');
    expect(llmsFull).toContain('Royal Enfield');
    expect(llmsFull).toContain('Yatri E-Rickshaw');
    expect(llmsFull).toContain('Product Inspection');
    expect(llmsFull).toContain('Final Inspection');
  });

  it('allows search and AI crawlers on public paths and disallows private paths in robots.txt', () => {
    const robots = readRootFile('public/robots.txt');

    for (const bot of [
      'Googlebot',
      'Bingbot',
      'OAI-SearchBot',
      'GPTBot',
      'ChatGPT-User',
      'ClaudeBot',
      'PerplexityBot',
      'Google-Extended',
      'Applebot-Extended',
    ]) {
      expect(robots).toContain(`User-agent: ${bot}`);
    }

    expect(robots).toContain('Allow: /llms.txt');
    expect(robots).toContain('Allow: /llms-full.txt');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Disallow: /checkout');
    expect(robots).toContain('Disallow: /cart');
    expect(robots).toContain('Disallow: /my-orders');
    expect(robots).toContain('Disallow: /auth/');
    expect(robots).toContain(`Sitemap: ${CANONICAL_SITE_ORIGIN}/sitemap.xml`);
  });
});

describe('resolveSeoPayload dynamic SPA metadata', () => {
  it('generates Product Schema.org JSON-LD and canonical URL for product routes', () => {
    const product = PRODUCTS[0];
    const seo = resolveSeoPayload({
      pathname: `/shop/products/${product.id}`,
      selectedProduct: product,
      catalogProducts: PRODUCTS,
    });

    expect(seo.robots).toBe('index, follow, max-image-preview:large');
    expect(seo.ogType).toBe('product');
    expect(seo.canonicalUrl).toBe(`${CANONICAL_SITE_ORIGIN}/shop/products/${product.id}`);
    expect(seo.title).toContain(product.title);
    expect(seo.jsonLd).not.toBeNull();
    const graph = (seo.jsonLd as { '@graph': Array<Record<string, unknown>> })['@graph'];
    const productNode = graph.find((node) => node['@type'] === 'Product');
    expect(productNode).toBeDefined();
    expect(productNode?.name).toBe(product.title);
    expect((productNode?.offers as Record<string, unknown>)?.price).toBe(String(product.price));
  });

  it('sets noindex, nofollow and omits JSON-LD on private, checkout, and admin routes', () => {
    for (const privatePath of ['/admin', '/admin/orders', '/checkout', '/cart', '/my-orders', '/profile', '/auth/callback']) {
      const seo = resolveSeoPayload({ pathname: privatePath, catalogProducts: PRODUCTS });
      expect(seo.robots).toBe('noindex, nofollow');
      expect(seo.jsonLd).toBeNull();
    }
  });

  it('resolves unique titles and canonical URLs for public workshop pages', () => {
    const shopSeo = resolveSeoPayload({ pathname: '/shop', catalogProducts: PRODUCTS });
    const customSeo = resolveSeoPayload({ pathname: '/custom', catalogProducts: PRODUCTS });
    const storeSeo = resolveSeoPayload({ pathname: '/store-map', catalogProducts: PRODUCTS });
    const termsSeo = resolveSeoPayload({ pathname: '/terms-and-conditions', catalogProducts: PRODUCTS });

    expect(shopSeo.canonicalUrl).toBe(`${CANONICAL_SITE_ORIGIN}/shop`);
    expect(customSeo.canonicalUrl).toBe(`${CANONICAL_SITE_ORIGIN}/custom`);
    expect(storeSeo.canonicalUrl).toBe(`${CANONICAL_SITE_ORIGIN}/store-map`);
    expect(termsSeo.canonicalUrl).toBe(`${CANONICAL_SITE_ORIGIN}/terms-and-conditions`);
    expect(new Set([shopSeo.title, customSeo.title, storeSeo.title, termsSeo.title]).size).toBe(4);
  });
});
