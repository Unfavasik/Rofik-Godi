import React, { useEffect, useMemo, useState } from 'react';
import { VEHICLE_BRANDS } from '../data/products';
import {
  getCachedVehicleModels,
  loadVehicleModels,
  VEHICLE_CATALOG_CHANGED_EVENT,
  type VehicleCatalogModel,
} from '../lib/supabaseVehicleCatalog';
import { getBrandInitials, getBrandLogoUrl } from '../lib/brandLogos';
import {
  parseVehicleFitmentValue,
  resolveVehicleFitment,
  type CheckoutVehicleType,
} from '../lib/checkoutVehicleFitment';
import type { Product } from '../types';
import {
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BottomSheet } from './BottomSheet';

interface VehicleFinderProps {
  onFilterVehicle: (model: string | null) => void;
  activeVehicleFilter: string | null;
  products?: Product[];
  savedVehicle?: string | null;
  variant?: 'inline' | 'sheet';
  onApplied?: () => void;
}

type FinderType = 'bike' | 'scooter' | 'toto';

interface FinderModel {
  brand: string;
  name: string;
  image?: string;
}

const POPULAR_BRAND_ORDER: Record<FinderType, string[]> = {
  bike: ['Hero MotoCorp', 'Honda', 'Royal Enfield', 'Bajaj', 'TVS', 'Yamaha', 'Suzuki', 'KTM'],
  scooter: ['Honda', 'TVS', 'Suzuki', 'Ola Electric', 'Ola', 'Ather', 'Bajaj', 'Hero MotoCorp', 'Yamaha'],
  toto: ['Mahindra', 'Piaggio', 'Bajaj', 'Mayuri', 'Kinetic', 'Yatri', 'Mini Metro'],
};

const TYPE_META: Array<{ id: FinderType; label: string; shortLabel: string }> = [
  { id: 'bike', label: 'Bike', shortLabel: 'Bike' },
  { id: 'scooter', label: 'Scooty', shortLabel: 'Scooty' },
  { id: 'toto', label: 'Toto / Cab', shortLabel: 'Toto' },
];

const toFinderType = (type: CheckoutVehicleType): FinderType => {
  if (type === 'Scooter') return 'scooter';
  if (type === 'Toto / E-rickshaw') return 'toto';
  return 'bike';
};

function ScooterIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <path d="M9 17.5h5.5l2-6.5h-2.5" />
      <path d="M13 6h2.5l2 5" />
      <path d="M5 13h5.5c.8 0 1.5.7 1.5 1.5v3" />
      <path d="M4.5 13c0-1.5 1.3-2.5 3-2.5h2" />
    </svg>
  );
}

function TotoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <path d="M9 17.5h6" />
      <path d="M4 17.5V9.5A2.5 2.5 0 0 1 6.5 7h8.2a2 2 0 0 1 1.9 1.37L19 14.5v3" />
      <path d="M4 12.5h14.3" />
      <path d="M11 7v5.5" />
    </svg>
  );
}

function VehicleTypeGlyph({ type, className = 'h-4 w-4' }: { type: FinderType; className?: string }) {
  if (type === 'scooter') return <ScooterIcon className={className} />;
  if (type === 'toto') return <TotoIcon className={className} />;
  return <Bike aria-hidden="true" className={className} />;
}

