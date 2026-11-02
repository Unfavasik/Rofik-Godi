import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ImagePlus, Loader2, Save, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  loadVehicleModels,
  updateVehicleModel,
  uploadVehicleModelImage,
  type VehicleCatalogModel,
} from '../lib/supabaseVehicleCatalog';

type Props = {
  modelId: string;
  notify: (message: string, tone?: 'success' | 'error' | 'info') => void;
};

export function AdminVehicleModelEdit({ modelId, notify }: Props) {
  const navigate = useNavigate();
  const [model, setModel] = useState<VehicleCatalogModel | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    void loadVehicleModels({ includeHidden: true }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        notify(`Could not load model: ${error.message}`, 'error');
      } else {
        const found = data.find((item) => item.id === modelId) || null;
        setModel(found);
        setName(found?.name || '');
        if (!found) notify('Vehicle model not found', 'error');
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [modelId, notify]);

  const saveName = async () => {
    if (!model || !name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateVehicleModel(model.id, { name });
      setModel(updated);
      setName(updated.name);
      notify('Model name saved', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save model name', 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !model) return;
    setUploading(true);
    try {
      const result = await uploadVehicleModelImage(model.id, file);
      setModel({ ...model, image: result.url });
      notify(`New image converted to WebP and saved (${Math.round(result.bytes / 1024)} KB)`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not upload model image', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-[#D9232D]" /></div>;
  }

  if (!model) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">This vehicle model could not be found.</div>;
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <button type="button" onClick={() => navigate('/admin/Vehicle')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to Vehicle models</button>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">Vehicle model editor</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Edit {model.name}</h2><p className="mt-1 text-xs text-slate-500">Update the name or replace the model image. Uploaded images are automatically converted to WebP.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{model.type} · {model.brand}</span></div>
        <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="space-y-3"><div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">{model.image ? <img src={model.image} alt={model.name} className="h-full w-full object-contain" /> : <ImagePlus className="h-10 w-10 text-slate-300" />}</div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#D9232D] px-3 py-2.5 text-xs font-black text-[#D9232D] hover:bg-red-50"><Upload className="h-4 w-4" />{uploading ? 'Converting to WebP…' : 'Upload new image'}<input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} className="hidden" /></label><p className="text-center text-[10px] leading-4 text-slate-400">JPG, PNG or any image · max 10MB<br />Saved as 800×800 WebP</p></div>
          <div className="space-y-5"><label className="block"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Model name</span><input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#D9232D] focus:ring-2 focus:ring-red-100" /></label><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Company</p><p className="mt-1 text-sm font-black text-slate-800">{model.brand}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vehicle type</p><p className="mt-1 text-sm font-black capitalize text-slate-800">{model.type}</p></div></div><button type="button" onClick={() => void saveName()} disabled={saving || !name.trim() || name.trim() === model.name} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-5 py-3 text-xs font-black text-white shadow-sm hover:bg-[#bf1f29] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save model name</button><div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-[11px] font-semibold text-emerald-700"><Check className="h-4 w-4" />Changes sync to Vehicle Fitment Finder automatically.</div></div>
        </div>
      </div>
    </section>
  );
}
