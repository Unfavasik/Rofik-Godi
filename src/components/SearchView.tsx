import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  TrendingUp,
  LayoutGrid,
  List,
  ArrowLeft,
  Clock,
  Trash2,
  SlidersHorizontal,
  ArrowUpDown,
  Droplets,
  Star,
  Flame,
  CheckCircle2,
  RotateCcw,
  Scissors,
  Bike,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { CatalogStatus } from './CatalogStatus';
import { FilterSortModal } from './FilterSortModal';
import { INITIAL_FILTERS, SORT_LABELS } from '../data/filterOptions';
import type { FilterState, SortOption } from '../data/filterOptions';
import {
  SEARCH_CATEGORY_FILTERS,
  QUICK_VEHICLE_BRANDS,
  countActiveSearchFilters,
  filterAndSortSearchProducts,
  getActiveFilterChips,
  getContextualCategoryCounts,
  getLiveSearchSuggestions,
} from '../lib/searchProducts';

interface SearchViewProps {
  products: Product[];
  isCatalogLoading: boolean;
  catalogError: Error | null;
  onRetryCatalog: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectProduct: (p: Product) => void;
  onQuickAddToCart: (p: Product, e: React.MouseEvent) => void;
  onNotifyMe?: (p: Product) => void | Promise<void>;
  isQuickAddInCart: (p: Product) => boolean;
  onOpenCart: () => void;
  wishlist: Product[];
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
  onBackToHome: () => void;
}

const RECENT_SEARCHES_KEY = 'rofik_godi_recent_searches';
const DEFAULT_RECENT_SEARCHES = [
  'bike seat cover',
  'toto seat cover',
  'cushion',
  'gel seat cover',
  'waterproof cover',
];

const POPULAR_SEARCHES = [
  'Premium Bike Seat Cover',
  'Sport Bike Seat Cover',
  'Toto Seat Cover',
  'Gel Seat Cushion',
  'Classic Seat Cover',
  'Waterproof Seat Cover',
  'Splendor Plus',
  'Pulsar 150',
  'Activa 6G',
  'Royal Enfield 350',
];

