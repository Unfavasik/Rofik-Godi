import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, Eye, EyeOff, Plus, Trash2, Upload } from 'lucide-react';
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
        <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Supabase catalog</p><h2 className="mt-1 text-lg font-black text-slate-900">Vehicle companies & models</h2><p className="mt-1 text-xs text-slate-500">Every customer sees active rows from Supabase. Add models, edit names/images, or hide items without changing app code.</p></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles" className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" />
      </div>

      <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Company name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Model name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
        <select value={type} onChange={(event) => setType(event.target.value as VehicleCatalogType)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"><option value="bike">Bike</option><option value="scooter">Scooter</option></select>
        <input value={image} onChange={(event) => setImage(event.target.value)} placeholder="Image URL (optional)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
        <button type="button" onClick={() => void addModel()} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D9232D] px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />Add model</button>
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
