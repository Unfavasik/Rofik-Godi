import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Building2, CheckCircle2, Edit3, Eye, EyeOff, ImagePlus, MoreHorizontal, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
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
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<VehicleCatalogType>('bike');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);
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
  const displayedBrands = showAllBrands ? typeBrands : typeBrands.slice(0, 9);
  const filtered = typeModels.filter((model) =>
    (!selectedBrand || model.brand === selectedBrand) &&
    (visibilityFilter === 'all' || (visibilityFilter === 'active' ? model.isActive : !model.isActive)) &&
    `${model.brand} ${model.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  const activeCount = models.filter((model) => model.isActive).length;
  const hiddenCount = models.length - activeCount;

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
      setBrand(''); setName(''); setImageFile(null);
      if (imageFile) await uploadVehicleModelImage(createdModel.id, imageFile);
      await refresh();
      notify('Vehicle model added to Supabase', 'success');
    } catch (error) {
      await refresh();
      notify(error instanceof Error ? (createdModel ? `Model added, but image upload failed: ${error.message}` : error.message) : 'Could not add vehicle model', 'error');
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
    <section className="mx-auto max-w-[480px] space-y-4 bg-[#F8FAFC] p-4 sm:p-4">
      <div><p className="text-[26px] font-extrabold leading-tight tracking-tight text-[#0B1528]">Vehicle Models</p><p className="mt-0.5 text-[13px] font-medium text-slate-400">Vehicle fitment library and model management</p></div>
      <div className="relative min-h-[140px] overflow-hidden rounded-2xl bg-[#210b12] shadow-sm"><div className="absolute inset-0 bg-gradient-to-r from-[#210b12] via-[#690b13]/95 to-[#d5111b]/70" /><img src="/images/premium-seat-cover-hero.webp" alt="Premium vehicle seat cover" className="absolute inset-y-0 right-0 h-full w-[62%] object-cover object-center opacity-95 mix-blend-screen" /><div className="relative flex min-h-[140px] max-w-[430px] flex-col justify-center p-5"><span className="w-fit rounded-full bg-[#e84650] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">Fitment library</span><h1 className="mt-2 text-2xl font-black tracking-tight text-white">Vehicle Models</h1><p className="mt-1 max-w-[230px] text-[12px] font-medium leading-[17px] text-white/85">Manage bike and scooter fitments, companies, and models in one place.</p></div></div>
      <div className="flex gap-2.5"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input aria-label="Search vehicles" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles, models or companies..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[13px] font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-2 focus:ring-red-50" /></div><button type="button" onClick={() => setVisibilityFilter((current) => current === 'all' ? 'active' : current === 'active' ? 'hidden' : 'all')} aria-label={`Cycle visibility filter, currently ${visibilityFilter}`} title={`Visibility: ${visibilityFilter}`} className={`grid size-11 shrink-0 place-items-center rounded-xl shadow-sm ${visibilityFilter === 'all' ? 'bg-red-50 text-[#D9232D]' : 'bg-[#D9232D] text-white'}`}><SlidersHorizontal className="h-4 w-4" /></button><button type="button" onClick={() => void refresh()} aria-label="Refresh vehicle catalog" className="hidden size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-[#D9232D] sm:grid"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-red-100 bg-[#FDECEC] p-3"><div className="flex items-center gap-1.5 text-[#D9232D]"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-red-100"><Bike className="h-4 w-4" /></span><span className="text-[10px] font-bold leading-tight text-slate-700">Total Models</span></div><p className="mt-1.5 pl-1 text-[21px] font-black leading-none text-[#10213f]">{models.length}</p></div>
        <div className="rounded-xl border border-emerald-100 bg-[#E8F8F0] p-3"><div className="flex items-center gap-1.5 text-emerald-600"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-100"><Eye className="h-4 w-4" /></span><span className="text-[10px] font-bold leading-tight text-slate-700">Visible to Users</span></div><p className="mt-1.5 pl-1 text-[21px] font-black leading-none text-[#10213f]">{activeCount}</p></div>
        <div className="rounded-xl border border-blue-100 bg-[#EBF3FE] p-3"><div className="flex items-center gap-1.5 text-blue-600"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-100"><Building2 className="h-4 w-4" /></span><span className="text-[10px] font-bold leading-tight text-slate-700">Companies</span></div><p className="mt-1.5 pl-1 text-[21px] font-black leading-none text-[#10213f]">{brands.length}</p></div>
      </div>

      <div className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e5252a] text-white"><Plus className="h-5 w-5" /></span><div><h3 className="text-[16px] font-extrabold leading-tight text-[#10213f]">Create a New Fitment Model</h3><p className="mt-0.5 text-[12px] font-medium text-slate-500">Add a vehicle, company and model with image.</p></div></div>
        <div className="space-y-3">
          <label className="block"><span className="mb-1.5 block text-[12px] font-bold text-slate-800">Vehicle Type <b className="text-[#D9232D]">*</b></span><span className="relative block"><Bike className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D71920]" /><select value={type} onChange={(event) => setType(event.target.value as VehicleCatalogType)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-[13px] font-semibold text-slate-800 outline-none focus:border-[#D9232D] focus:ring-1 focus:ring-[#D9232D]"><option value="bike">Bike</option><option value="scooter">Scooty / Scooter</option></select></span></label>
          <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[12px] font-bold text-slate-800">Company <b className="text-[#D9232D]">*</b></span><input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Company name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-[#D9232D]" /></label><label className="block"><span className="mb-1.5 block text-[12px] font-bold text-slate-800">Model <b className="text-[#D9232D]">*</b></span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Model name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-[#D9232D]" /></label></div>
          <div><p className="mb-1.5 text-[12px] font-bold text-slate-800">Model Image <span className="font-normal text-slate-400">(Optional)</span></p><button type="button" onClick={() => createImageInputRef.current?.click()} className="flex min-h-[70px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-[#FBFBFC] px-2 py-3 text-center transition hover:bg-red-50/40"><ImagePlus className="h-6 w-6 text-[#D71920]" /><span className="mt-1 text-[12px] font-semibold text-slate-700">{imageFile?.name || 'Tap to upload image'}</span><span className="text-[10px] font-medium text-slate-400">JPG, PNG or WEBP (Max 5MB)</span></button><input ref={createImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setImageFile(event.target.files?.[0] || null); event.target.value = ''; }} className="hidden" aria-label="Choose vehicle model image" /></div>
          <button type="button" onClick={() => void addModel()} disabled={creating} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d71920] py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#bf1f29] disabled:cursor-wait disabled:opacity-60">{creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{creating ? 'Adding model…' : 'Add Model'}</button>
        </div>
      </div>

      <div className="space-y-2 pt-1"><h3 className="text-[13px] font-extrabold text-[#0B1528]">01. Choose Vehicle Type</h3><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setSelectedType('bike'); setSelectedBrand(''); setShowAllBrands(false); }} className={`flex items-center justify-center gap-2 rounded-full border py-2 px-3 text-[12px] font-bold transition ${selectedType === 'bike' ? 'border-red-400 bg-[#FCEBEB] text-[#D71920] shadow-sm' : 'border-slate-100 bg-white text-slate-800 shadow-sm hover:bg-slate-50'}`}><Bike className="h-4 w-4" />Bike</button><button type="button" onClick={() => { setSelectedType('scooter'); setSelectedBrand(''); setShowAllBrands(false); }} className={`flex items-center justify-center gap-2 rounded-full border py-2 px-3 text-[12px] font-bold transition ${selectedType === 'scooter' ? 'border-red-400 bg-[#FCEBEB] text-[#D71920] shadow-sm' : 'border-slate-100 bg-white text-slate-800 shadow-sm hover:bg-slate-50'}`}><Bike className="h-4 w-4 text-amber-500" />Scooty / Scooter</button></div></div>

      <div className="space-y-2 pt-1"><div className="flex items-center justify-between"><h3 className="text-[13px] font-extrabold text-[#0B1528]">02. Choose Company <span className="text-[12px] font-medium text-slate-400">({typeBrands.length} companies)</span></h3>{typeBrands.length > 9 && <button type="button" onClick={() => setShowAllBrands((value) => !value)} className="text-[12px] font-bold text-[#D71920]">{showAllBrands ? 'Show Less' : 'View All'}</button>}</div><div className="grid grid-cols-3 gap-2">{displayedBrands.map((item) => { const active = selectedBrand === item; const initials = item.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); return <button key={item} type="button" onClick={() => setSelectedBrand(active ? '' : item)} className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-[10px] font-bold shadow-sm transition ${active ? 'border-red-200 bg-[#FCEBEB] text-slate-900' : 'border-slate-100 bg-white text-slate-800 hover:border-red-200'}`}><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[8px] font-black text-[#D71920]">{initials}</span><span className="truncate">{item}</span></button>; })}</div></div>

      {loading ? <p className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-500">Loading vehicle catalog…</p> : <div><div className="mb-2 flex items-center justify-between"><p className="text-[13px] font-extrabold text-[#0B1528]">03. Models <span className="text-[12px] font-medium text-slate-400">({typeModels.length} total)</span></p><span className="text-[10px] font-medium text-slate-400">Tap a model to manage</span></div><div className="flex flex-col overflow-visible rounded-2xl border border-slate-100 bg-white px-3 shadow-sm">
        {filtered.length === 0 ? <div className="px-2 py-10 text-center"><p className="text-sm font-bold text-slate-700">No vehicle models found</p><p className="mt-1 text-xs text-slate-400">Try another search or clear the current filters.</p><button type="button" onClick={() => { setQuery(''); setSelectedBrand(''); setVisibilityFilter('all'); }} className="mt-3 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-[#D9232D]">Clear filters</button></div> : filtered.map((model) => <div key={model.id} className={`group flex min-h-[74px] items-center justify-between gap-2.5 border-b border-slate-100 py-2.5 last:border-0 ${model.isActive ? '' : 'bg-rose-50/50 opacity-60'}`}>
          {model.image ? <img src={model.image} alt={`${model.brand} ${model.name}`} className="h-14 w-20 shrink-0 rounded-xl bg-slate-50 object-contain p-1" /> : <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><Bike className="h-7 w-7" /></div>}
          <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-medium text-slate-400">{model.brand}</p><p className="truncate text-[13px] font-extrabold leading-snug text-slate-900">{model.name}</p><p className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${model.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{model.isActive && <CheckCircle2 className="h-3 w-3" />}{model.isActive ? 'Visible' : 'Hidden'}</p></div>
          <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => navigate(`/admin/Vehicle/${encodeURIComponent(model.id)}/edit`)} aria-label={`Edit ${model.name}`} className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit3 className="h-4 w-4" /></button><details className="relative"><summary aria-label={`More actions for ${model.name}`} className="grid size-9 cursor-pointer list-none place-items-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"><MoreHorizontal className="h-5 w-5" /></summary><div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); void toggleModel(model); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">{model.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{model.isActive ? 'Hide model' : 'Show model'}</button><button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); if (uploadInputRef.current) { uploadInputRef.current.dataset.modelId = model.id; uploadInputRef.current.click(); } }} disabled={uploadingModelId === model.id} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Upload className="h-3.5 w-3.5" />{uploadingModelId === model.id ? 'Uploading…' : 'Upload image'}</button><button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); void removeModel(model); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Delete model</button></div></details></div>
        </div>)}
      </div></div>}
      <input ref={uploadInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" aria-label="Upload vehicle model image" />
    </section>
  );
}
