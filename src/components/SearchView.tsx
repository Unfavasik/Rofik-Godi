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
  Mic,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { CatalogStatus } from './CatalogStatus';
import { FilterSortModal } from './FilterSortModal';
import { VoiceSearchBanner } from './VoiceSearchBanner';
import { VoiceSearchHint } from './VoiceSearchHint';
import type { PreferredLanguage } from '../lib/customerPreferences';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { persistRecentSearchTerms, readRecentSearchTerms } from '../lib/voiceSearch';
import { INITIAL_FILTERS, SORT_LABELS } from '../data/filterOptions';
import type { FilterState, SortOption } from '../data/filterOptions';
import {
  SEARCH_CATEGORY_FILTERS,
  countActiveSearchFilters,
  filterAndSortSearchProducts,
  getActiveFilterChips,
  getCatalogTrendingSearches,
  getContextualCategoryCounts,
  getLiveSearchSuggestions,
  getQuickVehicleBrandsWithCounts,
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
  language?: PreferredLanguage;
}

const DEFAULT_RECENT_SEARCHES = ['bike seat cover', 'waterproof cover', 'gel cushion'];

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
  language = 'en',
}) => {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState<SortOption>('manual');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Load and manage recent searches from localStorage (SSR-safe)
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    readRecentSearchTerms(DEFAULT_RECENT_SEARCHES),
  );

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
      persistRecentSearchTerms(updated);
      return updated;
    });
  };

  const voiceSearch = useVoiceSearch({
    language,
    onResult: (transcript) => {
      setSearchQuery(transcript);
      saveRecentSearch(transcript);
      searchInputRef.current?.blur();
    },
  });

  const voiceHintId = 'search-voice-search-hint';
  const showVoiceHint =
    !voiceSearch.isListening &&
    !voiceSearch.error &&
    !voiceSearch.isHintDismissed &&
    !searchQuery.trim();

  // Remove a single recent search
  const removeRecentSearch = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item.toLowerCase() !== termToRemove.toLowerCase());
      persistRecentSearchTerms(updated);
      return updated;
    });
  };

  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    persistRecentSearchTerms([]);
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
    () => getLiveSearchSuggestions(searchQuery, recentSearches, products, 5),
    [searchQuery, recentSearches, products],
  );

  // Contextual category counts based on current query & non-category filters
  const categoryCounts = useMemo(
    () => getContextualCategoryCounts(products, searchQuery, filters),
    [products, searchQuery, filters],
  );

  // Show only categories that actually have items (or 'all', or the currently selected tab)
  const visibleCategoryFilters = useMemo(
    () =>
      SEARCH_CATEGORY_FILTERS.filter(
        (cat) => cat.id === 'all' || (categoryCounts[cat.id] ?? 0) > 0 || filters.category === cat.id,
      ),
    [categoryCounts, filters.category],
  );

  // Catalog-backed trending searches & quick vehicle brands
  const trendingSearches = useMemo(() => getCatalogTrendingSearches(products, 8), [products]);
  const quickVehicleBrands = useMemo(() => getQuickVehicleBrandsWithCounts(products), [products]);

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
    <div className="flex-1 flex w-full max-w-full flex-col overflow-x-hidden bg-[#FFFCF4] pb-[max(2.5rem,env(safe-area-inset-bottom))] min-h-dvh text-[#2B1611]">
      {/* Compact Sticky Top Search Bar (Under 15% Mobile Viewport Cap) */}
      <div className="sticky top-0 z-30 border-b border-[#E8D8C4] bg-[#FFFCF4]/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBackToHome}
              aria-label="Go back"
              title="Go back"
              type="button"
              className="min-h-11 min-w-11 rounded-full border border-[#E8D8C4] bg-[#FFF8D6]/60 hover:bg-[#FFF1A6]/70 flex items-center justify-center text-[#2B1611] transition-colors active:scale-95 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1 flex items-center">
              <Search className="w-4 h-4 text-[#8A6C63] absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search seat covers, vehicle models, or cushions"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (searchQuery) {
                      setSearchQuery('');
                    } else {
                      searchInputRef.current?.blur();
                    }
                  }
                }}
                placeholder="Search by bike model, seat cover, or cushion..."
                className={`min-h-11 w-full bg-white hover:bg-[#FFF8D6]/40 focus:bg-white border border-[#E8D8C4] focus:border-[#6B352A] focus:ring-2 focus:ring-[#6B352A]/15 rounded-2xl pl-10 ${
                  searchQuery ? 'pr-22' : 'pr-12'
                } py-2 text-base sm:text-[13.5px] font-medium text-[#2B1611] placeholder:text-[#8A6C63] focus:outline-hidden transition-all`}
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
                    className="absolute right-10 flex h-9 w-9 items-center justify-center text-[#8A6C63] hover:text-[#6B352A] rounded-xl hover:bg-[#FFF8D6] transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={voiceSearch.toggleListening}
                aria-label={voiceSearch.isListening ? 'Stop voice search' : 'Start voice search'}
                aria-pressed={voiceSearch.isListening}
                aria-describedby={showVoiceHint ? voiceHintId : undefined}
                title={
                  voiceSearch.isListening
                    ? 'Stop voice search'
                    : voiceSearch.isSupported
                      ? 'Search by voice'
                      : 'Voice search unavailable in this browser'
                }
                className={`absolute right-1 flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  voiceSearch.isListening
                    ? 'voice-mic-pulse bg-[#6B352A] text-[#FFFCF4] shadow-xs'
                    : 'text-[#6B4C44] hover:text-[#6B352A] hover:bg-[#FFF8D6]'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </form>

            {/* Always-Accessible Filter Button in Header */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              aria-label="Open product filters"
              className={`min-h-11 shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                activeFiltersCount > 0
                  ? 'bg-[#FFF1A6] border-[#E6CE73] text-[#6B352A]'
                  : 'bg-white hover:bg-[#FFF8D6] border-[#E8D8C4] text-[#4A2B23]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-[#6B352A] text-[#FFFCF4] text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          <VoiceSearchHint
            id={voiceHintId}
            visible={showVoiceHint}
            onDismiss={voiceSearch.dismissHint}
            alignClassName="pr-12 sm:pr-24"
          />

          <VoiceSearchBanner
            isListening={voiceSearch.isListening}
            interimTranscript={voiceSearch.interimTranscript}
            error={voiceSearch.error}
            onStop={voiceSearch.stopListening}
            onDismissError={voiceSearch.clearError}
          />
        </div>
      </div>

      {/* Scrollable Main Content Container */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-3">
        {/* Live Autocomplete Suggestions While Typing */}
        {liveSuggestions.length > 0 && (
          <div
            role="region"
            aria-label="Search suggestions"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-1"
          >
            <span className="text-[11px] font-semibold text-[#8A6C63] shrink-0 mr-0.5">
              Suggestions:
            </span>
            {liveSuggestions.map((item) => (
              <button
                key={`${item.kind}-${item.term}`}
                type="button"
                onClick={() => handleSelectSearchTerm(item.term)}
                className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-xl border border-[#E8D8C4] bg-white hover:border-[#E6CE73] hover:bg-[#FFF8D6] px-2.5 py-1 text-[11px] font-semibold text-[#4A2B23] hover:text-[#6B352A] transition-colors whitespace-nowrap cursor-pointer"
              >
                {item.kind === 'recent' ? (
                  <Clock className="w-3 h-3 text-[#8A6C63] shrink-0" />
                ) : item.kind === 'vehicle' ? (
                  <Bike className="w-3 h-3 text-[#6B352A] shrink-0" />
                ) : (
                  <Search className="w-3 h-3 text-[#8A6C63] shrink-0" />
                )}
                <span>{item.term}</span>
              </button>
            ))}
          </div>
        )}

        {/* Contextual Category & Attribute Controls */}
        <div className="space-y-2 mb-3.5">
          {visibleCategoryFilters.length > 1 && (
            <nav
              aria-label="Filter by product category"
              className="flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar"
            >
              {visibleCategoryFilters.map((cat) => {
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
                    className={`min-h-9 shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[#6B352A] border-[#6B352A] text-[#FFFCF4]'
                        : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10.5px] font-semibold tabular-nums ${
                        isSelected ? 'text-[#FFF1A6]' : 'text-[#8A6C63]'
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Quick One-Tap Attribute Filter Bar */}
          <div
            role="group"
            aria-label="Quick attribute filters"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
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
                  ? 'bg-[#FFF1A6] border-[#E6CE73] text-[#6B352A]'
                  : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#6B4C44]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6B352A] shrink-0" />
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
                  ? 'bg-[#FFF1A6] border-[#E6CE73] text-[#6B352A]'
                  : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#6B4C44]'
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-[#6B352A] shrink-0" />
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
                  ? 'bg-[#FFF1A6] border-[#E6CE73] text-[#6B352A]'
                  : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#6B4C44]'
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
                  ? 'bg-[#FFF1A6] border-[#E6CE73] text-[#6B352A]'
                  : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#6B4C44]'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-[#FF6115] text-[#FF6115] shrink-0" />
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
                  ? 'bg-[#FFF1A6] border-[#E6CE73] text-[#6B352A]'
                  : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#6B4C44]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#FF6115] shrink-0" />
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
                  ? 'bg-[#FFF1A6] border-[#E6CE73] text-[#6B352A]'
                  : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#6B4C44]'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-[#6B352A] shrink-0" />
              <span>Custom Fit</span>
            </button>
          </div>
        </div>

        {/* ===================== DISCOVERY STATE (Empty Query & No Active Filters) ===================== */}
        {!hasActiveSearchOrFilter && (
          <div className="space-y-5 pb-4">
            {/* Unified Recent + Trending Search Panel */}
            <div className="rounded-2xl border border-[#E8D8C4] bg-white divide-y lg:divide-y-0 lg:divide-x divide-[#F4EAE0] grid grid-cols-1 lg:grid-cols-2">
              {recentSearches.length > 0 && (
                <section
                  aria-label="Recent searches"
                  data-purpose="recent-searches-section"
                  className="p-3.5 sm:p-4"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-xs font-bold text-[#2B1611] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#6B352A]" />
                      Recent Searches
                    </h2>
                    <button
                      type="button"
                      onClick={clearAllRecentSearches}
                      className="text-xs font-semibold text-[#8A6C63] hover:text-[#6B352A] transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear all
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        className="group bg-[#FFFCF4] hover:bg-[#FFF8D6] border border-[#E8D8C4] hover:border-[#E6CE73] text-[#2B1611] text-xs font-medium pl-2.5 pr-1 py-0.5 rounded-xl flex items-center gap-0.5 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectSearchTerm(term)}
                          className="py-1 text-left group-hover:text-[#6B352A] transition-colors font-medium cursor-pointer"
                        >
                          {term}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(term, e)}
                          aria-label={`Remove recent search ${term}`}
                          title={`Remove "${term}"`}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#8A6C63] hover:text-[#6B352A] hover:bg-[#FFF1A6] transition-all cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section
                aria-label="Trending searches"
                data-purpose="trending-searches-section"
                className={`p-3.5 sm:p-4 ${recentSearches.length === 0 ? 'lg:col-span-2' : ''}`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-xs font-bold text-[#2B1611] flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#6B352A]" />
                    Popular Searches
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {trendingSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSelectSearchTerm(item)}
                      className="bg-[#FFFCF4] hover:bg-[#FFF8D6] hover:text-[#6B352A] border border-[#E8D8C4] hover:border-[#E6CE73] text-[#4A2B23] text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Search className="w-3 h-3 text-[#8A6C63]" />
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Find by Vehicle Brand (Only Catalog-Backed Brands) */}
            {quickVehicleBrands.length > 0 && (
              <section aria-label="Browse by vehicle brand">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <h2 className="text-sm font-extrabold text-[#2B1611]">
                    Shop by Vehicle Brand
                  </h2>
                  <span className="text-[11px] font-medium text-[#6B4C44]">
                    Verified fitment models
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {quickVehicleBrands.map((brand) => (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          vehicleBrand: brand.id,
                        }))
                      }
                      className="group flex items-center justify-between gap-2 rounded-xl border border-[#E8D8C4] bg-white px-3 py-2.5 text-left transition-all hover:border-[#E6CE73] hover:bg-[#FFF8D6]/50 cursor-pointer active:scale-[0.99]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#2B1611] group-hover:text-[#6B352A] truncate">
                          {brand.label}
                        </p>
                        <p className="text-[11px] text-[#6B4C44] truncate tabular-nums">
                          {brand.matchCount} {brand.matchCount === 1 ? 'cover' : 'covers'} ·{' '}
                          {brand.subtitle}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#8A6C63] group-hover:text-[#6B352A] shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Popular & Recommended Seat Covers Showcase */}
            {popularShowcaseProducts.length > 0 && (
              <section aria-label="Popular seat covers">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#2B1611]">
                      Popular Seat Covers &amp; Cushions
                    </h2>
                    <p className="text-xs text-[#6B4C44]">
                      Workshop-fitted bestsellers ready for pickup
                    </p>
                  </div>
                  <div className="flex items-center bg-white p-0.5 rounded-xl border border-[#E8D8C4] shrink-0">
                    <button
                      type="button"
                      onClick={() => setLayoutMode('grid')}
                      aria-label="Grid view"
                      aria-pressed={layoutMode === 'grid'}
                      className={`min-h-9 min-w-9 grid place-items-center rounded-lg transition-all cursor-pointer ${
                        layoutMode === 'grid'
                          ? 'bg-[#6B352A] text-[#FFFCF4]'
                          : 'text-[#6B4C44] hover:text-[#2B1611]'
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
                          ? 'bg-[#6B352A] text-[#FFFCF4]'
                          : 'text-[#6B4C44] hover:text-[#2B1611]'
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
            {/* Clean Results Toolbar (Hairline Divider instead of Nested Card) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#E8D8C4]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <h1 className="text-sm sm:text-base font-extrabold text-[#2B1611] truncate">
                    {searchQuery.trim()
                      ? `Results for "${searchQuery.trim()}"`
                      : filters.vehicleBrand !== 'all'
                        ? `${filters.vehicleBrand} Compatible Covers`
                        : filters.category !== 'all'
                          ? `${SEARCH_CATEGORY_FILTERS.find((c) => c.id === filters.category)?.label || filters.category} Collection`
                          : 'Filtered Catalog'}
                  </h1>
                  <span className="text-xs font-semibold text-[#6B4C44] tabular-nums">
                    · {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
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
                      ? 'bg-[#FFF1A6] border-[#E6CE73] text-[#6B352A]'
                      : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{activeSortShortLabel}</span>
                </button>

                {/* View Mode Switcher */}
                <div className="flex items-center bg-white p-0.5 rounded-xl border border-[#E8D8C4]">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                    aria-label="Grid view"
                    aria-pressed={layoutMode === 'grid'}
                    className={`min-h-9 min-w-9 grid place-items-center rounded-lg transition-all cursor-pointer ${
                      layoutMode === 'grid'
                        ? 'bg-[#6B352A] text-[#FFFCF4]'
                        : 'text-[#6B4C44] hover:text-[#2B1611]'
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
                        ? 'bg-[#6B352A] text-[#FFFCF4]'
                        : 'text-[#6B4C44] hover:text-[#2B1611]'
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
                className="flex flex-wrap items-center gap-1.5 mb-3"
              >
                <span className="text-[11px] font-bold text-[#8A6C63] mr-0.5">Active:</span>

                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilters((prev) => chip.clear(prev))}
                    aria-label={`Remove filter ${chip.label}`}
                    className="inline-flex min-h-8 items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FFF1A6] hover:bg-[#FFE980] text-[#6B352A] text-[11px] font-bold border border-[#E6CE73] transition-colors cursor-pointer"
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
                    className="inline-flex min-h-8 items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-[#FFF8D6] text-[#4A2B23] text-[11px] font-bold border border-[#E8D8C4] transition-colors cursor-pointer"
                  >
                    <span>Sort: {activeSortShortLabel}</span>
                    <X className="w-3 h-3 shrink-0" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-[#6B4C44] hover:text-[#6B352A] ml-1 px-2 py-1 rounded-lg hover:bg-[#FFF8D6] cursor-pointer flex items-center gap-1 transition-colors"
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
                  <div className="bg-white rounded-2xl p-6 sm:p-8 text-center border border-[#E8D8C4]">
                    <div className="w-12 h-12 bg-[#FFF1A6] text-[#6B352A] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#E6CE73]">
                      <Search className="w-5 h-5" />
                    </div>
                    <h2 className="text-[#2B1611] font-extrabold text-base mb-1">
                      No exact matches found
                    </h2>
                    <p className="text-[#6B4C44] text-xs max-w-md mx-auto mb-4">
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
                          className="min-h-11 bg-[#FFF8D6] hover:bg-[#FFF1A6] border border-[#E6CE73] text-[#6B352A] text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                        >
                          Clear Filters Only ({activeFiltersCount})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={resetSearchAndFilters}
                        className="banner-cta-shine min-h-11 bg-[#6B352A] hover:bg-[#53271E] text-[#FFFCF4] text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer active:scale-95 transition-all"
                      >
                        Reset Search &amp; Filters
                      </button>
                    </div>

                    {/* Try Searching For */}
                    <div className="mt-5 pt-4 border-t border-[#F4EAE0]">
                      <p className="text-[11px] font-bold text-[#8A6C63] mb-2">
                        Try searching for popular models:
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {trendingSearches.slice(0, 6).map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              resetAllFilters();
                              handleSelectSearchTerm(term);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-[#E8D8C4] bg-[#FFFCF4] hover:border-[#E6CE73] hover:bg-[#FFF8D6] hover:text-[#6B352A] text-xs font-semibold text-[#4A2B23] transition-colors cursor-pointer"
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
                      <h3 className="text-sm font-extrabold text-[#2B1611] mb-3">
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
        products={products}
        searchQuery={searchQuery}
      />
    </div>
  );
};
