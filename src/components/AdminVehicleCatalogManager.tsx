import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { VEHICLE_MODELS, type VehicleCatalogModel, type VehicleCatalogType } from '../data/vehicleModels';
import { readVehicleCatalogOverrides, saveVehicleCatalogOverrides, type VehicleCatalogOverrides } from '../lib/vehicleCatalogAdmin';

type Props = { notify: (message: string, tone?: 'success' | 'error' | 'info') => void };

export function AdminVehicleCatalogManager({ notify }: Props) {
  const [overrides, setOverrides] = useState<VehicleCatalogOverrides>(() => readVehicleCatalogOverrides());
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleCatalogType>('bike');
  const [image, setImage] = useState('');
  const [query, setQuery] = useState('');

  const allModels = useMemo(() => [...VEHICLE_MODELS, ...overrides.customModels], [overrides.customModels]);
  const brands = useMemo(() => Array.from(new Set(allModels.map((model) => model.brand))).sort(), [allModels]);
  const filtered = allModels.filter((model) => `${model.brand} ${model.name}`.toLowerCase().includes(query.toLowerCase()));
  const hidden = (model: VehicleCatalogModel) => overrides.hiddenBrands.includes(model.brand) || overrides.hiddenModels.includes(model.name);

  const persist = (next: VehicleCatalogOverrides, message: string) => {
    setOverrides(next);
    saveVehicleCatalogOverrides(next);
    notify(message, 'success');
  };

  const toggleBrand = (value: string) => persist({ ...overrides, hiddenBrands: overrides.hiddenBrands.includes(value) ? overrides.hiddenBrands.filter((item) => item !== value) : [...overrides.hiddenBrands, value] }, `${value} visibility updated`);
  const toggleModel = (value: string) => persist({ ...overrides, hiddenModels: overrides.hiddenModels.includes(value) ? overrides.hiddenModels.filter((item) => item !== value) : [...overrides.hiddenModels, value] }, 'Vehicle visibility updated');

  const addModel = () => {
    const cleanBrand = brand.trim();
    const cleanName = name.trim();
    if (!cleanBrand || !cleanName) return notify('Company and model name are required', 'error');
    if (allModels.some((model) => model.name.toLowerCase() === cleanName.toLowerCase())) return notify('This model already exists', 'error');
    persist({ ...overrides, customModels: [...overrides.customModels, { brand: cleanBrand, name: cleanName, type, image: image.trim() }] }, 'Vehicle model added');
    setBrand(''); setName(''); setImage('');
  };

  const updateCustomImage = (model: VehicleCatalogModel) => {
    const nextImage = window.prompt('Paste the new model image URL', model.image);
    if (nextImage === null) return;
    persist({ ...overrides, customModels: overrides.customModels.map((item) => item.name === model.name ? { ...item, image: nextImage.trim() } : item) }, 'Model image updated');
  };

  const removeCustom = (model: VehicleCatalogModel) => persist({ ...overrides, customModels: overrides.customModels.filter((item) => item.name !== model.name), hiddenModels: overrides.hiddenModels.filter((item) => item !== model.name) }, 'Custom model removed');

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D9232D]">Admin catalog</p><h2 className="mt-1 text-lg font-black text-slate-900">Vehicle companies & models</h2><p className="mt-1 text-xs text-slate-500">Add models, update images, or hide items from the customer fitment finder.</p></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles" className="rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#D9232D]" />
      </div>

      <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Company name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Model name" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
        <select value={type} onChange={(event) => setType(event.target.value as VehicleCatalogType)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"><option value="bike">Bike</option><option value="scooter">Scooter</option></select>
        <input value={image} onChange={(event) => setImage(event.target.value)} placeholder="Image URL (optional)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
        <button type="button" onClick={addModel} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D9232D] px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />Add model</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {brands.map((item) => <button key={item} type="button" onClick={() => toggleBrand(item)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${overrides.hiddenBrands.includes(item) ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}>{overrides.hiddenBrands.includes(item) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{item}</button>)}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((model) => <div key={`${model.brand}-${model.name}`} className={`flex items-center gap-3 rounded-2xl border p-2.5 ${hidden(model) ? 'border-rose-200 bg-rose-50/50 opacity-60' : 'border-slate-100 bg-white'}`}>
          <img src={model.image} alt="" className="h-12 w-16 shrink-0 rounded-xl bg-slate-100 object-contain" />
          <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-slate-400">{model.brand}</p><p className="truncate text-xs font-black text-slate-900">{model.name}</p><p className="text-[9px] font-semibold uppercase text-slate-400">{model.type}</p></div>
          <div className="flex shrink-0 gap-1"><button type="button" onClick={() => toggleModel(model.name)} aria-label="Toggle model visibility" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">{hidden(model) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>{overrides.customModels.some((item) => item.name === model.name) && <><button type="button" onClick={() => updateCustomImage(model)} aria-label="Change model image" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><ImagePlus className="h-4 w-4" /></button><button type="button" onClick={() => removeCustom(model)} aria-label="Remove model" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></>}</div>
        </div>)}
      </div>
    </section>
  );
}
