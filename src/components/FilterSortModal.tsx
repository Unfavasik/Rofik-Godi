import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Droplets,
  Star,
  Flame,
  CheckCircle2,
  Scissors,
} from 'lucide-react';
import { INITIAL_FILTERS, SORT_LABELS } from '../data/filterOptions';
import type { FilterState, SortOption } from '../data/filterOptions';
import type { Product } from '../types';
import { filterAndSortSearchProducts } from '../lib/searchProducts';
export { INITIAL_FILTERS, SORT_LABELS } from '../data/filterOptions';
export type { FilterState, SortOption } from '../data/filterOptions';

interface FilterSortModalProps {
  isFilterOpen: boolean;
  onCloseFilter: () => void;
  isSortOpen: boolean;
  onCloseSort: () => void;
  currentSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
  filters: FilterState;
  onUpdateFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
  matchingCount: number;
  products?: Product[];
  searchQuery?: string;
}

export const FilterSortModal: React.FC<FilterSortModalProps> = ({
  isFilterOpen,
  onCloseFilter,
  isSortOpen,
  onCloseSort,
  currentSort,
  onSelectSort,
  filters,
  onUpdateFilters,
  onResetFilters,
  matchingCount,
  products,
  searchQuery = '',
}) => {
  // Temporary state for the filter modal before applying
  const [draftFilters, setDraftFilters] = React.useState<FilterState>(filters);

  // Sync draft filters when modal opens
  React.useEffect(() => {
    if (isFilterOpen) {
      setDraftFilters(filters);
    }
  }, [isFilterOpen, filters]);

  const draftMatchingCount = React.useMemo(() => {
    if (!products) return matchingCount;
    return filterAndSortSearchProducts(products, searchQuery, draftFilters, currentSort).length;
  }, [products, searchQuery, draftFilters, currentSort, matchingCount]);

  const handleApply = () => {
    onUpdateFilters(draftFilters);
    onCloseFilter();
  };

  const handleReset = () => {
    setDraftFilters(INITIAL_FILTERS);
    onResetFilters();
  };

  const VEHICLE_BRANDS_LIST = [
    { id: 'all', label: 'All Brands' },
    { id: 'Hero', label: 'Hero (Splendor, HF...)' },
    { id: 'Bajaj', label: 'Bajaj (Pulsar, Platina...)' },
    { id: 'Honda', label: 'Honda (Activa, Shine...)' },
    { id: 'Royal Enfield', label: 'Royal Enfield (Classic 350)' },
    { id: 'Toto', label: 'Toto / E-Rickshaw' },
    { id: 'TVS', label: 'TVS (Apache, Jupiter)' },
    { id: 'Yamaha', label: 'Yamaha (FZ, MT-15)' },
  ];

  return (
    <>
      {/* ===================== SORT BOTTOM SHEET / MODAL ===================== */}
      <AnimatePresence>
        {isSortOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseSort}
              className="fixed inset-0 bg-[#1F0E0A]/60 backdrop-blur-xs"
            />

            {/* Content Sheet */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative w-full max-w-full sm:max-w-md bg-[#FFFCF4] border border-[#E8D8C4] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden overflow-x-hidden text-[#2B1611] max-h-[85dvh]"
            >
              {/* Sheet Grab Handle on Mobile */}
              <div className="sm:hidden w-12 h-1.5 bg-[#E8D8C4] rounded-full mx-auto mt-3 mb-1 shrink-0" />

              {/* Header */}
              <div className="flex shrink-0 justify-between items-center gap-3 px-5 py-3.5 border-b border-[#E8D8C4] bg-white">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-[#FFF1A6] flex items-center justify-center text-[#6B352A]">
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-black text-[#2B1611] leading-tight truncate">
                      Sort Products
                    </h3>
                    <p className="text-[11px] text-[#8A6C63] font-medium truncate">
                      Select how you want to order results
                    </p>
                  </div>
                </div>
                <button
                  onClick={onCloseSort}
                  aria-label="Close sort options"
                  className="min-h-11 min-w-11 shrink-0 rounded-full bg-[#FFF8D6] hover:bg-[#FFF1A6] text-[#6B352A] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Options List */}
              <div className="min-h-0 min-w-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-x-hidden overflow-y-auto space-y-1.5">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => {
                  const isSelected = currentSort === opt;
                  const item = SORT_LABELS[opt];

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onSelectSort(opt);
                        onCloseSort();
                      }}
                      className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between border cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF8D6] border-[#6B352A] text-[#6B352A] shadow-2xs'
                          : 'bg-white hover:bg-[#FFF8D6]/50 border-[#E8D8C4] text-[#2B1611]'
                      }`}
                    >
                      <div className="pr-3">
                        <div className="text-[13px] font-bold leading-snug flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {opt === 'popular' && (
                            <span className="text-[9px] font-black bg-[#FFF1A6] text-[#6B352A] px-1.5 py-0.5 rounded-full uppercase border border-[#E6CE73]">
                              HOT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8A6C63] mt-0.5">{item.desc}</div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                          isSelected
                            ? 'bg-[#6B352A] border-[#6B352A] text-[#FFFCF4]'
                            : 'border-[#D4C0AA] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== FILTER BOTTOM SHEET / MODAL ===================== */}
      <AnimatePresence>
        {isFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseFilter}
              className="fixed inset-0 bg-[#1F0E0A]/60 backdrop-blur-xs"
            />

            {/* Filter Drawer / Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative w-full max-w-full sm:max-w-lg bg-[#FFFCF4] border border-[#E8D8C4] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden overflow-x-hidden text-[#2B1611] max-h-[90dvh]"
            >
              {/* Mobile grab bar */}
              <div className="sm:hidden w-12 h-1.5 bg-[#E8D8C4] rounded-full mx-auto mt-3 mb-1 shrink-0" />

              {/* Modal Header */}
              <div className="flex shrink-0 justify-between items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-[#E8D8C4] bg-white sticky top-0 z-10">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-[#FFF1A6] flex items-center justify-center text-[#6B352A]">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-black text-[#2B1611] leading-tight truncate">
                      Filter Products
                    </h3>
                    <p className="text-[11px] text-[#8A6C63] font-medium truncate">
                      Refine by vehicle, price, features & rating
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="min-h-11 text-[11.5px] font-bold text-[#6B4C44] hover:text-[#6B352A] transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#FFF8D6] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    onClick={onCloseFilter}
                    aria-label="Close filter options"
                    className="min-h-11 min-w-11 rounded-full bg-[#FFF8D6] hover:bg-[#FFF1A6] text-[#6B352A] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Body with Scrollable Categories */}
              <div className="min-h-0 min-w-0 flex-1 p-4 sm:p-5 overflow-x-hidden overflow-y-auto space-y-5 text-[13px]">
                {/* 1. Category Selection */}
                <div>
                  <label className="block text-[12px] font-black text-[#2B1611] uppercase tracking-wider mb-2.5">
                    Vehicle Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'All Items' },
                      { id: 'bike', label: 'Bike Covers' },
                      { id: 'toto', label: 'Toto Covers' },
                      { id: 'cushion', label: 'Gel Cushions' },
                      { id: 'scooter', label: 'Scooter Covers' },
                      { id: 'accessory', label: 'Accessories' },
                    ].map((cat) => {
                      const isSel = draftFilters.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              category: cat.id as FilterState['category'],
                            }))
                          }
                          className={`py-2 px-2.5 text-center text-[12px] font-bold rounded-xl border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#6B352A] border-[#6B352A] text-[#FFFCF4] shadow-xs'
                              : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Quick Price Ranges */}
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <label className="text-[12px] font-black text-[#2B1611] uppercase tracking-wider">
                      Price Range
                    </label>
                    <span className="text-[11.5px] font-bold text-[#6B352A]">
                      {draftFilters.priceRange === 'all' || draftFilters.priceRange === 'custom'
                        ? `Up to ₹${draftFilters.maxPrice}`
                        : draftFilters.priceRange === 'under_300'
                        ? 'Under ₹300'
                        : draftFilters.priceRange === '300_600'
                        ? '₹300 - ₹600'
                        : draftFilters.priceRange === '600_1000'
                        ? '₹600 - ₹1,000'
                        : 'Above ₹1,000'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {[
                      { id: 'all', label: 'All Prices' },
                      { id: 'under_300', label: 'Under ₹300' },
                      { id: '300_600', label: '₹300 - ₹600' },
                      { id: '600_1000', label: '₹600 - ₹1,000' },
                      { id: 'above_1000', label: 'Above ₹1,000' },
                    ].map((p) => {
                      const isSel = draftFilters.priceRange === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              priceRange: p.id as FilterState['priceRange'],
                              maxPrice: p.id === 'under_300' ? 300 : p.id === '300_600' ? 600 : p.id === '600_1000' ? 1000 : 2500,
                            }))
                          }
                          className={`py-2 px-2.5 text-center text-[11.5px] font-bold rounded-xl border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#FFF1A6] border-[#6B352A] text-[#6B352A] shadow-2xs'
                              : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Slider for Maximum Price */}
                  <div className="bg-white p-3 rounded-xl border border-[#E8D8C4]">
                    <div className="flex justify-between text-[11px] font-semibold text-[#6B4C44] mb-1">
                      <span>Max Price: ₹{draftFilters.maxPrice}</span>
                      <span>₹2,500 Max</span>
                    </div>
                    <input
                      type="range"
                      min={200}
                      max={2500}
                      step={50}
                      value={draftFilters.maxPrice}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          maxPrice: Number(e.target.value),
                          priceRange: 'all', // Custom slider overrides fixed buckets
                        }))
                      }
                      className="w-full accent-[#6B352A] cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. Special Feature Highlights */}
                <div>
                  <label className="block text-[12px] font-black text-[#2B1611] uppercase tracking-wider mb-2.5">
                    Features & Assurance
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Waterproof */}
                    <button
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          waterproofOnly: !prev.waterproofOnly,
                        }))
                      }
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        draftFilters.waterproofOnly
                          ? 'bg-[#FFF1A6] border-[#6B352A] text-[#6B352A]'
                          : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-[#6B352A]" />
                        <span className="text-[12px] font-bold">100% Waterproof</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          draftFilters.waterproofOnly
                            ? 'bg-[#6B352A] border-[#6B352A] text-[#FFFCF4]'
                            : 'border-[#D4C0AA]'
                        }`}
                      >
                        {draftFilters.waterproofOnly && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Bestseller */}
                    <button
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          bestsellerOnly: !prev.bestsellerOnly,
                        }))
                      }
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        draftFilters.bestsellerOnly
                          ? 'bg-[#FFF1A6] border-[#6B352A] text-[#6B352A]'
                          : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#FF6115]" />
                        <span className="text-[12px] font-bold">Bestsellers</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          draftFilters.bestsellerOnly
                            ? 'bg-[#6B352A] border-[#6B352A] text-[#FFFCF4]'
                            : 'border-[#D4C0AA]'
                        }`}
                      >
                        {draftFilters.bestsellerOnly && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>

                    {/* In Stock */}
                    <button
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          inStockOnly: !prev.inStockOnly,
                        }))
                      }
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        draftFilters.inStockOnly
                          ? 'bg-[#FFF1A6] border-[#6B352A] text-[#6B352A]'
                          : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#6B352A]" />
                        <span className="text-[12px] font-bold">In Stock Only</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          draftFilters.inStockOnly
                            ? 'bg-[#6B352A] border-[#6B352A] text-[#FFFCF4]'
                            : 'border-[#D4C0AA]'
                        }`}
                      >
                        {draftFilters.inStockOnly && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Customizable */}
                    <button
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          customizableOnly: !prev.customizableOnly,
                        }))
                      }
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        draftFilters.customizableOnly
                          ? 'bg-[#FFF1A6] border-[#6B352A] text-[#6B352A]'
                          : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-[#6B352A]" />
                        <span className="text-[12px] font-bold">Custom Fit Ready</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          draftFilters.customizableOnly
                            ? 'bg-[#6B352A] border-[#6B352A] text-[#FFFCF4]'
                            : 'border-[#D4C0AA]'
                        }`}
                      >
                        {draftFilters.customizableOnly && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* 4. Minimum Rating */}
                <div>
                  <label className="block text-[12px] font-black text-[#2B1611] uppercase tracking-wider mb-2.5">
                    Minimum Customer Rating
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { val: 0, label: 'Any Rating' },
                      { val: 4.0, label: '4.0★ & above' },
                      { val: 4.5, label: '4.5★ & above' },
                    ].map((r) => {
                      const isSel = draftFilters.minRating === r.val;
                      return (
                        <button
                          key={r.val}
                          type="button"
                          onClick={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              minRating: r.val,
                            }))
                          }
                          className={`min-h-11 py-2 px-2.5 text-center text-[12px] font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isSel
                              ? 'bg-[#FFF1A6] border-[#6B352A] text-[#6B352A] shadow-2xs'
                              : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isSel ? 'fill-[#FF6115] text-[#FF6115]' : 'text-[#8A6C63]'
                            }`}
                          />
                          <span>{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Vehicle Brand / Compatibility */}
                <div>
                  <label className="block text-[12px] font-black text-[#2B1611] uppercase tracking-wider mb-2.5">
                    Vehicle Brand / Model Compatibility
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {VEHICLE_BRANDS_LIST.map((brand) => {
                      const isSel = draftFilters.vehicleBrand === brand.id;
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              vehicleBrand: brand.id,
                            }))
                          }
                          className={`min-h-11 min-w-0 p-2.5 text-left text-[12px] font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSel
                              ? 'bg-[#FFF1A6] border-[#6B352A] text-[#6B352A]'
                              : 'bg-white hover:bg-[#FFF8D6]/60 border-[#E8D8C4] text-[#4A2B23]'
                          }`}
                        >
                          <span className="truncate pr-1">{brand.label}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-[#6B352A] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer CTA */}
              <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#E8D8C4] bg-white flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-11 flex-1 py-3 px-3 rounded-xl border border-[#E8D8C4] bg-[#FFFCF4] hover:bg-[#FFF8D6] text-[#4A2B23] font-bold text-[13px] transition-all cursor-pointer text-center whitespace-nowrap"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="min-h-11 flex-[2] py-3 px-4 rounded-xl bg-[#FF6115] hover:bg-[#E5520D] text-[#1F0E0A] font-black text-[13px] shadow-sm transition-all active:scale-98 cursor-pointer text-center flex items-center justify-center gap-1.5 whitespace-nowrap tabular-nums"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    Show {draftMatchingCount} {draftMatchingCount === 1 ? 'Result' : 'Results'}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
