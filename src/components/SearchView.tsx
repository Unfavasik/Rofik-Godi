import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  TrendingUp,
  Sparkles,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, VehicleCategory } from '../types';
import { ProductCard } from './ProductCard';
import {
  FilterSortModal,
  FilterState,
  INITIAL_FILTERS,
  SortOption,
  SORT_LABELS,
} from './FilterSortModal';

interface SearchViewProps {
  products: Product[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectProduct: (p: Product) => void;
  onQuickAddToCart: (p: Product, e: React.MouseEvent) => void;
  wishlist: Product[];
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
  justAddedId: string | null;
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

export const SearchView: React.FC<SearchViewProps> = ({
  products,
  searchQuery,
  setSearchQuery,
  onSelectProduct,
  onQuickAddToCart,
  wishlist,
  onToggleWishlist,
  justAddedId,
  onBackToHome,
}) => {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('list');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Load and manage recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
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
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Error saving recent searches to localStorage:', err);
      }
      return updated;
    });
  };

  // Remove a single recent search
  const removeRecentSearch = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item.toLowerCase() !== termToRemove.toLowerCase());
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Error updating recent searches:', err);
      }
      return updated;
    });
  };

  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (err) {
      console.warn('Error clearing recent searches:', err);
    }
  };

  // Handle clicking a recent search tag
  const handleSelectRecentSearch = (term: string) => {
    setSearchQuery(term);
    saveRecentSearch(term);
    setLayoutMode('list');
  };

  // Handle clicking a trending search tag
  const handleSelectTrendingSearch = (term: string) => {
    setSearchQuery(term);
    saveRecentSearch(term);
    setLayoutMode('list');
  };

  // Handle search form submission (Enter key / Search button)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      setLayoutMode('list');
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

  // Quick matching recent searches when typing
  const matchingRecentSearches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return recentSearches.filter(
      (term) => term.toLowerCase().includes(q) && term.toLowerCase() !== q
    );
  }, [searchQuery, recentSearches]);

  // Compute active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'all') count += 1;
    if (filters.priceRange !== 'all' || filters.maxPrice < 2000) count += 1;
    if (filters.waterproofOnly) count += 1;
    if (filters.bestsellerOnly) count += 1;
    if (filters.inStockOnly) count += 1;
    if (filters.customizableOnly) count += 1;
    if (filters.minRating > 0) count += 1;
    if (filters.vehicleBrand !== 'all') count += 1;
    return count;
  }, [filters]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // 1. Filter
    let list = products.filter((p) => {
      // Category filter
      if (filters.category !== 'all' && p.category !== filters.category) {
        return false;
      }

      // Search query filter
      if (q) {
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesSubtitle = p.subtitle?.toLowerCase().includes(q);
        const matchesCategoryLabel = p.categoryLabel.toLowerCase().includes(q);
        const matchesBadge = p.badge?.toLowerCase().includes(q);
        const matchesCompatibility = p.compatibility.some((c) => c.toLowerCase().includes(q));
        const matchesMaterials = p.materials?.some((m) => m.toLowerCase().includes(q));

        if (
          !matchesTitle &&
          !matchesSubtitle &&
          !matchesCategoryLabel &&
          !matchesBadge &&
          !matchesCompatibility &&
          !matchesMaterials
        ) {
          return false;
        }
      }

      // Price filter
      if (filters.priceRange === 'under_300' && p.price >= 300) return false;
      if (filters.priceRange === '300_600' && (p.price < 300 || p.price > 600)) return false;
      if (filters.priceRange === '600_1000' && (p.price < 600 || p.price > 1000)) return false;
      if (filters.priceRange === 'above_1000' && p.price <= 1000) return false;
      if (p.price > filters.maxPrice) return false;

      // Feature toggles
      if (filters.waterproofOnly && !p.isWaterproof) return false;
      if (filters.bestsellerOnly && !p.isBestseller && p.badge !== 'Bestseller') return false;
      if (filters.inStockOnly && !p.inStock) return false;
      if (filters.customizableOnly && !p.isCustomizable) return false;

      // Rating filter
      if (filters.minRating > 0 && p.rating < filters.minRating) return false;

      // Vehicle Brand filter
      if (filters.vehicleBrand !== 'all') {
        const brandQuery = filters.vehicleBrand.toLowerCase();
        const matchesBrand =
          p.compatibility.some((c) => c.toLowerCase().includes(brandQuery)) ||
          p.title.toLowerCase().includes(brandQuery) ||
          p.category.toLowerCase().includes(brandQuery);
        if (!matchesBrand) return false;
      }

      return true;
    });

    // 2. Sort
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating || b.reviewCount - a.reviewCount;
        case 'newest':
          return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        case 'discount': {
          const discA = ((a.originalPrice - a.price) / a.originalPrice) * 100;
          const discB = ((b.originalPrice - b.price) / b.originalPrice) * 100;
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
  }, [searchQuery, filters, sortBy, products]);

  // Quick reset all filters
  const resetAllFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="flex-1 flex flex-col bg-white px-4 pt-3 pb-8 min-h-screen">
      {/* Top Search Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <button
          onClick={onBackToHome}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#111827] transition-colors active:scale-95 flex-shrink-0 cursor-pointer"
          title="Back to Home"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-[#F8F9FB] hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-[#D9232D] rounded-full pl-10 pr-9 py-3 text-[13px] font-medium text-slate-900 placeholder:text-[#64748B] focus:outline-hidden transition-all shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
            enterKeyHint="search"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-slate-200/60 transition-all cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* Quick matching recent suggestions when typing */}
      {matchingRecentSearches.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2">
          <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3 text-[#D9232D]" />
            Recent:
          </span>
          {matchingRecentSearches.slice(0, 3).map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleSelectRecentSearch(term)}
              className="bg-red-50/70 hover:bg-red-100/80 text-[#D9232D] text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-red-200/60 transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Filter Category Pills */}
      {searchQuery && <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2">
        {[
          { id: 'all', label: 'All (42)' },
          { id: 'bike', label: 'Bike (18)' },
          { id: 'toto', label: 'Toto (12)' },
          { id: 'cushion', label: 'Cushion (8)' },
          { id: 'scooter', label: 'Accessories' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                category: f.id as any,
              }))
            }
            className={`px-4 py-2 rounded-full text-[11px] font-bold tracking-tight whitespace-nowrap transition-all cursor-pointer ${
              filters.category === f.id
                ? 'bg-[#D9232D] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>}

      {/* When Search Query is Empty (Screen 1): Show Recent Searches & Trending Searches */}
      {!searchQuery && activeFiltersCount === 0 && (
        <div className="space-y-4 mb-4">
          {/* Recent Searches Section (Screen 1) */}
          {recentSearches.length > 0 && (
            <div data-purpose="recent-searches-section">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#D9232D]" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearAllRecentSearches}
                  className="text-[11.5px] font-semibold text-gray-400 hover:text-[#D9232D] transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    onClick={() => handleSelectRecentSearch(term)}
                    className="group bg-white hover:bg-red-50/60 border border-slate-200/90 hover:border-red-200 text-slate-800 text-[12px] font-medium pl-3 pr-2 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer select-none active:scale-95"
                  >
                    <Clock className="w-3 h-3 text-gray-400 group-hover:text-[#D9232D] transition-colors" />
                    <span className="group-hover:text-[#D9232D] transition-colors font-medium">{term}</span>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(term, e)}
                      title={`Remove "${term}"`}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-[#D9232D] hover:bg-red-100/80 transition-all ml-0.5 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches Section */}
          <div data-purpose="trending-searches-section">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#D9232D]" />
                Trending Searches
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectTrendingSearch(item)}
                  className="bg-slate-50 hover:bg-red-50 hover:text-[#D9232D] border border-slate-200/80 hover:border-red-200 text-slate-700 text-[11.5px] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== SORT & FILTER ACTION BAR ===================== */}
      <div className={`${searchQuery ? '' : 'hidden'} bg-white border border-slate-200/90 rounded-2xl p-2.5 mb-3 shadow-2xs`}>
        <div className="flex items-center justify-between gap-2">
          {/* Left: Sort & Filter Buttons */}
          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer border ${
                activeFiltersCount > 0
                  ? 'bg-red-50 border-red-300 text-[#D9232D]'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#D9232D] text-white text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Button */}
            <button
              type="button"
              onClick={() => setIsSortModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer border ${
                sortBy !== 'popular'
                  ? 'bg-red-50 border-red-300 text-[#D9232D]'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="truncate max-w-[110px] sm:max-w-[160px]">
                {sortBy === 'popular'
                  ? 'Sort'
                  : sortBy === 'price_asc'
                  ? 'Price: Low'
                  : sortBy === 'price_desc'
                  ? 'Price: High'
                  : sortBy === 'rating'
                  ? 'Top Rated'
                  : sortBy === 'newest'
                  ? 'New Arrivals'
                  : 'Discount'}
              </span>
            </button>
          </div>

          {/* Right: Results Count + View Mode Toggle (Grid vs List - Matches Screen 2 & Screen 3) */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-bold text-gray-500 hidden sm:inline">
{searchQuery ? '42 products found' : `${filteredProducts.length} products found`}
            </span>

            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-white text-[#D9232D] shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Grid view (Screen 2)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('list')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  layoutMode === 'list'
                    ? 'bg-white text-[#D9232D] shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="List view (Screen 3)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick One-Tap Filter Chips Row */}
        <div className="hidden">
          {/* Waterproof Toggle */}
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                waterproofOnly: !prev.waterproofOnly,
              }))
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer border ${
              filters.waterproofOnly
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Droplets className="w-3 h-3" />
            <span>Waterproof</span>
            {filters.waterproofOnly && <X className="w-2.5 h-2.5 ml-0.5" />}
          </button>

          {/* 4.5+ Rating Toggle */}
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                minRating: prev.minRating === 4.5 ? 0 : 4.5,
              }))
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer border ${
              filters.minRating === 4.5
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>4.5★+</span>
            {filters.minRating === 4.5 && <X className="w-2.5 h-2.5 ml-0.5" />}
          </button>

          {/* Bestseller Toggle */}
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                bestsellerOnly: !prev.bestsellerOnly,
              }))
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer border ${
              filters.bestsellerOnly
                ? 'bg-[#D9232D] border-[#D9232D] text-white'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Bestseller</span>
            {filters.bestsellerOnly && <X className="w-2.5 h-2.5 ml-0.5" />}
          </button>

          {/* In Stock Toggle */}
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                inStockOnly: !prev.inStockOnly,
              }))
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer border ${
              filters.inStockOnly
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>In Stock</span>
            {filters.inStockOnly && <X className="w-2.5 h-2.5 ml-0.5" />}
          </button>

          {/* Under ₹500 */}
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                priceRange: prev.priceRange === 'under_300' || prev.maxPrice === 500 ? 'all' : 'custom',
                maxPrice: prev.maxPrice === 500 ? 2000 : 500,
              }))
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer border ${
              filters.maxPrice === 500
                ? 'bg-[#D9232D] border-[#D9232D] text-white'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <span>Under ₹500</span>
            {filters.maxPrice === 500 && <X className="w-2.5 h-2.5 ml-0.5" />}
          </button>

          {/* Customizable */}
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                customizableOnly: !prev.customizableOnly,
              }))
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer border ${
              filters.customizableOnly
                ? 'bg-purple-600 border-purple-600 text-white'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Scissors className="w-3 h-3" />
            <span>Custom Fit</span>
            {filters.customizableOnly && <X className="w-2.5 h-2.5 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Active Filter Chips & Clear Action */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3 px-1">
          <span className="text-[11px] font-bold text-gray-400">Active:</span>

          {filters.category !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-[#D9232D] text-[11px] font-bold border border-red-200">
              {filters.category.toUpperCase()}
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, category: 'all' }))}
                className="hover:text-red-800 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.maxPrice < 2000 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-[#D9232D] text-[11px] font-bold border border-red-200">
              Up to ₹{filters.maxPrice}
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, maxPrice: 2000, priceRange: 'all' }))}
                className="hover:text-red-800 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.vehicleBrand !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-[#D9232D] text-[11px] font-bold border border-red-200">
              {filters.vehicleBrand}
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, vehicleBrand: 'all' }))}
                className="hover:text-red-800 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={resetAllFilters}
            className="text-[11px] font-bold text-gray-500 hover:text-[#D9232D] ml-1 underline cursor-pointer flex items-center gap-0.5"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Clear all
          </button>
        </div>
      )}

      {/* Results Header */}
      <div className={`${searchQuery ? '' : 'hidden'} flex justify-between items-center mb-2 px-1`}>
        <div className="flex items-center gap-1.5">
          <span className="text-[13.5px] font-black text-gray-900">
            {searchQuery ? `"${searchQuery}"` : filters.category !== 'all' ? `${filters.category.toUpperCase()} Collection` : 'All Products'}
          </span>
          <span className="text-[11.5px] font-semibold text-gray-400">
            ({filteredProducts.length} items)
          </span>
        </div>

        {sortBy !== 'popular' && (
          <span className="text-[10.5px] font-bold text-[#D9232D] bg-red-50 px-2 py-0.5 rounded-md border border-red-200/60">
            Sorted by: {SORT_LABELS[sortBy]?.label.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Products Display (Grid or List - Matches Screen 2 & Screen 3) */}
      {searchQuery && (filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-xs mt-3">
          <div className="w-12 h-12 bg-red-50 text-[#D9232D] rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-gray-800 font-bold text-[14px] mb-1">
            No seat covers match your filter
          </p>
          <p className="text-gray-400 text-[12px] mb-4">
            Try adjusting your search keywords, price range, or clearing filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              resetAllFilters();
            }}
            className="bg-[#D9232D] hover:bg-red-700 text-white text-[12px] font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Reset Filters & Search
          </button>
        </div>
      ) : layoutMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {filteredProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              layoutMode="grid"
              onSelectProduct={handleProductSelect}
              onQuickAddToCart={onQuickAddToCart}
              isWishlisted={wishlist.some((w) => w.id === prod.id)}
              onToggleWishlist={onToggleWishlist}
              isAddedJustNow={justAddedId === prod.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              layoutMode="list"
              onSelectProduct={handleProductSelect}
              onQuickAddToCart={onQuickAddToCart}
              isWishlisted={wishlist.some((w) => w.id === prod.id)}
              onToggleWishlist={onToggleWishlist}
              isAddedJustNow={justAddedId === prod.id}
            />
          ))}
        </div>
      ))}

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
