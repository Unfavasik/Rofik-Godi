import { WORKSHOP_INFO } from '../data/products';
import type { Product } from '../types';
import { getPathForProduct, isAdminPath, resolveAppRoute } from './appRoutes';

export const CANONICAL_SITE_ORIGIN = 'https://rofik-godi.pages.dev';
export const DEFAULT_OG_IMAGE = `${CANONICAL_SITE_ORIGIN}/images/rofik-godi-store.webp`;
export const STORE_LOGO_URL = `${CANONICAL_SITE_ORIGIN}/icon-foreground.png`;
export const STORE_MAPS_URL = 'https://maps.app.goo.gl/8r2bxtfEfwicEp6Q7?g_st=ac';

export interface ResolvedSeoPayload {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: 'index, follow, max-image-preview:large' | 'noindex, nofollow';
  ogType: 'website' | 'product';
  ogImage: string;
  ogImageAlt: string;
  jsonLd: Record<string, unknown> | null;
}

const trimPath = (pathname: string) => pathname.replace(/\/+$/, '') || '/';

const toAbsoluteUrl = (pathOrUrl?: string | null): string => {
  const raw = String(pathOrUrl || '').trim();
  if (!raw) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${CANONICAL_SITE_ORIGIN}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

const clampDescription = (text: string, fallback: string): string => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= 160) return cleaned;
  return `${cleaned.slice(0, 157).trimEnd()}...`;
};

function buildBusinessNode(): Record<string, unknown> {
  return {
    '@type': ['AutoPartsStore', 'LocalBusiness'],
    '@id': `${CANONICAL_SITE_ORIGIN}/#business`,
    name: 'Rofik Godi Centre',
    alternateName: WORKSHOP_INFO.name,
    url: `${CANONICAL_SITE_ORIGIN}/`,
    image: DEFAULT_OG_IMAGE,
    logo: STORE_LOGO_URL,
    description:
      'Local ride essentials and custom seat manufacturing workshop offering bike, scooter, and Toto E-Rickshaw seat covers, gel cushions, custom foam modifications, and machine embroidery with free on-spot fitment.',
    telephone: WORKSHOP_INFO.phone,
    email: WORKSHOP_INFO.email,
    priceRange: '₹499 – ₹1,499',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Debit Card, Credit Card, Razorpay',
    hasMap: STORE_MAPS_URL,
    sameAs: [STORE_MAPS_URL],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Kadbeltal, Petrol Pump More, Raninagar, Keshobnagar',
      addressLocality: 'Berhampore',
      addressRegion: 'West Bengal',
      postalCode: '742101',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: WORKSHOP_INFO.lat,
      longitude: WORKSHOP_INFO.lng,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '08:00',
        closes: '21:30',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: String(WORKSHOP_INFO.rating),
      reviewCount: String(WORKSHOP_INFO.reviewCount),
    },
    areaServed: ['Raninagar', 'Berhampore', 'Murshidabad', 'West Bengal'],
  };
}

function buildBreadcrumbNode(items: Array<{ name: string; url: string }>): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: entry.name,
      item: entry.url,
    })),
  };
}

function buildProductJsonLd(product: Product, canonicalUrl: string): Record<string, unknown> {
  const imageUrl = toAbsoluteUrl(product.image);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildBusinessNode(),
      {
        '@type': 'Product',
        '@id': `${canonicalUrl}#product`,
        name: product.title,
        description: product.description || product.subtitle,
        sku: product.id,
        image: [imageUrl, ...(product.additionalImages || []).map((img) => toAbsoluteUrl(img))],
        category: product.categoryLabel,
        brand: {
          '@type': 'Brand',
          name: 'Rofik Godi Centre',
        },
        material: product.materials?.join(', '),
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'INR',
          price: String(product.price),
          availability: product.inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@id': `${CANONICAL_SITE_ORIGIN}/#business` },
        },
      },
      buildBreadcrumbNode([
        { name: 'Home', url: `${CANONICAL_SITE_ORIGIN}/` },
        { name: 'Shop', url: `${CANONICAL_SITE_ORIGIN}/shop` },
        { name: product.title, url: canonicalUrl },
      ]),
    ],
  };
}