const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const SearchView: React.FC<SearchViewProps> = ({
  products,
  isCatalogLoading,
  catalogError,
  onRetryCatalog,
  searchQuery,
  setSearchQuery,
  onSelectProduct,
  onQuickAddToCart,
  onNotifyMe,
  isQuickAddInCart,
  onOpenCart,
  wishlist,
  onToggleWishlist,
  onBackToHome,
}) => {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState<SortOption>('manual');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Load and manage recent searches from localStorage (SSR-safe)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (!canUseLocalStorage()) return DEFAULT_RECENT_SEARCHES;
    try {
      const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Error reading recent searches from localStorage:', err);
    }
    return DEFAULT_RECENT_SEARCHES;
  });

  // Focus search input automatically on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Save new search query to recent searches (deduplicated, max 8 items)
  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 8);
      if (canUseLocalStorage()) {
        try {
          window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (err) {
          console.warn('Error saving recent searches to localStorage:', err);
        }
      }
      return updated;
    });
  };

  // Remove a single recent search
  const removeRecentSearch = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item.toLowerCase() !== termToRemove.toLowerCase());
      if (canUseLocalStorage()) {
        try {
          window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (err) {
          console.warn('Error updating recent searches:', err);
        }
      }
      return updated;
    });
  };

  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    if (canUseLocalStorage()) {
      try {
        window.localStorage.removeItem(RECENT_SEARCHES_KEY);
      } catch (err) {
        console.warn('Error clearing recent searches:', err);
      }
    }
  };

  // Handle clicking a recent or suggested search term
  const handleSelectSearchTerm = (term: string) => {
    setSearchQuery(term);
    saveRecentSearch(term);
  };

  // Handle search form submission (Enter key / Search button)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      searchInputRef.current?.blur();
    }
  };

  // Handle selecting a product from results
  const handleProductSelect = (product: Product) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
    }
    onSelectProduct(product);
  };

  // Compute active filters count & chips
  const activeFiltersCount = useMemo(() => countActiveSearchFilters(filters), [filters]);
  const activeFilterChips = useMemo(() => getActiveFilterChips(filters), [filters]);

  const hasActiveSearchOrFilter =
    searchQuery.trim().length > 0 || activeFiltersCount > 0 || sortBy !== 'manual';

  // Live autocomplete suggestions while typing
  const liveSuggestions = useMemo(
    () => getLiveSearchSuggestions(searchQuery, recentSearches, products, 6),
    [searchQuery, recentSearches, products],
  );

  // Contextual category counts based on current query & non-category filters
  const categoryCounts = useMemo(
    () => getContextualCategoryCounts(products, searchQuery, filters),
    [products, searchQuery, filters],
  );

  // Filter and sort products
  const filteredProducts = useMemo(
    () => filterAndSortSearchProducts(products, searchQuery, filters, sortBy),
    [products, searchQuery, filters, sortBy],
  );

  // Featured / popular products for Discovery view & zero-match fallback
  const popularShowcaseProducts = useMemo(() => {
    return filterAndSortSearchProducts(products, '', INITIAL_FILTERS, 'popular').slice(0, 8);
  }, [products]);

  // Quick reset all filters
  const resetAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSortBy('manual');
  };

  const resetSearchAndFilters = () => {
    setSearchQuery('');
    setFilters(INITIAL_FILTERS);
    setSortBy('manual');
  };

  const activeSortShortLabel =
    sortBy === 'manual'
      ? 'Relevance'
      : sortBy === 'popular'
        ? 'Popular'
        : sortBy === 'price_asc'
          ? 'Price: Low'
          : sortBy === 'price_desc'
            ? 'Price: High'
            : sortBy === 'rating'
              ? 'Top Rated'
              : sortBy === 'newest'
                ? 'Newest'
                : 'Discount';

  return (
    <div className="flex-1 flex w-full max-w-full flex-col overflow-x-hidden bg-[#F8FAFC] pb-[max(2.5rem,env(safe-area-inset-bottom))] min-h-dvh text-slate-900">
      {/* Sticky Top Search Command Bar */}
      <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBackToHome}
              aria-label="Back to Home"
              title="Back to Home"
              type="button"
              className="min-h-11 min-w-11 rounded-full border border-slate-200/80 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-800 transition-colors active:scale-95 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search seat covers, vehicle models, or cushions"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by bike model, seat cover, or cushion..."
                className="min-h-11 w-full bg-[#F8FAFC] hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 focus:border-[#D9232D] focus:ring-2 focus:ring-[#D9232D]/15 rounded-2xl pl-10 pr-11 py-2.5 text-base sm:text-[13.5px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition-all"
                enterKeyHint="search"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Clear search query"
                    title="Clear search"
                    className="absolute right-1 flex min-h-10 min-w-10 items-center justify-center text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </form>

            {/* Always-Accessible Filter Button in Header */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              aria-label="Open product filters"
              className={`min-h-11 shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                activeFiltersCount > 0
                  ? 'bg-rose-50 border-rose-200 text-[#D9232D]'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-[#D9232D] text-white text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Live Autocomplete Suggestions While Typing */}
          {liveSuggestions.length > 0 && (
            <div
              role="region"
              aria-label="Search suggestions"
              className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5"
            >
              <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-0.5">
                Suggestions:
              </span>
              {liveSuggestions.map((item) => (
                <button
                  key={`${item.kind}-${item.term}`}
                  type="button"
                  onClick={() => handleSelectSearchTerm(item.term)}
                  className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/90 hover:border-rose-200 hover:bg-rose-50/60 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-[#D9232D] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {item.kind === 'recent' ? (
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  ) : item.kind === 'vehicle' ? (
                    <Bike className="w-3 h-3 text-[#D9232D] shrink-0" />
                  ) : (
                    <Search className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                  <span>{item.term}</span>
                </button>
              ))}
            </div>
          )}

          {/* Contextual Category Tabs (Always Reachable) */}
          <nav
            aria-label="Filter by product category"
            className="mt-2.5 flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar"
          >
            {SEARCH_CATEGORY_FILTERS.map((cat) => {
              const count = categoryCounts[cat.id] ?? 0;
              const isSelected = filters.category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      category: prev.category === cat.id && cat.id !== 'all' ? 'all' : cat.id,
                    }))
                  }
                  aria-pressed={isSelected}
                  className={`min-h-10 shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#D9232D] border-[#D9232D] text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10.5px] font-semibold tabular-nums ${
                      isSelected ? 'text-white/90' : 'text-slate-400'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4">
        {/* Quick One-Tap Attribute Filter Bar */}
        <div
          role="group"
          aria-label="Quick attribute filters"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3"
        >
          {/* In Stock Toggle */}
          <button
            type="button"
            aria-pressed={filters.inStockOnly}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                inStockOnly: !prev.inStockOnly,
              }))
            }
            className={`min-h-9 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
              filters.inStockOnly
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>In Stock</span>
          </button>

          {/* Waterproof Toggle */}
          <button
            type="button"
            aria-pressed={filters.waterproofOnly}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                waterproofOnly: !prev.waterproofOnly,
              }))
            }
            className={`min-h-9 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
              filters.waterproofOnly
                ? 'bg-sky-50 border-sky-300 text-sky-800'
                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Waterproof</span>
          </button>

          {/* Under ₹500 Toggle */}
          <button
            type="button"
            aria-pressed={filters.maxPrice === 500}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                priceRange: prev.maxPrice === 500 ? 'all' : 'custom',
                maxPrice: prev.maxPrice === 500 ? INITIAL_FILTERS.maxPrice : 500,
              }))
            }
            className={`min-h-9 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 tabular-nums ${
              filters.maxPrice === 500
                ? 'bg-rose-50 border-rose-300 text-[#D9232D]'
                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600'
            }`}
          >
            <span>Under ₹500</span>
          </button>

          {/* 4.5+ Rating Toggle */}
          <button
            type="button"
            aria-pressed={filters.minRating === 4.5}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                minRating: prev.minRating === 4.5 ? 0 : 4.5,
              }))
            }
            className={`min-h-9 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 tabular-nums ${
              filters.minRating === 4.5
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
            <span>4.5★ &amp; above</span>
          </button>

          {/* Bestseller Toggle */}
          <button
            type="button"
            aria-pressed={filters.bestsellerOnly}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                bestsellerOnly: !prev.bestsellerOnly,
              }))
            }
            className={`min-h-9 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
              filters.bestsellerOnly
                ? 'bg-rose-50 border-rose-300 text-[#D9232D]'
                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#D9232D] shrink-0" />
            <span>Bestsellers</span>
          </button>

          {/* Custom Fit Toggle */}
          <button
            type="button"
            aria-pressed={filters.customizableOnly}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                customizableOnly: !prev.customizableOnly,
              }))
            }
            className={`min-h-9 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
              filters.customizableOnly
                ? 'bg-rose-50 border-rose-300 text-[#D9232D]'
                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Custom Fit</span>
          </button>
        </div>

        {/* ===================== DISCOVERY STATE (Empty Query & No Active Filters) ===================== */}
        {!hasActiveSearchOrFilter && (
          <div className="space-y-6 pb-4">
            {/* Recent & Trending Searches Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <section
                  aria-label="Recent searches"
                  data-purpose="recent-searches-section"
                  className="rounded-2xl border border-slate-200/80 bg-white p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#D9232D]" />
                      Recent Searches
                    </h2>
                    <button
                      type="button"
                      onClick={clearAllRecentSearches}
                      className="text-xs font-semibold text-slate-400 hover:text-[#D9232D] transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear all
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        className="group bg-slate-50 hover:bg-rose-50/60 border border-slate-200/80 hover:border-rose-200 text-slate-800 text-xs font-medium pl-3 pr-1.5 py-1 rounded-xl flex items-center gap-1 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectSearchTerm(term)}
                          className="py-0.5 text-left group-hover:text-[#D9232D] transition-colors font-medium cursor-pointer"
                        >
                          {term}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(term, e)}
                          aria-label={`Remove recent search ${term}`}
                          title={`Remove "${term}"`}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#D9232D] hover:bg-rose-100/70 transition-all cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Popular / Trending Searches */}
              <section
                aria-label="Trending searches"
                data-purpose="trending-searches-section"
                className={`rounded-2xl border border-slate-200/80 bg-white p-4 ${
                  recentSearches.length === 0 ? 'lg:col-span-2' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#D9232D]" />
                    Trending Rider Searches
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSelectSearchTerm(item)}
                      className="bg-slate-50 hover:bg-rose-50 hover:text-[#D9232D] border border-slate-200/80 hover:border-rose-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Search className="w-3 h-3 text-slate-400" />
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Find by Vehicle Brand */}
            <section aria-label="Browse by vehicle brand">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Find Seat Covers by Vehicle Brand
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tap your bike, scooter, or toto brand to see compatible fitment covers
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {QUICK_VEHICLE_BRANDS.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        vehicleBrand: brand.id,
                      }))
                    }
                    className="group flex items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 text-left transition-all hover:border-rose-200 hover:bg-rose-50/30 cursor-pointer active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 group-hover:text-[#D9232D] truncate">
                        {brand.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                        {brand.subtitle}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#D9232D] shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </section>

            {/* Popular & Recommended Seat Covers Showcase */}
            {popularShowcaseProducts.length > 0 && (
              <section aria-label="Popular seat covers">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Popular Seat Covers &amp; Cushions
                    </h2>
                    <p className="text-xs text-slate-500">
                      Most ordered workshop-fitted designs ready for pickup
                    </p>
                  </div>
                  <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200/80 shrink-0">
                    <button
                      type="button"
                      onClick={() => setLayoutMode('grid')}
                      aria-label="Grid view"
                      aria-pressed={layoutMode === 'grid'}
                      className={`min-h-9 min-w-9 grid place-items-center rounded-lg transition-all cursor-pointer ${
                        layoutMode === 'grid'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutMode('list')}
                      aria-label="List view"
                      aria-pressed={layoutMode === 'list'}
                      className={`min-h-9 min-w-9 grid place-items-center rounded-lg transition-all cursor-pointer ${
                        layoutMode === 'list'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {layoutMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {popularShowcaseProducts.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        layoutMode="grid"
                        onSelectProduct={handleProductSelect}
                        onQuickAddToCart={onQuickAddToCart}
                        onNotifyMe={onNotifyMe}
                        isInCart={isQuickAddInCart(prod)}
                        onOpenCart={onOpenCart}
                        isWishlisted={wishlist.some((w) => w.id === prod.id)}
                        onToggleWishlist={onToggleWishlist}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {popularShowcaseProducts.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        layoutMode="list"
                        onSelectProduct={handleProductSelect}
                        onQuickAddToCart={onQuickAddToCart}
                        onNotifyMe={onNotifyMe}
                        isInCart={isQuickAddInCart(prod)}
                        onOpenCart={onOpenCart}
                        isWishlisted={wishlist.some((w) => w.id === prod.id)}
                        onToggleWishlist={onToggleWishlist}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* ===================== ACTIVE SEARCH OR FILTERED RESULTS STATE ===================== */}
        {hasActiveSearchOrFilter && (
          <div>
            {/* Results Toolbar: Title, Count, Sort & View Mode */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2.5 mb-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <h1 className="text-sm font-extrabold text-slate-900 truncate">
                    {searchQuery.trim()
                      ? `Results for "${searchQuery.trim()}"`
                      : filters.vehicleBrand !== 'all'
                        ? `${filters.vehicleBrand} Compatible Covers`
                        : filters.category !== 'all'
                          ? `${SEARCH_CATEGORY_FILTERS.find((c) => c.id === filters.category)?.label || filters.category} Collection`
                          : 'Filtered Catalog'}
                  </h1>
                  <span className="text-xs font-semibold text-slate-500 tabular-nums">
                    ({filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Sort Trigger */}
                <button
                  type="button"
                  onClick={() => setIsSortModalOpen(true)}
                  aria-label="Sort search results"
                  className={`min-h-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    sortBy !== 'manual'
                      ? 'bg-rose-50 border-rose-200 text-[#D9232D]'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-700'
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{activeSortShortLabel}</span>
                </button>

                {/* View Mode Switcher */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                    aria-label="Grid view"
                    aria-pressed={layoutMode === 'grid'}
                    className={`min-h-9 min-w-9 grid place-items-center rounded-lg transition-all cursor-pointer ${
                      layoutMode === 'grid'
                        ? 'bg-white text-[#D9232D] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('list')}
                    aria-label="List view"
                    aria-pressed={layoutMode === 'list'}
                    className={`min-h-9 min-w-9 grid place-items-center rounded-lg transition-all cursor-pointer ${
                      layoutMode === 'list'
                        ? 'bg-white text-[#D9232D] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Complete Active Filter Chips Row */}
            {(activeFilterChips.length > 0 || sortBy !== 'manual') && (
              <div
                role="region"
                aria-label="Active filters"
                className="flex flex-wrap items-center gap-1.5 mb-3 px-0.5"
              >
                <span className="text-[11px] font-bold text-slate-400 mr-0.5">Active:</span>

                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilters((prev) => chip.clear(prev))}
                    aria-label={`Remove filter ${chip.label}`}
                    className="inline-flex min-h-8 items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-[#D9232D] text-[11px] font-bold border border-rose-200 transition-colors cursor-pointer"
                  >
                    <span>{chip.label}</span>
                    <X className="w-3 h-3 shrink-0" />
                  </button>
                ))}

                {sortBy !== 'manual' && (
                  <button
                    type="button"
                    onClick={() => setSortBy('manual')}
                    aria-label={`Reset sort ${SORT_LABELS[sortBy]?.label}`}
                    className="inline-flex min-h-8 items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer"
                  >
                    <span>Sort: {activeSortShortLabel}</span>
                    <X className="w-3 h-3 shrink-0" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-slate-500 hover:text-[#D9232D] ml-1 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset all</span>
                </button>
              </div>
            )}

            {/* Catalog Loading / Error / Empty States */}
            {products.length === 0 && isCatalogLoading && <CatalogStatus state="loading" />}
            {products.length === 0 && !isCatalogLoading && catalogError && (
              <CatalogStatus state="error" onRetry={onRetryCatalog} />
            )}
            {products.length === 0 && !isCatalogLoading && !catalogError && (
              <CatalogStatus state="empty" />
            )}

            {/* Matching Products or Zero-Match Recovery */}
            {products.length > 0 &&
              (filteredProducts.length === 0 ? (
                <div className="space-y-6 mt-2">
                  <div className="bg-white rounded-2xl p-6 sm:p-8 text-center border border-slate-200/80">
                    <div className="w-12 h-12 bg-rose-50 text-[#D9232D] rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Search className="w-5 h-5" />
                    </div>
                    <h2 className="text-slate-900 font-extrabold text-base mb-1">
                      No exact matches found
                    </h2>
                    <p className="text-slate-500 text-xs max-w-md mx-auto mb-4">
                      {searchQuery.trim()
                        ? `We couldn't find any seat covers matching "${searchQuery.trim()}"${
                            activeFiltersCount > 0 ? ' with your selected filters' : ''
                          }.`
                        : 'No seat covers match all of your active filter selections.'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                      {activeFiltersCount > 0 && searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="min-h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                        >
                          Clear Filters Only ({activeFiltersCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={resetSearchAndFilters}
                        className="banner-cta-shine min-h-11 bg-gradient-to-r from-[#D9232D] to-[#B91822] hover:brightness-105 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer active:scale-95 transition-all"
                      >
                        Reset Search &amp; Filters
                      </button>
                    </div>

                    {/* Try Searching For */}
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 mb-2">
                        Try searching for popular models:
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {POPULAR_SEARCHES.slice(0, 6).map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              resetAllFilters();
                              handleSelectSearchTerm(term);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-rose-200 hover:bg-rose-50 hover:text-[#D9232D] text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fallback Popular Products */}
                  {popularShowcaseProducts.length > 0 && (
                    <section aria-label="Recommended seat covers">
                      <h3 className="text-sm font-extrabold text-slate-900 mb-3">
                        Popular Seat Covers You Might Like
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {popularShowcaseProducts.slice(0, 4).map((prod) => (
                          <ProductCard
                            key={prod.id}
                            product={prod}
                            layoutMode="grid"
                            onSelectProduct={handleProductSelect}
                            onQuickAddToCart={onQuickAddToCart}
                            onNotifyMe={onNotifyMe}
                            isInCart={isQuickAddInCart(prod)}
                            onOpenCart={onOpenCart}
                            isWishlisted={wishlist.some((w) => w.id === prod.id)}
                            onToggleWishlist={onToggleWishlist}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : layoutMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      layoutMode="grid"
                      onSelectProduct={handleProductSelect}
                      onQuickAddToCart={onQuickAddToCart}
                      onNotifyMe={onNotifyMe}
                      isInCart={isQuickAddInCart(prod)}
                      onOpenCart={onOpenCart}
                      isWishlisted={wishlist.some((w) => w.id === prod.id)}
                      onToggleWishlist={onToggleWishlist}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filteredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      layoutMode="list"
                      onSelectProduct={handleProductSelect}
                      onQuickAddToCart={onQuickAddToCart}
                      onNotifyMe={onNotifyMe}
                      isInCart={isQuickAddInCart(prod)}
                      onOpenCart={onOpenCart}
                      isWishlisted={wishlist.some((w) => w.id === prod.id)}
                      onToggleWishlist={onToggleWishlist}
                    />
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Filter and Sort Modals */}
      <FilterSortModal
        isFilterOpen={isFilterModalOpen}
        onCloseFilter={() => setIsFilterModalOpen(false)}
        isSortOpen={isSortModalOpen}
        onCloseSort={() => setIsSortModalOpen(false)}
        currentSort={sortBy}
        onSelectSort={(newSort) => setSortBy(newSort)}
        filters={filters}
        onUpdateFilters={(newFilters) => setFilters(newFilters)}
        onResetFilters={resetAllFilters}
        matchingCount={filteredProducts.length}
      />
    </div>
  );
};
