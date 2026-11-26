import { resolveAppRoute } from './appRoutes';
import type { Product } from '../types';

export const SITE_CANONICAL_ORIGIN = 'https://rofikgodicenter.pages.dev';
export const SITE_BRAND_NAME = 'Rofik Godi Centre';
export const DEFAULT_OG_IMAGE = `${SITE_CANONICAL_ORIGIN}/images/rofik-godi-store.webp`;

export interface RouteSeoMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' | 'noindex, nofollow';
  ogType: 'website' | 'product';
  ogImage: string;
}

function buildCanonicalUrl(path: string, origin: string = SITE_CANONICAL_ORIGIN): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = path === '/' || path === '/home' ? '/' : path.startsWith('/') ? path : `/${path}`;
  return `${cleanOrigin}${cleanPath}`;
}

export function resolveRouteSeoMeta(
  pathname: string,
  options?: {
    product?: Pick<Product, 'id' | 'title' | 'subtitle' | 'description' | 'price' | 'image' | 'categoryLabel'> | null;
    origin?: string;
  },
): RouteSeoMeta {
  const origin = options?.origin || SITE_CANONICAL_ORIGIN;
  const route = resolveAppRoute(pathname);
  const indexRobots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' as const;
  const noIndexRobots = 'noindex, nofollow' as const;

  if (route.kind === 'product') {
    const product = options?.product;
    if (product) {
      const priceText = Number.isFinite(product.price) && product.price > 0 ? ` — ₹${product.price}` : '';
      const rawDesc = product.description || product.subtitle || 'Waterproof custom-fit seat cover with complimentary on-spot workshop fitment at Rofik Godi Centre, Berhampore.';
      const trimmedDesc = rawDesc.length > 152 ? `${rawDesc.slice(0, 149).trimEnd()}...` : rawDesc;
      const ogImage = product.image && /^https?:\/\//i.test(product.image) ? product.image : DEFAULT_OG_IMAGE;
      return {
        title: `${product.title}${priceText} | ${SITE_BRAND_NAME}`,
        description: trimmedDesc,
        canonicalUrl: buildCanonicalUrl(route.canonicalPath, origin),
        robots: indexRobots,
        ogType: 'product',
        ogImage,
      };
    }
    return {
      title: `Seat Cover Details | ${SITE_BRAND_NAME}`,
      description: 'Inspect waterproof seat cover specs, compatible bike, scooter & Toto models, foam options, and free on-spot workshop fitment in Berhampore.',
      canonicalUrl: buildCanonicalUrl(route.canonicalPath, origin),
      robots: indexRobots,
      ogType: 'product',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  if (route.kind === 'tab') {
    switch (route.tab) {
      case 'shop':
        return {
          title: `Shop Bike, Scooter & Toto Seat Covers | ${SITE_BRAND_NAME}`,
          description: 'Browse waterproof bike seat covers, scooter covers, heavy-duty Toto bench covers, and gel cushions with vehicle fitment filtering in Berhampore.',
          canonicalUrl: buildCanonicalUrl('/shop', origin),
          robots: indexRobots,
          ogType: 'website',
          ogImage: DEFAULT_OG_IMAGE,
        };
      case 'custom':
        return {
          title: `Custom Seat Cover Builder | ${SITE_BRAND_NAME}`,
          description: 'Configure your custom bike, scooter, or Toto seat cover—choose colors, stitch patterns, piping, and high-density or gel foam at our Berhampore workshop.',
          canonicalUrl: buildCanonicalUrl('/custom', origin),
          robots: indexRobots,
          ogType: 'website',
          ogImage: DEFAULT_OG_IMAGE,
        };
      case 'search':
        return {
          title: `Search Seat Covers & Vehicle Fitment | ${SITE_BRAND_NAME}`,
          description: 'Search bike, scooter, and Toto seat covers by model name, brand, waterproof finish, or gel cushion comfort at Rofik Godi Centre.',
          canonicalUrl: buildCanonicalUrl('/search', origin),
          robots: indexRobots,
          ogType: 'website',
          ogImage: DEFAULT_OG_IMAGE,
        };
      case 'wishlist':
      case 'cart':
      case 'account':
      case 'notifications':
        return {
          title: `${route.tab.charAt(0).toUpperCase()}${route.tab.slice(1)} | ${SITE_BRAND_NAME}`,
          description: 'Manage your Rofik Godi Centre cart, saved seat covers, store pickup orders, and preferences.',
          canonicalUrl: buildCanonicalUrl(route.canonicalPath, origin),
          robots: noIndexRobots,
          ogType: 'website',
          ogImage: DEFAULT_OG_IMAGE,
        };
      case 'home':
      default:
        return {
          title: 'Rofik Godi Centre | Bike, Scooter & Toto Seat Covers',
          description: 'Shop waterproof bike, scooter & toto seat covers, gel cushions & custom seat fitment at Rofik Godi Centre, Berhampore. Free on-spot fitting since 2007.',
          canonicalUrl: buildCanonicalUrl('/', origin),
          robots: indexRobots,
          ogType: 'website',
          ogImage: DEFAULT_OG_IMAGE,
        };
    }
  }

  if (route.kind === 'store' || route.kind === 'store-navigation') {
    return {
      title: `Visit Workshop & Store Map (Berhampore) | ${SITE_BRAND_NAME}`,
      description: 'Get live directions to Rofik Godi Centre at Kadbeltal, Petrol Pump More, Raninagar, Keshobnagar, Berhampore, West Bengal 742101. Open daily 8 AM – 9:30 PM.',
      canonicalUrl: buildCanonicalUrl('/store-map', origin),
      robots: indexRobots,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  if (route.kind === 'settings-section' && route.section === 'about') {
    return {
      title: `About Us — Craft Since 2007 | ${SITE_BRAND_NAME}`,
      description: 'Learn about Rofik Godi Centre in Berhampore, Murshidabad: 18+ years of automotive rexine tailoring, precision stitching, foam modification, and free on-spot fitment.',
      canonicalUrl: buildCanonicalUrl('/settings/about', origin),
      robots: indexRobots,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  if (route.kind === 'settings-section' && route.section === 'help') {
    return {
      title: `Help Center & FAQs | ${SITE_BRAND_NAME}`,
      description: 'Answers about store pickup, free on-spot seat fitting, vehicle fitment finder, Razorpay & Pay at Workshop payments, guarantee claims, and Berhampore hours.',
      canonicalUrl: buildCanonicalUrl('/settings/help', origin),
      robots: indexRobots,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  if (route.kind === 'privacy') {
    return {
      title: `Privacy Policy | ${SITE_BRAND_NAME}`,
      description: 'Read how Rofik Godi Centre collects, protects, and manages customer account, order, vehicle fitment, and support data.',
      canonicalUrl: buildCanonicalUrl('/privacy-policy', origin),
      robots: indexRobots,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  if (route.kind === 'terms') {
    return {
      title: `Terms, Pickup & Guarantee Policy | ${SITE_BRAND_NAME}`,
      description: 'Review Rofik Godi Centre store-pickup terms, 14-day order hold window, 7-day workshop defect check, replacement guarantee coverage, and Razorpay refund rules.',
      canonicalUrl: buildCanonicalUrl('/terms-and-conditions', origin),
      robots: indexRobots,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  if (route.kind === 'personal-data') {
    return {
      title: `Personal Data Processing Notice | ${SITE_BRAND_NAME}`,
      description: 'Understand your data rights, voluntary consent controls, and 7-day account deletion process at Rofik Godi Centre.',
      canonicalUrl: buildCanonicalUrl('/personal-data', origin),
      robots: indexRobots,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  // Private/admin/auth/checkout/orders/support routes should not be indexed.
  if (
    route.kind === 'admin' ||
    route.kind === 'admin-customer' ||
    route.kind === 'admin-order' ||
    route.kind === 'checkout' ||
    route.kind === 'orders' ||
    route.kind === 'order-help' ||
    route.kind === 'coupon' ||
    route.kind === 'profile-edit' ||
    route.kind === 'support' ||
    route.kind === 'contact-support' ||
    route.kind === 'settings' ||
    route.kind === 'settings-section' ||
    route.kind === 'notifications-settings'
  ) {
    return {
      title: `${SITE_BRAND_NAME} — Customer & Workshop Portal`,
      description: 'Private account, order pickup, or workshop workspace at Rofik Godi Centre.',
      canonicalUrl: buildCanonicalUrl(route.canonicalPath, origin),
      robots: noIndexRobots,
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  return {
    title: 'Rofik Godi Centre | Bike, Scooter & Toto Seat Covers',
    description: 'Shop waterproof bike, scooter & toto seat covers, gel cushions & custom seat fitment at Rofik Godi Centre, Berhampore. Free on-spot fitting since 2007.',
    canonicalUrl: buildCanonicalUrl('/', origin),
    robots: indexRobots,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
  };
}

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function applyRouteSeoMeta(meta: RouteSeoMeta): void {
  if (typeof document === 'undefined') return;
  document.title = meta.title;
  upsertMetaTag('name', 'description', meta.description);
  upsertMetaTag('name', 'robots', meta.robots);
  upsertCanonicalLink(meta.canonicalUrl);
  upsertMetaTag('property', 'og:title', meta.title);
  upsertMetaTag('property', 'og:description', meta.description);
  upsertMetaTag('property', 'og:type', meta.ogType);
  upsertMetaTag('property', 'og:url', meta.canonicalUrl);
  upsertMetaTag('property', 'og:image', meta.ogImage);
  upsertMetaTag('name', 'twitter:title', meta.title);
  upsertMetaTag('name', 'twitter:description', meta.description);
  upsertMetaTag('name', 'twitter:image', meta.ogImage);
}
