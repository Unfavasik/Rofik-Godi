import type { Product, VehicleCategory } from '../types';
import { INITIAL_FILTERS } from '../data/filterOptions';
import type { FilterState, SortOption } from '../data/filterOptions';
import { compareProductsByDisplayOrder } from './productOrdering';

export interface ActiveFilterChip {
  id: string;
  label: string;
  clear: (prev: FilterState) => FilterState;
}

export const SEARCH_CATEGORY_FILTERS: Array<{ id: 'all' | VehicleCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'bike', label: 'Bike' },
  { id: 'toto', label: 'Toto' },
  { id: 'cushion', label: 'Cushion' },
  { id: 'scooter', label: 'Scooter' },
  { id: 'accessory', label: 'Accessories' },
];

export const QUICK_VEHICLE_BRANDS: Array<{ id: string; label: string; subtitle: string }> = [
  { id: 'Hero', label: 'Hero', subtitle: 'Splendor, HF Deluxe, Glamour' },
  { id: 'Honda', label: 'Honda', subtitle: 'Shine, SP 125, Activa' },
  { id: 'Bajaj', label: 'Bajaj', subtitle: 'Pulsar, Platina, CT 110' },
  { id: 'Royal Enfield', label: 'Royal Enfield', subtitle: 'Classic 350, Bullet, Hunter' },
  { id: 'TVS', label: 'TVS', subtitle: 'Apache, Raider, Jupiter' },
  { id: 'Yamaha', label: 'Yamaha', subtitle: 'FZ, MT-15, RayZR' },
  { id: 'Toto', label: 'Toto / E-Rickshaw', subtitle: 'Full driver & passenger sets' },
];

/**
 * Normalizes a text string for case-insensitive token matching.
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes a relevance score (>= 0) for a product against a search query.
 * Returns 0 if the product does not match the query.
 * Supports multi-word queries across title, subtitle, compatibility, category, materials, and colors.
 */
export function scoreProductSearchMatch(product: Product, rawQuery: string): number {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) return 1;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (tokens.length === 0) return 1;

  const title = normalizeSearchText(product.title || '');
  const subtitle = normalizeSearchText(product.subtitle || '');
  const categoryLabel = normalizeSearchText(product.categoryLabel || '');
  const category = normalizeSearchText(product.category || '');
  const badge = normalizeSearchText(product.badge || '');
  const description = normalizeSearchText(product.description || '');
  const compatibility = (product.compatibility || []).map(normalizeSearchText);
  const materials = (product.materials || []).map(normalizeSearchText);
  const colors = (product.colors || []).map((c) => normalizeSearchText(c.name || ''));
  const waterproofTag = product.isWaterproof ? 'waterproof rain proof' : '';
  const customizableTag = product.isCustomizable ? 'custom customizable embroidery fit' : '';

  const searchableCorpus = [
    title,
    subtitle,
    categoryLabel,
    category,
    badge,
    description,
    ...compatibility,
    ...materials,
    ...colors,
    waterproofTag,
    customizableTag,
  ].join(' ');

  // Every token in the user's query must match somewhere in the product's searchable corpus
  for (const token of tokens) {
    if (!searchableCorpus.includes(token)) {
      return 0;
    }
  }

  let score = 10;

  // Full phrase boosts
  if (title === normalizedQuery) score += 120;
  else if (title.startsWith(normalizedQuery)) score += 80;
  else if (title.includes(normalizedQuery)) score += 55;

  if (compatibility.some((item) => item.includes(normalizedQuery))) score += 50;
  if (categoryLabel.includes(normalizedQuery) || category === normalizedQuery) score += 35;
  if (subtitle.includes(normalizedQuery)) score += 25;

  // Per-token field weighting
  for (const token of tokens) {
    if (title.includes(token)) score += 18;
    if (compatibility.some((item) => item.includes(token))) score += 15;
    if (categoryLabel.includes(token) || category.includes(token)) score += 10;
    if (materials.some((item) => item.includes(token))) score += 8;
    if (colors.some((item) => item.includes(token))) score += 6;
    if (badge.includes(token)) score += 5;
  }

  if (product.inStock) score += 3;
  if (product.isBestseller) score += 2;

  return score;
}

