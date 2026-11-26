import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bike,
  ChevronDown,
  Edit3,
  Ellipsis,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Motorbike,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createVehicleModel,
  deleteVehicleModel,
  loadVehicleModels,
  setVehicleBrandVisibility,
  uploadVehicleModelImage,
  updateVehicleModel,
  type VehicleCatalogModel,
  type VehicleCatalogType,
} from '../lib/supabaseVehicleCatalog';
import { getBrandInitials, getBrandLogoUrl } from '../lib/brandLogos';
import { useUploadProgress } from '../lib/useUploadProgress';
import { UploadProgressBar } from './UploadProgressBar';
import { readSwrCache, writeSwrCache } from '../lib/swrCache';
import { subscribePullToRefresh } from '../lib/pullToRefresh';

type Props = { notify: (message: string, tone?: 'success' | 'error' | 'info') => void };

function BrandLogo({ brand }: { brand: string }) {
  const [failed, setFailed] = useState(false);
  const url = getBrandLogoUrl(brand);
  if (!url || failed) {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[8px] font-black text-[#D71920]">
        {getBrandInitials(brand)}
      </span>
    );
  }
  return <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-5 w-auto max-w-[30px] shrink-0 object-contain" />;
}

export function AdminVehicleCatalogManager({ notify }: Props) {
  const navigate = useNavigate();
  const [models, setModels] = useState<VehicleCatalogModel[]>(
    () => readSwrCache<VehicleCatalogModel[]>('admin:vehicle-models') ?? [],
  );
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleCatalogType>('bike');
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<VehicleCatalogType>('bike');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [loading, setLoading] = useState(
    () => readSwrCache('admin:vehicle-models') === undefined,
  );
  const [creating, setCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingModelId, setUploadingModelId] = useState<string | null>(null);
  const [brandUpdating, setBrandUpdating] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const createImageInputRef = useRef<HTMLInputElement | null>(null);
  const createUploadProgress = useUploadProgress('model image');
  const rowUploadProgress = useUploadProgress('model image');

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const result = await loadVehicleModels({ includeHidden: true });
    if (result.error) notify(`Could not load vehicle models: ${result.error.message}`, 'error');
    else writeSwrCache('admin:vehicle-models', result.data);
    setModels(result.data);
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    void refresh(readSwrCache('admin:vehicle-models') !== undefined);
    return subscribePullToRefresh(() => refresh(true));
  }, [refresh]);

  const typeModels = models.filter((model) => model.type === selectedType);
  const typeBrands = Array.from(new Set(typeModels.map((model) => model.brand))).sort();
  const displayedBrands = showAllBrands ? typeBrands : typeBrands.slice(0, 9);
  const filtered = typeModels.filter((model) =>
    (!selectedBrand || model.brand === selectedBrand) &&
    (visibilityFilter === 'all' || (visibilityFilter === 'active' ? model.isActive : !model.isActive)) &&
    `${model.brand} ${model.name}`.toLowerCase().includes(query.toLowerCase()),
  );

  const addModel = async () => {
    const cleanBrand = brand.trim();
    const cleanName = name.trim();
    if (!cleanBrand || !cleanName) return notify('Company and model name are required', 'error');
    if (imageFile && imageFile.size > 5 * 1024 * 1024) return notify('Choose an image smaller than 5MB', 'error');
    if (imageFile && !['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type)) return notify('Choose a JPG, PNG or WEBP image', 'error');
    setCreating(true);
    let createdModel: VehicleCatalogModel | null = null;
    try {
      createdModel = await createVehicleModel({ brand: cleanBrand, name: cleanName, type, image: '' });
      const pendingFile = imageFile;
      setBrand(''); setName(''); setImageFile(null);
      if (pendingFile) {
        createUploadProgress.startUpload(pendingFile.name, { baseLabel: 'model image' });
        await uploadVehicleModelImage(createdModel.id, pendingFile);
        createUploadProgress.finishUpload('Model image uploaded');
      }
      await refresh(true);
      notify('Vehicle model added to Supabase', 'success');
    } catch (error) {
      createUploadProgress.resetUpload();
      await refresh(true);
      notify(error instanceof Error ? (createdModel ? `Model added, but image upload failed: ${error.message}` : error.message) : 'Could not add vehicle model', 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggleModel = async (model: VehicleCatalogModel) => {
    try {
      await updateVehicleModel(model.id, { isActive: !model.isActive });
      await refresh(true);
      notify(model.isActive ? 'Model hidden from customers' : 'Model visible to customers', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update visibility', 'error');
    }
  };

  const toggleBrandVisibility = async () => {
    if (!selectedBrand || brandUpdating) return;
    const brandModels = typeModels.filter((model) => model.brand === selectedBrand);
    const makeVisible = brandModels.every((model) => !model.isActive);
    if (!window.confirm(makeVisible
      ? `Show all ${brandModels.length} ${selectedBrand} models in the public catalog?`
      : `Hide all ${brandModels.length} ${selectedBrand} models from customers?`)) return;
    setBrandUpdating(true);
    try {
      await setVehicleBrandVisibility(selectedBrand, selectedType, makeVisible);
      await refresh(true);
      notify(makeVisible ? `${selectedBrand} is now visible to customers` : `${selectedBrand} hidden from customers`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update company visibility', 'error');
    } finally {
      setBrandUpdating(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const modelId = event.target.dataset.modelId;
    event.target.value = '';
    if (!file || !modelId) return;
    setUploadingModelId(modelId);
    rowUploadProgress.startUpload(file.name, { baseLabel: 'model image' });
    try {
      const result = await uploadVehicleModelImage(modelId, file);
      rowUploadProgress.finishUpload('Model image uploaded');
      await refresh(true);
      notify(`Image converted to WebP and saved (${Math.round(result.bytes / 1024)} KB)`, 'success');
    } catch (error) {
      rowUploadProgress.resetUpload();
      notify(error instanceof Error ? error.message : 'Could not upload model image', 'error');
    } finally {
      setUploadingModelId(null);
    }
  };

  const removeModel = async (model: VehicleCatalogModel) => {
    if (!window.confirm(`Remove ${model.name} from the vehicle catalog?`)) return;
    try {
      await deleteVehicleModel(model.id);
      await refresh(true);
      notify('Vehicle model removed', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not remove model', 'error');
    }
  };

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/85 bg-gradient-to-br from-white via-white to-rose-50/35 p-3.5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.08)] sm:p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200/70 bg-red-50/80 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.14em] text-[#D9232D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D9232D]" />
              Vehicle fitment catalog
            </span>
            <h2 className="mt-1.5 font-display text-lg font-black tracking-tight text-slate-900 md:text-xl">
              Vehicle models
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              Manage Bike and Scooter companies, fitment models, and storefront visibility.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 shadow-2xs tabular-nums">
              {models.length} total models
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Refresh vehicle catalog"
              className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-red-200 hover:bg-red-50/40 hover:text-[#D9232D]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#D9232D]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        <div className="min-w-0 rounded-2xl border border-slate-200/85 bg-white p-3.5 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)] sm:p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#D9232D] to-[#991B1B] text-white shadow-sm shadow-red-500/20">
              <Plus className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-sm font-extrabold leading-tight text-slate-900">
                Create a New Fitment Model
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Add a vehicle, company and model with image.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-800">
                Vehicle Type <b className="text-[#D9232D]">*</b>
              </span>
              <span className="relative block">
                <Bike className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D9232D]" />
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as VehicleCatalogType)}
                  className="min-h-9 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-9 text-base font-semibold text-slate-800 outline-none transition focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-red-100 sm:text-xs"
                >
                  <option value="bike">Bike</option>
                  <option value="scooter">Scooty / Scooter</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              </span>
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="mb-1 block text-[11px] font-bold text-slate-800">
                  Company <b className="text-[#D9232D]">*</b>
                </span>
                <input
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="Company name"
                  className="min-h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-base font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-red-100 sm:text-xs"
                />
              </label>
              <label className="block min-w-0">
                <span className="mb-1 block text-[11px] font-bold text-slate-800">
                  Model <b className="text-[#D9232D]">*</b>
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Model name"
                  className="min-h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-base font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-red-100 sm:text-xs"
                />
              </label>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold text-slate-800">
                Model Image <span className="font-normal text-slate-400">(Optional)</span>
              </p>
              <button
                type="button"
                onClick={() => createImageInputRef.current?.click()}
                className="flex min-h-[72px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50/20 px-3 py-2.5 text-center transition hover:border-[#D9232D] hover:bg-red-50/50"
              >
                <ImagePlus className="h-5 w-5 text-[#D9232D]" />
                <span className="mt-1 text-[11px] font-bold text-slate-700">
                  {imageFile?.name || 'Tap to upload image'}
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  Any size · auto-cropped to 800×600 WebP (Max 5MB)
                </span>
              </button>
              <input
                ref={createImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] || null);
                  event.target.value = '';
                }}
                className="hidden"
                aria-label="Choose vehicle model image"
              />
              <UploadProgressBar state={createUploadProgress.state} compact className="mt-2" />
            </div>
            <button
              type="button"
              onClick={() => void addModel()}
              disabled={creating}
              className="banner-cta-shine group/cta inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#D9232D] py-2 text-xs font-extrabold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {creating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:scale-110" />}
              {creating ? 'Adding model…' : 'Add Model'}
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {/* Search & Visibility Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search vehicles"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search vehicles, models or companies..."
                className="h-10 w-full rounded-xl border border-slate-200/90 bg-white pl-9 pr-9 text-base font-semibold text-slate-700 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-2 focus:ring-red-100 sm:text-xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <details className="relative shrink-0">
              <summary
                aria-label={`Filter models, currently ${visibilityFilter}`}
                className={`flex h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3.5 shadow-2xs transition [&::-webkit-details-marker]:hidden ${
                  visibilityFilter === 'all'
                    ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    : 'bg-[#D9232D] text-white'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="text-xs font-extrabold">
                  {visibilityFilter === 'all'
                    ? 'Filter'
                    : visibilityFilter === 'active'
                      ? 'Visible'
                      : 'Hidden'}
                </span>
              </summary>
              <div className="absolute right-0 top-11 z-20 w-44 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {(
                  [
                    ['all', 'All models', SlidersHorizontal],
                    ['active', 'Visible only', Eye],
                    ['hidden', 'Hidden only', EyeOff],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      setVisibilityFilter(value);
                    }}
                    className={`flex min-h-9 w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-bold transition ${
                      visibilityFilter === value
                        ? 'bg-red-50 text-[#D9232D]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </details>
          </div>

          {/* Vehicle Type & Company Selector Card */}
          <div className="rounded-2xl border border-slate-200/85 bg-white p-4 shadow-2xs space-y-3.5">
            <div>
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                01. Choose Vehicle Type
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('bike');
                    setSelectedBrand('');
                    setShowAllBrands(false);
                  }}
                  className={`flex min-h-9 items-center justify-center gap-2 rounded-xl border py-1.5 px-3 text-xs font-extrabold transition ${
                    selectedType === 'bike'
                      ? 'border-red-300 bg-red-50 text-[#D9232D] shadow-2xs'
                      : 'border-slate-200/80 bg-slate-50/60 text-slate-700 hover:bg-white'
                  }`}
                >
                  <Bike className="h-4 w-4 shrink-0" />
                  Bike
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType('scooter');
                    setSelectedBrand('');
                    setShowAllBrands(false);
                  }}
                  className={`flex min-h-9 items-center justify-center gap-2 rounded-xl border py-1.5 px-3 text-xs font-extrabold transition ${
                    selectedType === 'scooter'
                      ? 'border-red-300 bg-red-50 text-[#D9232D] shadow-2xs'
                      : 'border-slate-200/80 bg-slate-50/60 text-slate-700 hover:bg-white'
                  }`}
                >
                  <Motorbike className={`h-4 w-4 shrink-0 ${selectedType === 'scooter' ? '' : 'text-amber-500'}`} />
                  <span className="truncate">Scooty / Scooter</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  02. Choose Company{' '}
                  <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                    ({typeBrands.length} companies)
                  </span>
                </h3>
                {typeBrands.length > 9 && (
                  <button
                    type="button"
                    onClick={() => setShowAllBrands((value) => !value)}
                    className="min-h-8 px-2 text-xs font-extrabold text-[#D9232D]"
                  >
                    {showAllBrands ? 'Show Less' : 'View All'}
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4">
                {displayedBrands.map((item) => {
                  const active = selectedBrand === item;
                  const brandModels = typeModels.filter((model) => model.brand === item);
                  const brandHidden =
                    brandModels.length > 0 && brandModels.every((model) => !model.isActive);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedBrand(active ? '' : item)}
                      className={`inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold shadow-2xs transition ${
                        active
                          ? 'border-red-300 bg-red-50 text-slate-900'
                          : brandHidden
                            ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                            : 'border-slate-200/80 bg-white text-slate-800 hover:border-red-200'
                      }`}
                    >
                      <BrandLogo brand={item} />
                      <span className="truncate">{item}</span>
                      {brandHidden && <EyeOff className="h-3 w-3 shrink-0 text-slate-400" />}
                    </button>
                  );
                })}
              </div>
              {selectedBrand &&
                (() => {
                  const brandModels = typeModels.filter((model) => model.brand === selectedBrand);
                  const visibleCount = brandModels.filter((model) => model.isActive).length;
                  const makeVisible = visibleCount === 0;
                  return (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold text-slate-900">
                          {selectedBrand}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 tabular-nums">
                          {visibleCount}/{brandModels.length} models visible to users
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleBrandVisibility()}
                        disabled={brandUpdating}
                        className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition disabled:opacity-60 ${
                          makeVisible
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-[#D9232D] hover:bg-red-100'
                        }`}
                      >
                        {brandUpdating ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : makeVisible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {brandUpdating ? 'Updating…' : makeVisible ? 'Show Company' : 'Hide Company'}
                      </button>
                    </div>
                  );
                })()}
            </div>
          </div>

          {/* Models List */}
          {loading ? (
            <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <p className="sr-only">Loading vehicle catalog…</p>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 py-1.5">
                  <div className="h-11 w-16 shrink-0 rounded-xl bg-slate-200/80 animate-shimmer" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 rounded-lg bg-slate-200/70 animate-shimmer" />
                    <div className="h-3.5 w-44 rounded-lg bg-slate-200/85 animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-xs font-black text-slate-900">
                  03. Models{' '}
                  <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                    ({typeModels.length} total)
                  </span>
                </p>
                <span className="text-[11px] font-medium text-slate-400">
                  Tap a model to manage fitment or image
                </span>
              </div>
              <UploadProgressBar state={rowUploadProgress.state} compact className="mb-2.5" />
              <div className="divide-y divide-slate-100 overflow-visible rounded-2xl border border-slate-200/85 bg-white px-3.5 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)] sm:px-4">
                {filtered.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-extrabold text-slate-700">No vehicle models found</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try another search or clear the current filters.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setSelectedBrand('');
                        setVisibilityFilter('all');
                      }}
                      className="mt-3 min-h-9 rounded-xl bg-red-50 px-3.5 py-1.5 text-xs font-extrabold text-[#D9232D]"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  filtered.map((model) => (
                    <div
                      key={model.id}
                      className={`group flex min-h-[60px] items-center justify-between gap-2.5 py-2.5 transition-colors sm:gap-3 ${
                        model.isActive ? '' : 'bg-rose-50/40'
                      }`}
                    >
                      {model.image ? (
                        <img
                          src={model.image}
                          alt={`${model.brand} ${model.name}`}
                          className={`h-11 w-16 shrink-0 rounded-xl bg-slate-50 object-cover shadow-2xs ring-1 ring-slate-200/70 ${
                            model.isActive ? '' : 'opacity-60'
                          }`}
                        />
                      ) : (
                        <div
                          className={`flex h-11 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/70 ${
                            model.isActive ? '' : 'opacity-60'
                          }`}
                        >
                          <Bike className="h-5 w-5" />
                        </div>
                      )}
                      <div className={`min-w-0 flex-1 ${model.isActive ? '' : 'opacity-60'}`}>
                        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {model.brand}
                        </p>
                        <p className="truncate text-xs font-extrabold leading-snug text-slate-900 sm:text-sm">
                          {model.name}
                        </p>
                        <p
                          className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${
                            model.isActive
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Eye className="h-2.5 w-2.5" />
                          {model.isActive ? 'Visible' : 'Hidden'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/admin/Vehicle/${encodeURIComponent(model.id)}/edit`)
                          }
                          aria-label={`Edit ${model.name}`}
                          className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <details className="relative">
                          <summary
                            aria-label={`More actions for ${model.name}`}
                            className="grid size-9 cursor-pointer list-none place-items-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 [&::-webkit-details-marker]:hidden"
                          >
                            <Ellipsis className="h-4 w-4" />
                          </summary>
                          <div className="absolute right-0 top-10 z-20 w-44 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.currentTarget.closest('details')?.removeAttribute('open');
                                void toggleModel(model);
                              }}
                              className="flex min-h-9 w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              {model.isActive ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                              {model.isActive ? 'Hide model' : 'Show model'}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.currentTarget.closest('details')?.removeAttribute('open');
                                if (uploadInputRef.current) {
                                  uploadInputRef.current.dataset.modelId = model.id;
                                  uploadInputRef.current.click();
                                }
                              }}
                              disabled={uploadingModelId === model.id}
                              className="flex min-h-9 w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {uploadingModelId === model.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D9232D]" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              {uploadingModelId === model.id ? 'Uploading…' : 'Upload image'}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.currentTarget.closest('details')?.removeAttribute('open');
                                void removeModel(model);
                              }}
                              className="flex min-h-9 w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete model
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageUpload}
        className="hidden"
        aria-label="Upload vehicle model image"
      />
    </section>
  );
}
