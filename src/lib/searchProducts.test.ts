import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../data/products';
import { INITIAL_FILTERS } from '../data/filterOptions';
import {
  countActiveSearchFilters,
  filterAndSortSearchProducts,
  getActiveFilterChips,
  getCatalogTrendingSearches,
  getContextualCategoryCounts,
  getHomeSearchPromptTerms,
  getLiveSearchSuggestions,
  getQuickVehicleBrandsWithCounts,
  scoreProductSearchMatch,
} from './searchProducts';

test('scoreProductSearchMatch matches multi-word queries across title, compatibility, and features', () => {
  const product = PRODUCTS[0]!;
  const compatModel = product.compatibility[0] || 'Splendor';
  const multiWordQuery = `${compatModel.split(' ')[0]} ${product.category}`;

  const score = scoreProductSearchMatch(product, multiWordQuery);
  assert.equal(score > 0, true);
  assert.equal(scoreProductSearchMatch(product, 'bike covers') > 0, true);
  assert.equal(scoreProductSearchMatch(product, 'nonexistentxyz987'), 0);
});

test('filterAndSortSearchProducts returns filtered products even when searchQuery is empty', () => {
  const waterproofFilter = { ...INITIAL_FILTERS, waterproofOnly: true };
  const results = filterAndSortSearchProducts(PRODUCTS, '', waterproofFilter, 'manual');

  assert.equal(results.length > 0, true);
  assert.equal(
    results.every((p) => p.isWaterproof),
    true,
  );
});

test('getContextualCategoryCounts reflects active search query and non-category filters', () => {
  const counts = getContextualCategoryCounts(PRODUCTS, 'toto', INITIAL_FILTERS);
  assert.equal(counts.all >= counts.toto, true);
  assert.equal(counts.toto > 0, true);
});

test('getActiveFilterChips creates removable chips for all active filter properties', () => {
  const activeFilters = {
    ...INITIAL_FILTERS,
    category: 'bike' as const,
    waterproofOnly: true,
    inStockOnly: true,
    bestsellerOnly: true,
    customizableOnly: true,
    minRating: 4.5,
    maxPrice: 500,
    vehicleBrand: 'Hero',
  };

  assert.equal(countActiveSearchFilters(activeFilters), 8);
  const chips = getActiveFilterChips(activeFilters);
  assert.equal(chips.length, 8);

  const clearedWaterproof = chips.find((c) => c.id === 'waterproof')!.clear(activeFilters);
  assert.equal(clearedWaterproof.waterproofOnly, false);
});

test('getLiveSearchSuggestions returns matching recent, vehicle model, and product suggestions', () => {
  const suggestions = getLiveSearchSuggestions('splendor', ['splendor seat cover'], PRODUCTS, 5);
  assert.equal(suggestions.length > 0, true);
  assert.equal(suggestions[0]?.kind, 'recent');
});

test('getQuickVehicleBrandsWithCounts and getCatalogTrendingSearches only return catalog-backed entries', () => {
  const brands = getQuickVehicleBrandsWithCounts(PRODUCTS);
  assert.equal(brands.length > 0, true);
  assert.equal(
    brands.every((b) => b.matchCount > 0),
    true,
  );

  const trending = getCatalogTrendingSearches(PRODUCTS, 6);
  assert.equal(trending.length > 0, true);
  assert.equal(trending.length <= 6, true);
});

test('getHomeSearchPromptTerms interleaves core vehicle categories with live catalog products without duplicates', () => {
  const prompts = getHomeSearchPromptTerms(PRODUCTS, 8);
  assert.equal(prompts.includes('Bike Seat Cover'), true);
  assert.equal(prompts.includes('Scooty Seat Cover'), true);
  assert.equal(prompts.includes('Toto Seat Cover'), true);
  assert.equal(prompts.includes('Gel Seat Cushion'), true);
  assert.equal(prompts.includes(PRODUCTS[0]!.title), true);
  assert.equal(new Set(prompts.map((p) => p.toLowerCase())).size, prompts.length);
  assert.equal(prompts.length <= 8, true);
});
