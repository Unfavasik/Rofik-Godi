import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Building2, CheckCircle2, Edit3, Eye, EyeOff, ImagePlus, Layers3, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
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
  const [creating, setCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingModelId, setUploadingModelId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const createImageInputRef = useRef<HTMLInputElement | null>(null);

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
    if (imageFile && imageFile.size > 5 * 1024 * 1024) return notify('Choose an image smaller than 5MB', 'error');
    setCreating(true);
    try {
      const created = await createVehicleModel({ brand: cleanBrand, name: cleanName, type, image: imageFile ? '' : image });
      if (imageFile) await uploadVehicleModelImage(created.id, imageFile);
      setBrand(''); setName(''); setImage(''); setImageFile(null);
      await refresh();
      notify('Vehicle model added to Supabase', 'success');
    } catch (error) {
      await refresh();
      notify(error instanceof Error ? `Model may be saved, but setup failed: ${error.message}` : 'Could not add vehicle model', 'error');
    } finally {
      setCreating(false);
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
    <section className="mx-auto max-w-[480px] space-y-4 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-200/40 sm:p-6">
      <div><p className="text-3xl font-black tracking-tight text-[#10213f] sm:text-4xl">Vehicle Models</p><p className="mt-1 text-base font-medium text-slate-400">Vehicle fitment library and model management</p></div>
      <div className="relative min-h-[190px] overflow-hidden rounded-[22px] bg-[#210b12] shadow-lg"><div className="absolute inset-0 bg-gradient-to-r from-[#210b12] via-[#690b13]/95 to-[#d5111b]/70" /><img src="/images/premium-seat-cover-hero.webp" alt="Premium vehicle seat cover" className="absolute inset-y-0 right-0 h-full w-[62%] object-cover object-center opacity-95 mix-blend-screen" /><div className="relative flex min-h-[190px] max-w-[430px] flex-col justify-center p-6 sm:p-8"><span className="w-fit rounded-full bg-[#e84650] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-white">Fitment library</span><h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Vehicle Models</h1><p className="mt-2 max-w-[250px] text-sm font-medium leading-5 text-white/80">Manage bike and scooter fitments, companies, and models in one place.</p></div></div>
      <div className="flex gap-3"><div className="relative flex-1"><Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" /><input aria-label="Search vehicles" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles, models or companies..." className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-4 focus:ring-red-50" /></div><button type="button" aria-label="Open filters" className="grid size-14 shrink-0 place-items-center rounded-2xl bg-red-50 text-[#D9232D] shadow-sm"><SlidersHorizontal /></button><button type="button" onClick={() => void refresh()} aria-label="Refresh vehicle catalog" className="hidden size-14 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-[#D9232D] sm:grid"><RefreshCw className={loading ? 'animate-spin' : ''} /></button></div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4"><div className="flex items-center gap-3 text-[#D9232D]"><span className="grid size-10 place-items-center rounded-xl bg-red-100"><Bike /></span><span className="text-sm font-bold text-[#10213f]">Total Models</span></div><p className="mt-2 pl-1 text-3xl font-black text-[#10213f]">{models.length}</p></div>
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="flex items-center gap-3 text-emerald-600"><span className="grid size-10 place-items-center rounded-xl bg-emerald-100"><Eye /></span><span className="text-sm font-bold text-[#10213f]">Visible to Users</span></div><p className="mt-2 pl-1 text-3xl font-black text-[#10213f]">{activeCount}</p></div>
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4"><div className="flex items-center gap-3 text-blue-600"><span className="grid size-10 place-items-center rounded-xl bg-blue-100"><Building2 /></span><span className="text-sm font-bold text-[#10213f]">Companies</span></div><p className="mt-2 pl-1 text-3xl font-black text-[#10213f]">{brands.length}</p></div>
      </div>

      <div className="rounded-[22px] border border-slate-200/80 bg-gradient-to-br from-white to-red-50/30 p-5 shadow-lg shadow-slate-200/30 sm:p-6">
        <div className="mb-5 flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-[#ef3340] text-white shadow-lg shadow-red-200"><Plus /></span><div><h3 className="text-xl font-black text-[#10213f]">Create a New Fitment Model</h3><p className="mt-1 text-sm text-slate-500">Add a vehicle, company and model with image.</p></div></div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vehicle Type <b className="text-[#D9232D]">*</b></span><select value={type} onChange={(event) => setType(event.target.value as VehicleCatalogType)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#D9232D]"><option value="bike">Bike</option><option value="scooter">Scooty / Scooter</option></select></label>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Company <b className="text-[#D9232D]">*</b> &amp; Model <b className="text-[#D9232D]">*</b></span><div className="mt-2 grid gap-2"><input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Company name" className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Model name" className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" /></div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Model Image <span className="font-normal normal-case">(Optional)</span></span><button type="button" onClick={() => createImageInputRef.current?.click()} className="mt-2 flex min-h-20 w-full flex-col items-center justify-center rounded-lg border border-dashed border-red-200 bg-slate-50 px-2 py-3 text-center hover:bg-red-50"><ImagePlus className="h-5 w-5 text-[#D9232D]" /><span className="mt-1 max-w-full truncate text-[11px] font-semibold text-slate-700">{imageFile?.name || 'Tap to upload image'}</span><span className="text-[9px] text-slate-400">JPG, PNG or WEBP · max 5MB</span></button><input ref={createImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} className="hidden" aria-label="Choose vehicle model image" /><button type="button" onClick={() => void addModel()} disabled={creating} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#e51d2a] px-3 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-[#bf1f29] disabled:cursor-wait disabled:opacity-60">{creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{creating ? 'Adding model…' : 'Add model'}</button><input value={image} onChange={(event) => setImage(event.target.value)} placeholder="Or paste image URL" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" /></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm"><p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">01 · Choose vehicle type</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setSelectedType('bike'); setSelectedBrand(''); }} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${selectedType === 'bike' ? 'bg-[#D9232D] text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`}><Bike className="h-4 w-4" />Bike</button><button type="button" onClick={() => { setSelectedType('scooter'); setSelectedBrand(''); }} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black transition ${selectedType === 'scooter' ? 'bg-[#D9232D] text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'}`}><Bike className="h-4 w-4" />Scooty / Scooter</button></div></div>

      <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">02 · Choose company <span className="font-normal normal-case tracking-normal">({typeBrands.length} companies)</span></p><div className="flex rounded-lg bg-slate-100 p-0.5"><button type="button" onClick={() => setVisibilityFilter('all')} className={`rounded-md px-2 py-1 text-[10px] font-bold ${visibilityFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>All</button><button type="button" onClick={() => setVisibilityFilter('active')} className={`rounded-md px-2 py-1 text-[10px] font-bold ${visibilityFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Live {activeCount}</button><button type="button" onClick={() => setVisibilityFilter('hidden')} className={`rounded-md px-2 py-1 text-[10px] font-bold ${visibilityFilter === 'hidden' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Hidden {hiddenCount}</button></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><button type="button" onClick={() => setSelectedBrand('')} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${!selectedBrand ? 'border-[#D9232D] bg-red-50 text-[#D9232D]' : 'border-slate-200 bg-white text-slate-600'}`}>All companies</button>{typeBrands.map((item) => {
          const brandModels = typeModels.filter((model) => model.brand === item);
          const hidden = brandModels.every((model) => !model.isActive);
          return <button key={item} type="button" onClick={() => setSelectedBrand(item)} onDoubleClick={() => void toggleBrand(item)} className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-[11px] font-bold ${selectedBrand === item ? 'border-[#D9232D] bg-red-50 text-[#D9232D]' : hidden ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}>{hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{item}</button>;
        })}
      </div></div>

      {loading ? <p className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-500">Loading vehicle catalog…</p> : <div><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">03 · Models <span className="font-normal normal-case tracking-normal">({filtered.length} shown)</span></p><span className="text-[10px] font-semibold text-slate-400">Tap Edit to update a model</span></div><div className="flex flex-col gap-2">
        {filtered.map((model) => <div key={model.id} className={`group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${model.isActive ? '' : 'bg-rose-50/50 opacity-60'}`}>
          {model.image ? <img src={model.image} alt="" className="h-14 w-16 shrink-0 rounded-xl bg-slate-50 object-contain p-1" /> : <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><Bike className="h-7 w-7" /></div>}
          <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-slate-400">{model.brand}</p><p className="truncate text-xs font-black text-slate-900">{model.name}</p><p className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase ${model.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>{model.isActive && <CheckCircle2 />} {model.isActive ? 'visible to customers' : 'hidden from customers'}</p></div>
          <div className="flex shrink-0 flex-col gap-1"><button type="button" onClick={() => navigate(`/admin/Vehicle/${encodeURIComponent(model.id)}/edit`)} aria-label={`Edit ${model.name}`} className="grid size-8 place-items-center rounded-lg bg-blue-50/70 text-blue-600 hover:bg-blue-100"><Edit3 className="h-3.5 w-3.5" /></button><div className="flex gap-1"><button type="button" onClick={() => void toggleModel(model)} aria-label="Toggle model visibility" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">{model.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button type="button" onClick={() => { if (uploadInputRef.current) { uploadInputRef.current.dataset.modelId = model.id; uploadInputRef.current.click(); } }} disabled={uploadingModelId === model.id} aria-label="Upload new model image" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"><Upload className="h-4 w-4" /></button><button type="button" onClick={() => void removeModel(model)} aria-label="Remove model" className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></div>
        </div>)}
      </div></div>}
      <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" aria-label="Upload vehicle model image" />
    </section>
  );
}