/**
 * Checks whether a product matches non-category filter criteria and search query.
 */
export function matchesProductFilters(
  product: Product,
  filters: FilterState,
  rawQuery: string,
  ignoreCategory = false,
): boolean {
  if (!ignoreCategory && filters.category !== 'all' && product.category !== filters.category) {
    return false;
  }

  if (rawQuery.trim() && scoreProductSearchMatch(product, rawQuery) <= 0) {
    return false;
  }

  // Price filter
  if (filters.priceRange === 'under_300' && product.price >= 300) return false;
  if (filters.priceRange === '300_600' && (product.price < 300 || product.price > 600)) return false;
  if (filters.priceRange === '600_1000' && (product.price < 600 || product.price > 1000)) return false;
  if (filters.priceRange === 'above_1000' && product.price <= 1000) return false;
  if (product.price > filters.maxPrice) return false;

  // Feature toggles
  if (filters.waterproofOnly && !product.isWaterproof) return false;
  if (filters.bestsellerOnly && !product.isBestseller && product.badge !== 'Bestseller') return false;
  if (filters.inStockOnly && !product.inStock) return false;
  if (filters.customizableOnly && !product.isCustomizable) return false;

  // Rating filter
  if (filters.minRating > 0 && product.rating < filters.minRating) return false;

  // Vehicle Brand filter
  if (filters.vehicleBrand !== 'all') {
    const brandQuery = filters.vehicleBrand.toLowerCase();
    const matchesBrand =
      product.compatibility.some((c) => c.toLowerCase().includes(brandQuery)) ||
      product.title.toLowerCase().includes(brandQuery) ||
      product.category.toLowerCase().includes(brandQuery) ||
      product.categoryLabel.toLowerCase().includes(brandQuery);
    if (!matchesBrand) return false;
  }

  return true;
}

/**
 * Filters and sorts products by search query, active filters, and sort mode.
 * When a search query is present and sortBy is 'manual', products are ranked by search relevance first.
 */
export function filterAndSortSearchProducts(
  products: Product[],
  rawQuery: string,
  filters: FilterState,
  sortBy: SortOption,
): Product[] {
  const hasQuery = rawQuery.trim().length > 0;
  const matched = products.filter((product) => matchesProductFilters(product, filters, rawQuery));

  return [...matched].sort((a, b) => {
    switch (sortBy) {
      case 'manual': {
        if (hasQuery) {
          const scoreDiff = scoreProductSearchMatch(b, rawQuery) - scoreProductSearchMatch(a, rawQuery);
          if (scoreDiff !== 0) return scoreDiff;
        }
        return compareProductsByDisplayOrder(a, b);
      }
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating || b.reviewCount - a.reviewCount;
      case 'newest':
        return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      case 'discount': {
        const discA = a.originalPrice > 0 ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
        const discB = b.originalPrice > 0 ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
        return discB - discA;
      }
      case 'popular':
      default:
        return (
          (b.isBestseller ? 2 : 0) +
          b.rating -
          ((a.isBestseller ? 2 : 0) + a.rating)
        );
    }
  });
}

/**
 * Computes contextual product counts for each category tab, taking into account
 * the active search query and all non-category filters.
 */
export function getContextualCategoryCounts(
  products: Product[],
  rawQuery: string,
  filters: FilterState,
): Record<'all' | VehicleCategory, number> {
  const baseMatched = products.filter((product) =>
    matchesProductFilters(product, filters, rawQuery, true),
  );

  const counts: Record<'all' | VehicleCategory, number> = {
    all: baseMatched.length,
    bike: 0,
    toto: 0,
    cushion: 0,
    scooter: 0,
    accessory: 0,
  };

  for (const product of baseMatched) {
    if (product.category in counts) {
      counts[product.category] += 1;
    }
  }

  return counts;
}

/**
 * Counts how many filter dimensions differ from INITIAL_FILTERS.
 */
export function countActiveSearchFilters(filters: FilterState): number {
  let count = 0;
  if (filters.category !== 'all') count += 1;
  if (filters.priceRange !== 'all' || filters.maxPrice < INITIAL_FILTERS.maxPrice) count += 1;
  if (filters.waterproofOnly) count += 1;
  if (filters.bestsellerOnly) count += 1;
  if (filters.inStockOnly) count += 1;
  if (filters.customizableOnly) count += 1;
  if (filters.minRating > 0) count += 1;
  if (filters.vehicleBrand !== 'all') count += 1;
  return count;
}