function BrandMark({
  brand,
  size = 'sm',
}: {
  brand: string;
  size?: 'xs' | 'sm';
}) {
  const [failed, setFailed] = useState(false);
  const logoUrl = getBrandLogoUrl(brand);
  const dims = size === 'xs' ? 'h-5 w-5 text-[8.5px]' : 'h-6 w-6 text-[9.5px]';

  useEffect(() => {
    setFailed(false);
  }, [brand]);

  if (logoUrl && !failed) {
    return (
      <span
        className={`flex ${dims} shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 ring-1 ring-slate-200/80`}
      >
        <img
          src={logoUrl}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-md bg-slate-100 font-bold tracking-tight text-slate-600 ring-1 ring-slate-200/80`}
    >
      {getBrandInitials(brand)}
    </span>
  );
}

function VehicleThumbnail({
  image,
  name,
  type,
  className = 'h-14 w-20',
}: {
  image?: string;
  name: string;
  type: FinderType;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(image && failedSrc !== image);

  return (
    <div
      className={`flex ${className} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white`}
    >
      {showImage ? (
        <img
          src={image}
          alt={`${name} vehicle`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailedSrc(image || null)}
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 text-slate-400">
          <VehicleTypeGlyph type={type} className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

export const VehicleFinder: React.FC<VehicleFinderProps> = ({
  onFilterVehicle,
  activeVehicleFilter,
  products = [],
  savedVehicle,
  variant = 'inline',
  onApplied,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [selectedType, setSelectedType] = useState<FinderType>('bike');
  // Seed from the in-memory cache so returning to Home renders selectors instantly.
  const [catalogModels, setCatalogModels] = useState<VehicleCatalogModel[]>(() => getCachedVehicleModels());
  const [catalogLoading, setCatalogLoading] = useState(() => getCachedVehicleModels().length === 0);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelQuery, setModelQuery] = useState('');

  useEffect(() => {
    const refresh = () => {
      if (getCachedVehicleModels().length === 0) setCatalogLoading(true);
      void loadVehicleModels()
        .then(({ data }) => setCatalogModels(data))
        .finally(() => setCatalogLoading(false));
    };
    refresh();
    window.addEventListener(VEHICLE_CATALOG_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(VEHICLE_CATALOG_CHANGED_EVENT, refresh);
  }, []);

  const currentBrands = useMemo(() => {
    if (selectedType === 'toto') {
      return VEHICLE_BRANDS.toto.map(({ brand }) => brand);
    }
    return Array.from(
      new Set(catalogModels.filter((model) => model.type === selectedType).map((model) => model.brand)),
    ).sort((a, b) => a.localeCompare(b));
  }, [catalogModels, selectedType]);

  const quickBrands = useMemo(() => {
    const preferred = POPULAR_BRAND_ORDER[selectedType];
    const ranked: string[] = [];
    for (const candidate of preferred) {
      const match = currentBrands.find(
        (brand) => brand.toLowerCase() === candidate.toLowerCase(),
      );
      if (match && !ranked.includes(match)) ranked.push(match);
    }
    for (const brand of currentBrands) {
      if (ranked.length >= 8) break;
      if (!ranked.includes(brand)) ranked.push(brand);
    }
    return ranked;
  }, [currentBrands, selectedType]);

  const currentModels: FinderModel[] = useMemo(() => {
    if (!selectedBrand) return [];
    if (selectedType === 'toto') {
      return (VEHICLE_BRANDS.toto.find((group) => group.brand === selectedBrand)?.models || []).map(
        (name) => ({ brand: selectedBrand, name }),
      );
    }
    return catalogModels.filter(
      (model: VehicleCatalogModel) => model.type === selectedType && model.brand === selectedBrand,
    );
  }, [catalogModels, selectedBrand, selectedType]);

  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    if (!q) return currentModels;
    return currentModels.filter((model) => model.name.toLowerCase().includes(q));
  }, [currentModels, modelQuery]);

  const selectedVehicle = useMemo(
    () => currentModels.find((model) => model.name === selectedModel),
    [currentModels, selectedModel],
  );

  const effectiveQuery = selectedModel || selectedBrand;

  const matchingCoverCount = useMemo(() => {
    if (!effectiveQuery || !products.length) return null;
    const needle = effectiveQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.compatibility.some((comp) => comp.toLowerCase().includes(needle)) ||
        product.title.toLowerCase().includes(needle),
    ).length;
  }, [effectiveQuery, products]);

  const parsedSavedVehicle = useMemo(() => {
    const raw = (savedVehicle || '').trim();
    if (!raw) return null;
    return {
      raw,
      parsed: parseVehicleFitmentValue(raw, catalogModels),
    };
  }, [catalogModels, savedVehicle]);

  const handleTypeChange = (type: FinderType) => {
    setSelectedType(type);
    setSelectedBrand('');
    setSelectedModel('');
    setModelQuery('');
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel('');
    setModelQuery('');
  };

  const handleApplyFilter = () => {
    if (selectedModel) {
      onFilterVehicle(selectedModel);
      onApplied?.();
    } else if (selectedBrand) {
      onFilterVehicle(selectedBrand);
      onApplied?.();
    }
  };

  const handleUseSavedVehicle = () => {
    if (!parsedSavedVehicle) return;
    const { parsed, raw } = parsedSavedVehicle;
    setSelectedType(toFinderType(parsed.type));
    setSelectedBrand(parsed.company || '');
    setSelectedModel(parsed.model || '');
    setModelQuery('');
    onFilterVehicle(parsed.model || parsed.company || raw);
    onApplied?.();
  };

  const handleClear = () => {
    setSelectedBrand('');
    setSelectedModel('');
    setModelQuery('');
    onFilterVehicle(null);
  };

  const hasAnySelection = Boolean(selectedBrand || selectedModel || activeVehicleFilter);
  const currentTypeLabel = TYPE_META.find((t) => t.id === selectedType)?.label || 'Bike';
  const isSheet = variant === 'sheet';

  const content = (
    <>
      {/* Header Row */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-2.5">
        {isSheet ? (
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium text-slate-500">
            <span className="font-semibold text-emerald-700">100% Fit Guarantee</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Select your ride for exact workshop-fitted covers</span>
          </p>
        ) : (
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D9232D] text-white shadow-[0_8px_18px_-8px_rgba(217,35,45,0.65)]">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-[15px] font-black tracking-tight text-slate-900 sm:text-base [text-wrap:balance]">
                Vehicle Fitment Finder
              </h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] font-medium text-slate-500">
                <span className="font-semibold text-emerald-700">100% Fit Guarantee</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>Select your ride for exact workshop-fitted covers</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {parsedSavedVehicle && activeVehicleFilter !== (parsedSavedVehicle.parsed.model || parsedSavedVehicle.raw) && (
            <button
              type="button"
              onClick={handleUseSavedVehicle}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:border-rose-200 hover:bg-rose-50/70 hover:text-[#D9232D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap"
            >
              <VehicleTypeGlyph
                type={toFinderType(parsedSavedVehicle.parsed.type)}
                className="h-3.5 w-3.5 shrink-0 text-[#D9232D]"
              />
              <span className="max-w-[140px] truncate">
                My ride: {parsedSavedVehicle.parsed.model || parsedSavedVehicle.raw}
              </span>
            </button>
          )}

          {hasAnySelection && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Vehicle Type Switcher */}
      <div
        role="group"
        aria-label="Vehicle type"
        className="relative z-10 mt-3.5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100/90 p-1 ring-1 ring-slate-200/70"
      >
          {TYPE_META.map((tab) => {
            const active = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleTypeChange(tab.id)}
                className={`relative flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] whitespace-nowrap ${
                  active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={prefersReducedMotion ? undefined : 'vehicle-finder-active-type'}
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    className="absolute inset-0 rounded-lg bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <VehicleTypeGlyph
                    type={tab.id}
                    className={`h-4 w-4 shrink-0 ${active ? 'text-[#D9232D]' : 'text-slate-400'}`}
                  />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Popular Brands Strip (1-tap brand selection with real logos) */}
        {quickBrands.length > 0 && (
          <div className="relative z-10 mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">Popular {currentTypeLabel} brands</span>
              <span className="tabular-nums text-slate-400">{currentBrands.length} companies</span>
            </div>
            <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5">
              {quickBrands.map((brand) => {
                const isSelected = selectedBrand === brand;
                return (
                  <button
                    key={brand}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleBrandSelect(isSelected ? '' : brand)}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] active:scale-[0.98] whitespace-nowrap ${
                      isSelected
                        ? 'border-[#D9232D] bg-rose-50/75 text-slate-900 shadow-[0_4px_12px_-6px_rgba(217,35,45,0.45)]'
                        : 'border-slate-200/85 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <BrandMark brand={brand} size="xs" />
                    <span>{brand}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Two-Step Guided Dropdown Selectors */}
        <div className="relative z-10 mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">01. Company</span>
              {selectedBrand && (
                <span className="font-semibold text-emerald-700">Selected</span>
              )}
            </div>
            <label className="relative flex min-h-11 items-center rounded-xl border border-slate-200/90 bg-slate-50/80 transition-colors focus-within:border-[#D9232D] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D9232D]/15">
              <span className="sr-only">Select company</span>
              <span className="pointer-events-none ml-2.5 flex shrink-0 items-center">
                {selectedBrand ? (
                  <BrandMark brand={selectedBrand} size="xs" />
                ) : (
                  <VehicleTypeGlyph type={selectedType} className="h-4 w-4 text-slate-400" />
                )}
              </span>
              <select
                aria-label="Select company"
                value={selectedBrand}
                onChange={(event) => handleBrandSelect(event.target.value)}
                className="min-h-11 w-full cursor-pointer appearance-none bg-transparent py-2 pl-2.5 pr-9 text-base font-semibold text-slate-900 focus:outline-none sm:text-[13px]"
              >
                <option value="">{catalogLoading ? 'Loading companies…' : 'Select Company'}</option>
                {currentBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
            </label>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">02. Model</span>
              {selectedBrand && (
                <span className="tabular-nums text-slate-400">
                  {currentModels.length} {currentModels.length === 1 ? 'model' : 'models'}
                </span>
              )}
            </div>
            <label
              className={`relative flex min-h-11 items-center rounded-xl border transition-colors ${
                selectedBrand
                  ? 'border-slate-200/90 bg-slate-50/80 focus-within:border-[#D9232D] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D9232D]/15'
                  : 'border-slate-200/60 bg-slate-100/70 opacity-65'
              }`}
            >
              <span className="sr-only">Select model</span>
              <select
                aria-label="Select model"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                disabled={!selectedBrand}
                className={`min-h-11 w-full appearance-none bg-transparent py-2 pl-3 pr-9 text-base font-semibold text-slate-900 focus:outline-none sm:text-[13px] ${
                  !selectedBrand ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer'
                }`}
              >
                <option value="">
                  {catalogLoading
                    ? 'Loading models…'
                    : selectedBrand
                      ? 'All models / Pick specific model'
                      : 'Pick Company First'}
                </option>
                {currentModels.map((model, index) => (
                  <option key={`${model.name}-${index}`} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
            </label>
          </div>
        </div>

        {/* Visual Model Picker Strip once a Company is selected */}
        <AnimatePresence initial={false}>
          {selectedBrand && currentModels.length > 0 && (
            <motion.div
              key={`models-${selectedType}-${selectedBrand}`}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 mt-3 border-t border-slate-200/75 pt-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Quick pick a {selectedBrand} model
                </span>
                {currentModels.length > 6 && (
                  <div className="relative flex min-h-8 w-full max-w-[200px] items-center rounded-lg border border-slate-200 bg-slate-50 px-2 focus-within:border-[#D9232D] focus-within:bg-white">
                    <Search aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={modelQuery}
                      onChange={(event) => setModelQuery(event.target.value)}
                      placeholder={`Filter ${selectedBrand}…`}
                      aria-label={`Filter ${selectedBrand} models`}
                      className="w-full min-w-0 bg-transparent px-1.5 py-1 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    {modelQuery && (
                      <button
                        type="button"
                        aria-label="Clear model filter"
                        onClick={() => setModelQuery('')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {filteredModels.length > 0 ? (
                <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {filteredModels.slice(0, 18).map((model) => {
                    const active = selectedModel === model.name;
                    return (
                      <button
                        key={model.name}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedModel(active ? '' : model.name)}
                        className={`group relative flex w-28 shrink-0 flex-col items-center rounded-xl border p-2 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] active:scale-[0.98] ${
                          active
                            ? 'border-[#D9232D] bg-rose-50/60 shadow-[0_6px_16px_-10px_rgba(217,35,45,0.5)]'
                            : 'border-slate-200/80 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        {active && (
                          <span className="absolute right-1.5 top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#D9232D] text-white shadow-xs">
                            <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden="true" />
                          </span>
                        )}
                        <VehicleThumbnail
                          image={model.image}
                          name={model.name}
                          type={selectedType}
                          className="h-12 w-full"
                        />
                        <span className="mt-1.5 line-clamp-2 w-full text-[11px] font-bold leading-tight text-slate-800">
                          {model.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="py-2 text-xs font-medium text-slate-400">
                  No {selectedBrand} models match "{modelQuery}".
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Vehicle Fitment Preview Band */}
        <AnimatePresence initial={false}>
          {selectedVehicle && (
            <motion.div
              key={`selected-${selectedVehicle.brand}-${selectedVehicle.name}`}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 mt-3 flex items-center gap-3 rounded-xl bg-slate-50/90 p-2.5 ring-1 ring-slate-200/80"
            >
              <VehicleThumbnail
                image={selectedVehicle.image}
                name={selectedVehicle.name}
                type={selectedType}
                className="h-16 w-24 sm:h-16 sm:w-28"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <BrandMark brand={selectedVehicle.brand} size="xs" />
                  <span className="truncate">{selectedVehicle.brand}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>{currentTypeLabel}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[13.5px] font-black leading-snug text-slate-900">
                  {selectedVehicle.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Verified workshop fit · Free on-spot fitting</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Status & Single Primary Action */}
        <div className="relative z-10 mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/75 pt-3">
          <div className="min-w-0 flex-1 text-xs">
            {activeVehicleFilter ? (
              <div className="flex min-w-0 items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  Showing covers for <strong className="font-extrabold text-slate-900">{activeVehicleFilter}</strong>
                </span>
              </div>
            ) : effectiveQuery ? (
              <div className="flex flex-wrap items-center gap-x-1.5 text-slate-600">
                <span className="truncate font-semibold text-slate-800">{effectiveQuery}</span>
                {matchingCoverCount !== null && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-semibold tabular-nums text-emerald-700">
                      {matchingCoverCount > 0
                        ? `${matchingCoverCount} matching ${matchingCoverCount === 1 ? 'cover' : 'covers'}`
                        : 'Workshop custom fit available'}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="font-medium text-slate-500">
                Pick a company or model above to filter compatible covers
              </span>
            )}
          </div>

          <motion.button
            type="button"
            whileHover={selectedBrand && !prefersReducedMotion ? { scale: 1.02 } : undefined}
            whileTap={selectedBrand && !prefersReducedMotion ? { scale: 0.97 } : undefined}
            disabled={!selectedBrand}
            onClick={handleApplyFilter}
            className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] focus-visible:ring-offset-2 whitespace-nowrap ${
              selectedBrand
                ? 'banner-cta-shine cursor-pointer bg-gradient-to-r from-[#D9232D] to-[#B91822] text-white shadow-[0_8px_20px_-6px_rgba(217,35,45,0.55)] hover:brightness-105'
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
            }`}
          >
            <span>Find Covers</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </motion.button>
        </div>
      </>
    );

  if (isSheet) {
    return (
      <div className="relative" data-purpose="vehicle-fitment-finder">
        {content}
      </div>
    );
  }

  return (
    <section className="mb-4 px-3.5 sm:px-5" data-purpose="vehicle-fitment-finder">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/85 bg-white/92 p-4 shadow-[0_14px_34px_-22px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:p-5">
        {content}
      </div>
    </section>
  );
};

interface VehicleFitmentTriggerBarProps {
  activeVehicleFilter: string | null;
  savedVehicle?: string | null;
  matchingCount?: number;
  onOpen: () => void;
  onClear: () => void;
}

export const VehicleFitmentTriggerBar: React.FC<VehicleFitmentTriggerBarProps> = ({
  activeVehicleFilter,
  savedVehicle,
  matchingCount,
  onOpen,
  onClear,
}) => {
  const [failedThumb, setFailedThumb] = useState<string | null>(null);
  const resolvedActive = useMemo(() => {
    if (!activeVehicleFilter) return null;
    return resolveVehicleFitment(activeVehicleFilter, getCachedVehicleModels());
  }, [activeVehicleFilter]);

  const activeImage =
    resolvedActive?.image && failedThumb !== resolvedActive.image ? resolvedActive.image : null;

  return (
    <section className="mb-3.5 px-3.5 sm:px-5" data-purpose="vehicle-fitment-trigger">
      <div
        className={`flex min-h-[54px] items-center justify-between gap-2.5 rounded-2xl border px-3 py-2 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-colors ${
          activeVehicleFilter
            ? 'border-emerald-200/90 bg-emerald-50/55'
            : 'border-slate-200/85 bg-white/92 hover:border-rose-200/80'
        }`}
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] rounded-xl py-0.5 cursor-pointer"
        >
          {activeVehicleFilter ? (
            activeImage ? (
              <span className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-emerald-200/80 bg-white">
                <img
                  src={activeImage}
                  alt={activeVehicleFilter}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={() => setFailedThumb(activeImage)}
                  className="h-full w-full object-contain p-0.5"
                />
              </span>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
            )
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#D9232D] ring-1 ring-inset ring-rose-200/70">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold leading-tight text-slate-900">
              {activeVehicleFilter ? `Fitted for ${activeVehicleFilter}` : 'Vehicle Fitment Finder'}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {activeVehicleFilter
                ? matchingCount !== undefined
                  ? `${matchingCount} compatible ${matchingCount === 1 ? 'cover' : 'covers'} found`
                  : 'Showing compatible seat covers'
                : savedVehicle?.trim()
                  ? `Saved ride: ${savedVehicle.trim()}`
                  : 'Bike, Scooter & Toto fitment'}
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-[#D9232D] whitespace-nowrap">
            <span>{activeVehicleFilter ? 'Change' : 'Select ride'}</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </button>

        {activeVehicleFilter && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear vehicle filter"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
};

interface VehicleFinderSheetProps {
  open: boolean;
  onClose: () => void;
  onFilterVehicle: (model: string | null) => void;
  activeVehicleFilter: string | null;
  products?: Product[];
  savedVehicle?: string | null;
}

export const VehicleFinderSheet: React.FC<VehicleFinderSheetProps> = ({
  open,
  onClose,
  onFilterVehicle,
  activeVehicleFilter,
  products,
  savedVehicle,
}) => (
  <BottomSheet
    open={open}
    title="Vehicle Fitment Finder"
    onClose={onClose}
    className="sm:max-w-xl"
  >
    <VehicleFinder
      variant="sheet"
      onFilterVehicle={onFilterVehicle}
      activeVehicleFilter={activeVehicleFilter}
      products={products}
      savedVehicle={savedVehicle}
      onApplied={onClose}
    />
  </BottomSheet>
);
