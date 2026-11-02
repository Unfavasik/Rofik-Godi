import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, CheckCircle2, Edit3, Eye, EyeOff, ImagePlus, Layers3, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createVehicleModel,
  deleteVehicleModel,
  loadVehicleModels,
  uploadVehicleModelImage,
  updateVehicleModel,
  type VehicleCatalogModel,
  type VehicleCatalogType,
} from '../lib/supabaseVehicleCatalog';

type Props = { notify: (message: string, tone?: 'success' | 'error' | 'info') => void };

export function AdminVehicleCatalogManager({ notify }: Props) {
  const navigate = useNavigate();
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleCatalogType>('bike');
  const [image, setImage] = useState('');
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<VehicleCatalogType>('bike');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [loading, setLoading] = useState(true);
  const [uploadingModelId, setUploadingModelId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setLoading(true);
    const result = await loadVehicleModels({ includeHidden: true });
    if (result.error) notify(`Could not load vehicle models: ${result.error.message}`, 'error');
    setModels(result.data);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const brands = useMemo(() => Array.from(new Set(models.map((model) => model.brand))).sort(), [models]);
  const typeModels = models.filter((model) => model.type === selectedType);
  const typeBrands = Array.from(new Set(typeModels.map((model) => model.brand))).sort();
  const filtered = typeModels.filter((model) =>
    (!selectedBrand || model.brand === selectedBrand) &&
    (visibilityFilter === 'all' || (visibilityFilter === 'active' ? model.isActive : !model.isActive)) &&
    `${model.brand} ${model.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  const activeCount = models.filter((model) => model.isActive).length;
  const hiddenCount = models.length - activeCount;
  const bikeCount = models.filter((model) => model.type === 'bike').length;
  const scooterCount = models.filter((model) => model.type === 'scooter').length;

  const addModel = async () => {
    const cleanBrand = brand.trim();
    const cleanName = name.trim();
    if (!cleanBrand || !cleanName) return notify('Company and model name are required', 'error');
    try {
      await createVehicleModel({ brand: cleanBrand, name: cleanName, type, image });
      setBrand(''); setName(''); setImage('');
      await refresh();
      notify('Vehicle model added to Supabase', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not add vehicle model', 'error');
    }
  };

  const toggleModel = async (model: VehicleCatalogModel) => {
    try {
      await updateVehicleModel(model.id, { isActive: !model.isActive });
      await refresh();
      notify(model.isActive ? 'Model hidden from customers' : 'Model visible to customers', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update visibility', 'error');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const modelId = event.target.dataset.modelId;
    event.target.value = '';
    if (!file || !modelId) return;
    setUploadingModelId(modelId);
    try {
      const result = await uploadVehicleModelImage(modelId, file);
      await refresh();
      notify(`Image converted to WebP and saved (${Math.round(result.bytes / 1024)} KB)`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not upload model image', 'error');
    } finally {
      setUploadingModelId(null);
    }
  };

  const toggleBrand = async (value: string) => {
    const brandModels = models.filter((model) => model.brand === value);
    const nextActive = brandModels.some((model) => !model.isActive);
    try {
      await Promise.all(brandModels.map((model) => updateVehicleModel(model.id, { isActive: nextActive })));
      await refresh();
      notify(`${value} visibility updated`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update company visibility', 'error');
    }
  };

  const removeModel = async (model: VehicleCatalogModel) => {
    if (!window.confirm(`Remove ${model.name} from the vehicle catalog?`)) return;
    try {
      await deleteVehicleModel(model.id);
      await refresh();
      notify('Vehicle model removed', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not remove model', 'error');
    }
  };

  return (
    <section className="space-y-6 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-200/40 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Fitment library</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Vehicle models</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">This is the same library customers use in Vehicle Fitment Finder. Manage bikes and scooties here once; every customer immediately sees the active catalog.</p></div>
        <div className="flex w-full gap-2 sm:w-auto"><div className="relative flex-1 sm:w-56"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search vehicles" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-[#D9232D] focus:bg-white" /></div><button type="button" onClick={() => void refresh()} aria-label="Refresh vehicle catalog" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-[#D9232D]"><RefreshCw className={loading ? 'animate-spin' : ''} /></button></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4"><div className="flex items-center gap-2 text-[#D9232D]"><Bike className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.16em]">Total models</span></div><p className="mt-2 text-2xl font-black text-slate-900">{models.length}</p><p className="mt-1 text-[11px] text-slate-500">Bike and scooter fitments</p></div>
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="flex items-center gap-2 text-emerald-700"><Eye className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.16em]">Visible to users</span></div><p className="mt-2 text-2xl font-black text-slate-900">{activeCount}</p><p className="mt-1 text-[11px] text-slate-500">Live in Vehicle Fitment Finder</p></div>
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4"><div className="flex items-center gap-2 text-blue-700"><Layers3 className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.16em]">Companies</span></div><p className="mt-2 text-2xl font-black text-slate-900">{brands.length}</p><p className="mt-1 text-[11px] text-slate-500">{bikeCount} bikes · {scooterCount} scooters</p></div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-inner">
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Add in 3 steps</p><h3 className="mt-1 text-base font-black text-slate-900">Create a new fitment model</h3></div><ImagePlus className="h-5 w-5 text-slate-300" /></div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">01 · Vehicle type</span><select value={type} onChange={(event) => setType(event.target.value as VehicleCatalogType)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#D9232D]"><option value="bike">Bike</option><option value="scooter">Scooty / Scooter</option></select></label>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">02 · Company & model</span><div className="mt-2 grid gap-2"><input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Company name" className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Model name" className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" /></div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">03 · Image & publish</span><input value={image} onChange={(event) => setImage(event.target.value)} placeholder="Optional image URL" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" /><button type="button" onClick={() => void addModel()} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-[#D9232D]"><Plus className="h-4 w-4" />Add model</button></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm"><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">01 · Choose vehicle type</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setSelectedType('bike'); setSelectedBrand(''); }} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${selectedType === 'bike' ? 'bg-[#D9232D] text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`}><Bike className="h-4 w-4" />Bike</button><button type="button" onClick={() => { setSelectedType('scooter'); setSelectedBrand(''); }} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${selectedType === 'scooter' ? 'bg-[#D9232D] text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`}><Bike className="h-4 w-4" />Scooty / Scooter</button></div></div>

      <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">02 · Choose company <span className="font-normal normal-case tracking-normal">({typeBrands.length} companies)</span></p><div className="flex rounded-lg bg-slate-100 p-0.5"><button type="button" onClick={() => setVisibilityFilter('all')} className={`rounded-md px-2 py-1 text-[10px] font-bold ${visibilityFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>All</button><button type="button" onClick={() => setVisibilityFilter('active')} className={`rounded-md px-2 py-1 text-[10px] font-bold ${visibilityFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Live {activeCount}</button><button type="button" onClick={() => setVisibilityFilter('hidden')} className={`rounded-md px-2 py-1 text-[10px] font-bold ${visibilityFilter === 'hidden' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Hidden {hiddenCount}</button></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedBrand('')} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${!selectedBrand ? 'border-[#D9232D] bg-red-50 text-[#D9232D]' : 'border-slate-200 bg-white text-slate-600'}`}>All companies</button>{typeBrands.map((item) => {
          const brandModels = typeModels.filter((model) => model.brand === item);
          const hidden = brandModels.every((model) => !model.isActive);
          return <button key={item} type="button" onClick={() => setSelectedBrand(item)} onDoubleClick={() => void toggleBrand(item)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${selectedBrand === item ? 'border-[#D9232D] bg-red-50 text-[#D9232D]' : hidden ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}>{hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{item}</button>;
        })}
      </div></div>

      {loading ? <p className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-500">Loading vehicle catalog…</p> : <div><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">03 · Models <span className="font-normal normal-case tracking-normal">({filtered.length} shown)</span></p><span className="text-[10px] font-semibold text-slate-400">Tap Edit to update a model</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((model) => <div key={model.id} className={`group flex items-center gap-3 rounded-2xl border p-2.5 transition hover:-translate-y-0.5 hover:shadow-md ${model.isActive ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50/50 opacity-60'}`}>
          {model.image ? <img src={model.image} alt="" className="h-16 w-20 shrink-0 rounded-xl bg-slate-100 object-contain" /> : <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500"><Bike className="h-7 w-7" /></div>}
          <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-slate-400">{model.brand}</p><p className="truncate text-xs font-black text-slate-900">{model.name}</p><p className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase ${model.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>{model.isActive && <CheckCircle2 />} {model.isActive ? 'visible to customers' : 'hidden from customers'}</p></div>
          <div className="flex shrink-0 flex-col gap-1"><button type="button" onClick={() => navigate(`/admin/Vehicle/${encodeURIComponent(model.id)}/edit`)} aria-label={`Edit ${model.name}`} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-[10px] font-black text-blue-700 hover:bg-blue-100"><Edit3 className="h-3.5 w-3.5" />Edit</button><div className="flex gap-1"><button type="button" onClick={() => void toggleModel(model)} aria-label="Toggle model visibility" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">{model.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button type="button" onClick={() => { if (uploadInputRef.current) { uploadInputRef.current.dataset.modelId = model.id; uploadInputRef.current.click(); } }} disabled={uploadingModelId === model.id} aria-label="Upload new model image" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"><Upload className="h-4 w-4" /></button><button type="button" onClick={() => void removeModel(model)} aria-label="Remove model" className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></div>
        </div>)}
      </div></div>}
      <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" aria-label="Upload vehicle model image" />
    </section>
  );
}
