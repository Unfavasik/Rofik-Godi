import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bike, Building2, Check, Eye, EyeOff, ImagePlus, Loader2, Save, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  deleteVehicleModel,
  loadVehicleModels,
  updateVehicleModel,
  uploadVehicleModelImage,
  type VehicleCatalogModel,
  type VehicleCatalogType,
} from '../lib/supabaseVehicleCatalog';

type Props = {
  modelId: string;
  notify: (message: string, tone?: 'success' | 'error' | 'info') => void;
};

export function AdminVehicleModelEdit({ modelId, notify }: Props) {
  const navigate = useNavigate();
  const [model, setModel] = useState<VehicleCatalogModel | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleCatalogType>('bike');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    void loadVehicleModels({ includeHidden: true }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        notify(`Could not load model: ${error.message}`, 'error');
      } else {
        const found = data.find((item) => item.id === modelId) || null;
        setModel(found);
        setBrand(found?.brand || '');
        setName(found?.name || '');
        setType(found?.type || 'bike');
        setIsActive(Boolean(found?.isActive));
        if (!found) notify('Vehicle model not found', 'error');
      }
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      notify(error instanceof Error ? error.message : 'Could not load vehicle model', 'error');
      setLoading(false);
    });
    return () => { active = false; };
  }, [modelId, notify]);

  const saveChanges = async () => {
    if (!model || !brand.trim() || !name.trim()) {
      notify('Company and model name are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateVehicleModel(model.id, {
        brand: brand.trim(),
        name: name.trim(),
        type,
        isActive,
      });
      setModel(updated);
      setBrand(updated.brand);
      setName(updated.name);
      setType(updated.type);
      setIsActive(Boolean(updated.isActive));
      notify('Vehicle model changes saved', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save vehicle model', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !model) return;
    if (file.size > 5 * 1024 * 1024) {
      notify('Choose an image smaller than 5MB', 'error');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadVehicleModelImage(model.id, file);
      setModel((current) => current ? { ...current, image: result.url } : current);
      notify(`Image saved as WebP (${Math.round(result.bytes / 1024)} KB)`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not upload model image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const removeModel = async () => {
    if (!model || !window.confirm(`Delete ${model.brand} ${model.name} from the vehicle catalog?`)) return;
    setDeleting(true);
    try {
      await deleteVehicleModel(model.id);
      notify('Vehicle model deleted', 'success');
      navigate('/admin/Vehicle', { replace: true });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete vehicle model', 'error');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-[#D9232D]" /></div>;
  }

  if (!model) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">This vehicle model could not be found.</div>;
  }

  return (
    <section className="mx-auto max-w-2xl overflow-hidden rounded-[26px] bg-[#f4f5f9] shadow-xl shadow-slate-200/50">
      <header className="bg-[#db1a24] px-4 pb-5 pt-3 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/admin/Vehicle')} aria-label="Back to vehicle models" className="-ml-1 rounded-full p-1 text-white transition hover:bg-white/10"><ArrowLeft className="h-6 w-6" /></button>
          <div><h1 className="text-lg font-extrabold tracking-tight">Edit Vehicle Model</h1><p className="mt-0.5 text-xs text-white/85">Update model details, image and status</p></div>
        </div>
      </header>

      <div className="space-y-3.5 px-3.5 pb-6 pt-4 sm:px-5">
        <section className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm" aria-label="Vehicle summary">
          <div className="flex items-center gap-3">
            <div className="relative flex h-[78px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-100 p-1">
              {model.image ? <img src={model.image} alt={`${model.brand} ${model.name}`} className="h-full w-full rounded-lg object-contain" /> : <ImagePlus className="h-8 w-8 text-slate-300" />}
              <span className="absolute bottom-1 right-1 rounded-full border-2 border-white bg-[#db1a24] p-1 text-white"><Bike className="h-3 w-3" /></span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-extrabold text-slate-900">{brand || model.brand} {name || model.name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Building2 className="h-3.5 w-3.5 text-slate-400" />{brand || model.brand}</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${isActive ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{isActive ? 'Visible' : 'Hidden'}</span>
              </div>
            </div>
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-[#db1a24] transition hover:bg-red-100">
              <Upload className="h-3.5 w-3.5" />{uploading ? 'Uploading…' : 'Change image'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading} className="hidden" aria-label="Change vehicle model image" />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5"><span className="grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-[#db1a24]"><Save className="h-4 w-4" /></span><h3 className="text-base font-bold text-slate-900">Model Information</h3></div>
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-800">Vehicle Type <span className="text-[#db1a24]">*</span></span><select value={type} onChange={(event) => setType(event.target.value as VehicleCatalogType)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-[#db1a24] focus:outline-none focus:ring-1 focus:ring-[#db1a24]"><option value="bike">Bike</option><option value="scooter">Scooter</option></select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-800">Company <span className="text-[#db1a24]">*</span></span><input value={brand} onChange={(event) => setBrand(event.target.value)} required maxLength={80} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-[#db1a24] focus:outline-none focus:ring-1 focus:ring-[#db1a24]" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-800">Model Name <span className="text-[#db1a24]">*</span></span><input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-[#db1a24] focus:outline-none focus:ring-1 focus:ring-[#db1a24]" /></label>
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-[68px] w-[94px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-1">{model.image ? <img src={model.image} alt="Current model preview" className="h-full w-full rounded object-contain" /> : <ImagePlus className="h-7 w-7 text-slate-300" />}</div>
              <div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-800">Model Image</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">JPG, PNG or WEBP · max 5MB. Uploaded images are converted to WebP.</p><label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#db1a24] hover:underline"><Upload className="h-3.5 w-3.5" />{uploading ? 'Uploading…' : 'Replace image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading} className="hidden" aria-label="Replace model image" /></label></div>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5"><span className="grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-[#db1a24]"><Eye className="h-4 w-4" /></span><h3 className="text-base font-bold text-slate-900">Visibility</h3></div>
          <p className="text-xs font-medium text-slate-500">Control whether this model is visible to users.</p>
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div><p className="text-xs font-bold text-slate-800">Visible to Users</p><p className="mt-0.5 text-[11px] text-slate-400">Show this model in the public catalog</p></div>
            <button type="button" role="switch" aria-checked={isActive} aria-label="Visible to users" onClick={() => setIsActive((value) => !value)} className={`relative h-6 w-12 rounded-full transition ${isActive ? 'bg-[#db1a24]' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isActive ? 'left-[26px]' : 'left-0.5'}`} /></button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3.5 pt-1">
          <button type="button" onClick={() => void removeModel()} disabled={deleting || saving} className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-white px-3 py-3.5 text-sm font-bold text-[#db1a24] shadow-sm transition hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />{deleting ? 'Deleting…' : 'Delete Model'}</button>
          <button type="button" onClick={() => void saveChanges()} disabled={saving || deleting || !brand.trim() || !name.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#db1a24] px-3 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#c4151e] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </section>
  );
}