function buildDefaultStoreJsonLd(canonicalUrl: string, pageLabel?: string): Record<string, unknown> {
  const graph: Array<Record<string, unknown>> = [
    buildBusinessNode(),
    {
      '@type': 'WebSite',
      '@id': `${CANONICAL_SITE_ORIGIN}/#website`,
      url: `${CANONICAL_SITE_ORIGIN}/`,
      name: 'Rofik Godi Centre',
      publisher: { '@id': `${CANONICAL_SITE_ORIGIN}/#business` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${CANONICAL_SITE_ORIGIN}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  if (pageLabel && canonicalUrl !== `${CANONICAL_SITE_ORIGIN}/`) {
    graph.push(
      buildBreadcrumbNode([
        { name: 'Home', url: `${CANONICAL_SITE_ORIGIN}/` },
        { name: pageLabel, url: canonicalUrl },
      ]),
    );
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function resolveSeoPayload(params: {
  pathname: string;
  selectedProduct?: Product | null;
  catalogProducts?: Product[];
  activeOverlay?: 'custom' | 'store' | 'privacy' | 'terms' | 'personal-data' | null;
}): ResolvedSeoPayload {
  const rawPath = trimPath(params.pathname);
  const route = resolveAppRoute(rawPath);

  // If a modal/overlay is explicitly open without changing URL, reflect that public surface
  if (params.selectedProduct) {
    const product = params.selectedProduct;
    const canonicalUrl = `${CANONICAL_SITE_ORIGIN}${getPathForProduct(product.id)}`;
    return {
      title: `${product.title} (₹${product.price}) | Rofik Godi Centre`,
      description: clampDescription(
        `${product.title} — ${product.subtitle}. ${product.description}`,
        'Custom fitted seat covers and ride cushions crafted at Rofik Godi Centre, Berhampore with free workshop fitment.',
      ),
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'product',
      ogImage: toAbsoluteUrl(product.image),
      ogImageAlt: `${product.title} by Rofik Godi Centre`,
      jsonLd: buildProductJsonLd(product, canonicalUrl),
    };
  }

  if (params.activeOverlay === 'store' || route.kind === 'store' || route.kind === 'store-navigation') {
    const isNav = route.kind === 'store-navigation';
    const canonicalUrl = `${CANONICAL_SITE_ORIGIN}${isNav ? '/store-map/navigation' : '/store-map'}`;
    return {
      title: isNav
        ? 'Directions to Rofik Godi Centre | Berhampore Map'
        : 'Workshop Location & Hours | Rofik Godi Centre Berhampore',
      description:
        'Visit Rofik Godi Centre at Kadbeltal, Petrol Pump More, Raninagar, Berhampore 742101. Open Mon–Sun 8:00 AM–9:30 PM. Call +91 94348 86786.',
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Rofik Godi Centre storefront in Berhampore',
      jsonLd: buildDefaultStoreJsonLd(canonicalUrl, isNav ? 'Store Navigation' : 'Workshop Location'),
    };
  }

  if (params.activeOverlay === 'privacy' || route.kind === 'privacy') {
    const canonicalUrl = `${CANONICAL_SITE_ORIGIN}/privacy-policy`;
    return {
      title: 'Privacy Policy | Rofik Godi Centre',
      description:
        'Read how Rofik Godi Centre protects customer contact details, saved vehicles, Razorpay checkout privacy, and account deletion rights.',
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Rofik Godi Centre Privacy Policy',
      jsonLd: buildDefaultStoreJsonLd(canonicalUrl, 'Privacy Policy'),
    };
  }

  if (params.activeOverlay === 'terms' || route.kind === 'terms') {
    const canonicalUrl = `${CANONICAL_SITE_ORIGIN}/terms-and-conditions`;
    return {
      title: 'Terms, Pickup & Guarantee Policy | Rofik Godi Centre',
      description:
        'Review Rofik Godi Centre workshop pickup rules, free on-spot fitment, Razorpay payments, 7-day replacement, and product guarantee policy.',
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Rofik Godi Centre Terms and Conditions',
      jsonLd: buildDefaultStoreJsonLd(canonicalUrl, 'Terms & Conditions'),
    };
  }

  if (params.activeOverlay === 'personal-data' || route.kind === 'personal-data') {
    const canonicalUrl = `${CANONICAL_SITE_ORIGIN}/personal-data`;
    return {
      title: 'Personal Data & Account Deletion | Rofik Godi Centre',
      description:
        'Learn how personal profile, vehicle fitment, and order data are managed and how the 7-day scheduled account deletion works.',
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Rofik Godi Centre Personal Data Policy',
      jsonLd: buildDefaultStoreJsonLd(canonicalUrl, 'Personal Data'),
    };
  }

  if (params.activeOverlay === 'custom' || (route.kind === 'tab' && route.tab === 'custom')) {
    const canonicalUrl = `${CANONICAL_SITE_ORIGIN}/custom`;
    return {
      title: 'Custom Bike & Toto Seat Builder | Rofik Godi Centre',
      description:
        'Design your custom bike, scooter, or Toto seat cover with foam thickness, diamond or sport stitching, colors, and name embroidery.',
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Custom Seat Cover Builder at Rofik Godi Centre',
      jsonLd: buildDefaultStoreJsonLd(canonicalUrl, 'Custom Seat Builder'),
    };
  }

  if (route.kind === 'product') {
    const matched = params.catalogProducts?.find(
      (item) => item.id === route.slug || item.slug === route.slug,
    );
    if (matched) {
      const canonicalUrl = `${CANONICAL_SITE_ORIGIN}${getPathForProduct(matched.id)}`;
      return {
        title: `${matched.title} (₹${matched.price}) | Rofik Godi Centre`,
        description: clampDescription(
          `${matched.title} — ${matched.subtitle}. ${matched.description}`,
          'Custom fitted seat covers and ride cushions crafted at Rofik Godi Centre, Berhampore with free workshop fitment.',
        ),
        canonicalUrl,
        robots: 'index, follow, max-image-preview:large',
        ogType: 'product',
        ogImage: toAbsoluteUrl(matched.image),
        ogImageAlt: `${matched.title} by Rofik Godi Centre`,
        jsonLd: buildProductJsonLd(matched, canonicalUrl),
      };
    }
  }

  if (route.kind === 'tab' && route.tab === 'shop') {
    const canonicalUrl = `${CANONICAL_SITE_ORIGIN}/shop`;
    return {
      title: 'Shop Bike, Scooter & Toto Seat Covers | Rofik Godi Centre',
      description:
        'Browse waterproof bike covers, commercial Toto bench covers, gel seat cushions, and custom embroidered covers with free workshop fitment.',
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Rofik Godi Centre Shop Catalogue',
      jsonLd: buildDefaultStoreJsonLd(canonicalUrl, 'Shop'),
    };
  }

  if (route.kind === 'tab' && route.tab === 'search') {
    const canonicalUrl = `${CANONICAL_SITE_ORIGIN}/search`;
    return {
      title: 'Search Seat Covers by Bike, Scooter & Toto | Rofik Godi Centre',
      description:
        'Find compatible seat covers, gel cushions, and custom foam designs for Hero, Honda, Bajaj, Royal Enfield, TVS, Yamaha, and Toto models.',
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Search Rofik Godi Centre Seat Covers',
      jsonLd: buildDefaultStoreJsonLd(canonicalUrl, 'Search'),
    };
  }

  if (route.kind === 'settings-section' && route.section === 'about') {
    const canonicalUrl = `${CANONICAL_SITE_ORIGIN}/settings/about`;
    return {
      title: 'About Rofik Godi Centre | Custom Seat Workshop Berhampore',
      description:
        'Learn about Rofik Godi Centre in Raninagar, Berhampore — handcrafted bike, scooter, and Toto seat covers with custom embroidery and fitment.',
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'About Rofik Godi Centre',
      jsonLd: buildDefaultStoreJsonLd(canonicalUrl, 'About Us'),
    };
  }

  // Private, authenticated, transactional, and admin routes should not be indexed
  const isPrivateRoute =
    isAdminPath(rawPath) ||
    route.kind === 'checkout' ||
    route.kind === 'orders' ||
    route.kind === 'order-help' ||
    route.kind === 'coupon' ||
    route.kind === 'profile-edit' ||
    route.kind === 'support' ||
    route.kind === 'contact-support' ||
    route.kind === 'settings' ||
    route.kind === 'settings-section' ||
    route.kind === 'notifications-settings' ||
    (route.kind === 'tab' &&
      (route.tab === 'cart' ||
        route.tab === 'wishlist' ||
        route.tab === 'account' ||
        route.tab === 'notifications')) ||
    /^\/(?:signup|onboarding|auth)(?:\/|$)/i.test(rawPath);

  if (isPrivateRoute) {
    return {
      title: 'Rofik Godi Centre – Customer & Store Workspace',
      description: 'Customer account, order tracking, and workshop management for Rofik Godi Centre.',
      canonicalUrl: `${CANONICAL_SITE_ORIGIN}${route.canonicalPath}`,
      robots: 'noindex, nofollow',
      ogType: 'website',
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Rofik Godi Centre',
      jsonLd: null,
    };
  }

  // Default Homepage (`/`, `/home`, fallback)
  return {
    title: 'Rofik Godi Centre – Bike & Toto Seat Covers, Berhampore',
    description:
      'Shop waterproof bike, scooter & Toto seat covers, gel cushions & custom embroidery at Rofik Godi Centre, Berhampore with free fitment.',
    canonicalUrl: `${CANONICAL_SITE_ORIGIN}/`,
    robots: 'index, follow, max-image-preview:large',
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: 'Rofik Godi Centre custom seat cover workshop in Berhampore',
    jsonLd: buildDefaultStoreJsonLd(`${CANONICAL_SITE_ORIGIN}/`),
  };
}

function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  if (typeof document === 'undefined' || !document.head) return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined' || !document.head) return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function applyDocumentSeo(payload: ResolvedSeoPayload): void {
  if (typeof document === 'undefined' || !document.head) return;
  document.title = payload.title;
  upsertMetaTag('name', 'description', payload.description);
  upsertMetaTag('name', 'robots', payload.robots);
  upsertCanonicalLink(payload.canonicalUrl);

  upsertMetaTag('property', 'og:type', payload.ogType);
  upsertMetaTag('property', 'og:title', payload.title);
  upsertMetaTag('property', 'og:description', payload.description);
  upsertMetaTag('property', 'og:url', payload.canonicalUrl);
  upsertMetaTag('property', 'og:image', payload.ogImage);
  upsertMetaTag('property', 'og:image:alt', payload.ogImageAlt);

  upsertMetaTag('name', 'twitter:title', payload.title);
  upsertMetaTag('name', 'twitter:description', payload.description);
  upsertMetaTag('name', 'twitter:image', payload.ogImage);

  const scriptId = 'rg-dynamic-jsonld';
  const existingScript = document.getElementById(scriptId);
  if (payload.jsonLd) {
    const script =
      existingScript ||
      (() => {
        const created = document.createElement('script');
        created.id = scriptId;
        created.setAttribute('type', 'application/ld+json');
        document.head.appendChild(created);
        return created;
      })();
    script.textContent = JSON.stringify(payload.jsonLd);
  } else if (existingScript) {
    existingScript.remove();
  }
}