/**
 * Builds descriptive, individually removable filter chips for every active filter dimension.
 */
export function getActiveFilterChips(filters: FilterState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.category !== 'all') {
    const categoryOption = SEARCH_CATEGORY_FILTERS.find((item) => item.id === filters.category);
    chips.push({
      id: 'category',
      label: categoryOption ? categoryOption.label : filters.category.toUpperCase(),
      clear: (prev) => ({ ...prev, category: 'all' }),
    });
  }

  if (filters.vehicleBrand !== 'all') {
    chips.push({
      id: 'vehicleBrand',
      label: `Brand: ${filters.vehicleBrand}`,
      clear: (prev) => ({ ...prev, vehicleBrand: 'all' }),
    });
  }

  if (filters.priceRange !== 'all' || filters.maxPrice < INITIAL_FILTERS.maxPrice) {
    const priceLabel =
      filters.priceRange === 'under_300'
        ? 'Under ₹300'
        : filters.priceRange === '300_600'
          ? '₹300 – ₹600'
          : filters.priceRange === '600_1000'
            ? '₹600 – ₹1,000'
            : filters.priceRange === 'above_1000'
              ? 'Above ₹1,000'
              : `Up to ₹${filters.maxPrice}`;
    chips.push({
      id: 'price',
      label: priceLabel,
      clear: (prev) => ({ ...prev, priceRange: 'all', maxPrice: INITIAL_FILTERS.maxPrice }),
    });
  }

  if (filters.waterproofOnly) {
    chips.push({
      id: 'waterproof',
      label: 'Waterproof',
      clear: (prev) => ({ ...prev, waterproofOnly: false }),
    });
  }

  if (filters.inStockOnly) {
    chips.push({
      id: 'inStock',
      label: 'In Stock',
      clear: (prev) => ({ ...prev, inStockOnly: false }),
    });
  }

  if (filters.bestsellerOnly) {
    chips.push({
      id: 'bestseller',
      label: 'Bestseller',
      clear: (prev) => ({ ...prev, bestsellerOnly: false }),
    });
  }

  if (filters.customizableOnly) {
    chips.push({
      id: 'customizable',
      label: 'Custom Fit',
      clear: (prev) => ({ ...prev, customizableOnly: false }),
    });
  }

  if (filters.minRating > 0) {
    chips.push({
      id: 'minRating',
      label: `${filters.minRating}★ & above`,
      clear: (prev) => ({ ...prev, minRating: 0 }),
    });
  }

  return chips;
}

/**
 * Generates live autocomplete suggestions from recent searches, product titles, and compatible vehicle models.
 */
export function getLiveSearchSuggestions(
  rawQuery: string,
  recentSearches: string[],
  products: Product[],
  limit = 6,
): Array<{ term: string; kind: 'recent' | 'vehicle' | 'product' }> {
  const q = normalizeSearchText(rawQuery);
  if (!q) return [];

  const seen = new Set<string>([q]);
  const suggestions: Array<{ term: string; kind: 'recent' | 'vehicle' | 'product' }> = [];

  for (const recent of recentSearches) {
    const norm = normalizeSearchText(recent);
    if (norm && norm.includes(q) && !seen.has(norm)) {
      seen.add(norm);
      suggestions.push({ term: recent, kind: 'recent' });
      if (suggestions.length >= limit) return suggestions;
    }
  }

  for (const product of products) {
    for (const model of product.compatibility || []) {
      const norm = normalizeSearchText(model);
      if (norm && norm.includes(q) && !seen.has(norm)) {
        seen.add(norm);
        suggestions.push({ term: model, kind: 'vehicle' });
        if (suggestions.length >= limit) return suggestions;
      }
    }
  }

  for (const product of products) {
    const norm = normalizeSearchText(product.title);
    if (norm && norm.includes(q) && !seen.has(norm)) {
      seen.add(norm);
      suggestions.push({ term: product.title, kind: 'product' });
      if (suggestions.length >= limit) return suggestions;
    }
  }

  return suggestions;
}
