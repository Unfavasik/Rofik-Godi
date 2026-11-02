import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Edit3, Eye, EyeOff, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
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
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleCatalogType>('bike');
  const [image, setImage] = useState('');
  const [query, setQuery] = useState('');
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
  const filtered = models.filter((model) => `${model.brand} ${model.name}`.toLowerCase().includes(query.toLowerCase()));
  const activeCount = models.filter((model) => model.isActive).length;

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

  const editModel = async (model: VehicleCatalogModel) => {
    const nextName = window.prompt('Model name', model.name);
    if (nextName === null || !nextName.trim()) return;
    try {
      await updateVehicleModel(model.id, { name: nextName });
      await refresh();
      notify('Model name updated. Use the upload button to replace its image with WebP.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update model', 'error');
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
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Fitment library</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Vehicle models</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">This is the same library customers use in Vehicle Fitment Finder. Manage bikes and scooties here once; every customer immediately sees the active catalog.</p></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles" className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4"><div className="flex items-center gap-2 text-[#D9232D]"><Bike className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.16em]">Total models</span></div><p className="mt-2 text-2xl font-black text-slate-900">{models.length}</p><p className="mt-1 text-[11px] text-slate-500">Bike and scooter fitments</p></div>
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4"><div className="flex items-center gap-2 text-emerald-700"><Eye className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.16em]">Visible to users</span></div><p className="mt-2 text-2xl font-black text-slate-900">{activeCount}</p><p className="mt-1 text-[11px] text-slate-500">Live in Vehicle Fitment Finder</p></div>
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4"><div className="flex items-center gap-2 text-blue-700"><Bike className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.16em]">Companies</span></div><p className="mt-2 text-2xl font-black text-slate-900">{brands.length}</p><p className="mt-1 text-[11px] text-slate-500">Selectable companies</p></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Add in 3 steps</p><h3 className="mt-1 text-base font-black text-slate-900">Create a new fitment model</h3></div><ImagePlus className="h-5 w-5 text-slate-300" /></div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">01 · Vehicle type</span><select value={type} onChange={(event) => setType(event.target.value as VehicleCatalogType)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#D9232D]"><option value="bike">Bike</option><option value="scooter">Scooty / Scooter</option></select></label>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">02 · Company & model</span><div className="mt-2 grid gap-2"><input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Company name" className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Model name" className="rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" /></div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">03 · Image & publish</span><input value={image} onChange={(event) => setImage(event.target.value)} placeholder="Optional image URL" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" /><button type="button" onClick={() => void addModel()} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#D9232D] px-3 py-2 text-xs font-bold text-white hover:bg-[#bf1f29]"><Plus className="h-4 w-4" />Add model</button></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {brands.map((item) => {
          const brandModels = models.filter((model) => model.brand === item);
          const hidden = brandModels.every((model) => !model.isActive);
          return <button key={item} type="button" onClick={() => void toggleBrand(item)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${hidden ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}>{hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{item}</button>;
        })}
      </div>

      {loading ? <p className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-500">Loading vehicle catalog…</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((model) => <div key={model.id} className={`flex items-center gap-3 rounded-2xl border p-2.5 ${model.isActive ? 'border-slate-100 bg-white' : 'border-rose-200 bg-rose-50/50 opacity-60'}`}>
          {model.image ? <img src={model.image} alt="" className="h-12 w-16 shrink-0 rounded-xl bg-slate-100 object-contain" /> : <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">{model.type === 'scooter' ? '🛵' : '🏍️'}</div>}
          <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-slate-400">{model.brand}</p><p className="truncate text-xs font-black text-slate-900">{model.name}</p><p className="text-[9px] font-semibold uppercase text-slate-400">{model.type} · {model.isActive ? 'visible' : 'hidden'}</p></div>
          <div className="flex shrink-0 gap-1"><button type="button" onClick={() => void toggleModel(model)} aria-label="Toggle model visibility" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">{model.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button type="button" onClick={() => void editModel(model)} aria-label="Edit model name or image URL" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => { if (uploadInputRef.current) { uploadInputRef.current.dataset.modelId = model.id; uploadInputRef.current.click(); } }} disabled={uploadingModelId === model.id} aria-label="Upload new model image" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"><Upload className="h-4 w-4" /></button><button type="button" onClick={() => void removeModel(model)} aria-label="Remove model" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div>
        </div>)}
      </div>}
      <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" aria-label="Upload vehicle model image" />
    </section>
  );
}
