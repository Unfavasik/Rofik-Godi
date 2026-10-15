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
}) => {
  // Temporary state for the filter modal before applying
  const [draftFilters, setDraftFilters] = React.useState<FilterState>(filters);

  // Sync draft filters when modal opens
  React.useEffect(() => {
    if (isFilterOpen) {
      setDraftFilters(filters);
    }
  }, [isFilterOpen, filters]);

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
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Content Sheet */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden text-gray-800 max-h-[85vh]"
            >
              {/* Sheet Grab Handle on Mobile */}
              <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

              {/* Header */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[#D9232D]">
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-gray-900 leading-tight">
                      Sort Products
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      Select how you want to order results
                    </p>
                  </div>
                </div>
                <button
                  onClick={onCloseSort}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Options List */}
              <div className="p-3 overflow-y-auto space-y-1.5">
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
                          ? 'bg-red-50/70 border-red-200 text-[#D9232D] shadow-2xs'
                          : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="pr-3">
                        <div className="text-[13px] font-bold leading-snug flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {opt === 'popular' && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full uppercase">
                              HOT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                          isSelected
                            ? 'bg-[#D9232D] border-[#D9232D] text-white'
                            : 'border-gray-300 bg-white'
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
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Filter Drawer / Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden text-gray-800 max-h-[90vh]"
            >
              {/* Mobile grab bar */}
              <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

              {/* Modal Header */}
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-100 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[#D9232D]">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-gray-900 leading-tight">
                      Filter Products
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium">
                      Refine by vehicle, price, features & rating
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11.5px] font-bold text-gray-400 hover:text-[#D9232D] transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50/50 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    onClick={onCloseFilter}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Body with Scrollable Categories */}
              <div className="p-5 overflow-y-auto space-y-5 text-[13px]">
                {/* 1. Category Selection */}
                <div>
                  <label className="block text-[12px] font-black text-gray-800 uppercase tracking-wider mb-2.5">
                    Vehicle Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
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
                              ? 'bg-[#D9232D] border-[#D9232D] text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
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
                    <label className="text-[12px] font-black text-gray-800 uppercase tracking-wider">
                      Price Range
                    </label>
                    <span className="text-[11.5px] font-bold text-[#D9232D]">
                      {draftFilters.priceRange === 'all'
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
                              ? 'bg-red-50 border-red-300 text-[#D9232D] shadow-2xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Slider for Maximum Price */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1">
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
                      className="w-full accent-[#D9232D] cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. Special Feature Highlights */}
                <div>
                  <label className="block text-[12px] font-black text-gray-800 uppercase tracking-wider mb-2.5">
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
                          ? 'bg-blue-50/80 border-blue-300 text-blue-700'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span className="text-[12px] font-bold">100% Waterproof</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          draftFilters.waterproofOnly
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300'
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
                          ? 'bg-red-50/80 border-red-300 text-[#D9232D]'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-red-500" />
                        <span className="text-[12px] font-bold">Bestsellers</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          draftFilters.bestsellerOnly
                            ? 'bg-[#D9232D] border-[#D9232D] text-white'
                            : 'border-slate-300'
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
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-700'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-[12px] font-bold">In Stock Only</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          draftFilters.inStockOnly
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300'
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
                          ? 'bg-purple-50/80 border-purple-300 text-purple-700'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-purple-500" />
                        <span className="text-[12px] font-bold">Custom Fit Ready</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          draftFilters.customizableOnly
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {draftFilters.customizableOnly && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* 4. Minimum Rating */}
                <div>
                  <label className="block text-[12px] font-black text-gray-800 uppercase tracking-wider mb-2.5">
                    Minimum Customer Rating
                  </label>
                  <div className="grid grid-cols-3 gap-2">
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
                          className={`py-2 px-2.5 text-center text-[12px] font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isSel
                              ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isSel ? 'fill-amber-400 text-amber-500' : 'text-gray-400'
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
                  <label className="block text-[12px] font-black text-gray-800 uppercase tracking-wider mb-2.5">
                    Vehicle Brand / Model Compatibility
                  </label>
                  <div className="grid grid-cols-2 gap-2">
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
                          className={`p-2.5 text-left text-[11.5px] font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSel
                              ? 'bg-red-50 border-red-300 text-[#D9232D]'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="truncate pr-1">{brand.label}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-[#D9232D] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer CTA */}
              <div className="p-4 border-t border-gray-100 bg-slate-50/80 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold text-[13px] transition-all cursor-pointer text-center"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-[2] py-3 px-4 rounded-xl bg-[#D9232D] hover:bg-red-700 text-white font-black text-[13px] shadow-sm transition-all active:scale-98 cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Filters</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
