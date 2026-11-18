import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bike,
  Building2,
  Camera,
  Check,
  ChevronDown,
  CloudUpload,
  EllipsisVertical,
  Eye,
  Image as ImageIcon,
  Info,
  Link2,
  Loader2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  deleteVehicleModel,
  loadVehicleModels,
  slugifyVehicleModelName,
  updateVehicleModel,
  uploadVehicleModelImage,
  type VehicleCatalogModel,
  type VehicleCatalogType,
} from '../lib/supabaseVehicleCatalog';

type Props = {
  modelId: string;
  notify: (message: string, tone?: 'success' | 'error' | 'info') => void;
};

const MAX_DESCRIPTION_LENGTH = 200;

export function AdminVehicleModelEdit({ modelId, notify }: Props) {
  const navigate = useNavigate();
  const [model, setModel] = useState<VehicleCatalogModel | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleCatalogType>('bike');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        setSlug(found?.slug || slugifyVehicleModelName(found?.name || ''));
        setDescription(found?.shortDescription || '');
        setIsActive(Boolean(found?.isActive));
        setAllBrands(Array.from(new Set(data.map((item) => item.brand))).sort());
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

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugifyVehicleModelName(value));
  };

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
        slug: slug.trim() || slugifyVehicleModelName(name),
        shortDescription: description,
      });
      setModel(updated);
      setBrand(updated.brand);
      setName(updated.name);
      setType(updated.type);
      setSlug(updated.slug || '');
      setDescription(updated.shortDescription || '');
      setIsActive(Boolean(updated.isActive));
      notify('Vehicle model changes saved', 'success');
      // Mirror the profile-edit flow: save, then return to the model list.
      navigate('/admin/Vehicle');
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

  const removeImage = async () => {
    if (!model || !model.image) return;
    setRemovingImage(true);
    try {
      await updateVehicleModel(model.id, { image: '' });
      setModel((current) => current ? { ...current, image: '' } : current);
      notify('Model image removed', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not remove model image', 'error');
    } finally {
      setRemovingImage(false);
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

  const displayName = name || model.name;
  const displayBrand = brand || model.brand;

  return (
    <section className="min-h-full w-full max-w-full overflow-x-hidden bg-[#F4F5F9]">
      <header className="bg-[#db1a24] px-4 pb-4 pt-3 text-white sm:px-5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button type="button" onClick={() => navigate('/admin/Vehicle')} aria-label="Back to vehicle models" className="-ml-1 grid size-9 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold tracking-tight sm:text-lg">Edit Vehicle Model</h1>
            <p className="mt-0.5 truncate text-[11px] text-white/85">Update model details, image and status</p>
          </div>
          <details className="relative shrink-0">
            <summary aria-label="More options" className="grid size-9 cursor-pointer list-none place-items-center rounded-full text-white transition hover:bg-white/10 [&::-webkit-details-marker]:hidden">
              <EllipsisVertical className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 top-10 z-30 w-44 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); void removeModel(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-3.5 w-3.5" />Delete model
              </button>
            </div>
          </details>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[440px] space-y-3 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5 sm:px-4">
        <section className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm" aria-label="Vehicle summary">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-3">
            <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Change model image" className="relative h-[72px] w-[96px] shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
              {model.image ? (
                <img src={model.image} alt={`${displayBrand} ${displayName}`} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center"><ImageIcon className="h-7 w-7 text-slate-300" /></span>
              )}
              <span className="absolute bottom-1 right-1 grid size-7 place-items-center rounded-full border-2 border-white bg-[#e5454d] text-white shadow-sm">
                <Camera className="h-3 w-3" />
              </span>
            </button>
            <div className="w-full min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="min-w-0 truncate pt-0.5 text-base font-extrabold leading-tight tracking-tight text-slate-900">{displayName}</h2>
                <label className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-[#FCEBEB] px-2.5 py-1 text-[10.5px] font-extrabold text-[#db1a24] transition hover:bg-red-100">
                  <Pencil className="h-3 w-3" />{uploading ? 'Uploading…' : 'Change Image'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading} className="hidden" aria-label="Change vehicle model image" />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500"><Building2 className="h-3.5 w-3.5 text-slate-400" />{displayBrand}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  <Eye className="h-3 w-3" />{isActive ? 'Visible' : 'Hidden'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#FCEBEB] text-[#db1a24]"><Pencil className="h-3.5 w-3.5" /></span>
            <h3 className="text-sm font-extrabold text-slate-900">Model Information</h3>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold text-slate-900">Vehicle Type <span className="text-[#db1a24]">*</span></span>
            <span className="relative block">
              <Bike className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#db1a24]" />
              <select value={type} onChange={(event) => setType(event.target.value as VehicleCatalogType)} className="min-h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-9 text-base font-semibold text-slate-800 outline-none focus:border-[#db1a24] focus:ring-1 focus:ring-[#db1a24] sm:text-xs">
                <option value="bike">Bike</option>
                <option value="scooter">Scooty / Scooter</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            </span>
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-extrabold text-slate-900">Company <span className="text-[#db1a24]">*</span></span>
              <span className="relative block">
                <select value={brand} onChange={(event) => setBrand(event.target.value)} className="min-h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-base font-semibold text-slate-800 outline-none focus:border-[#db1a24] focus:ring-1 focus:ring-[#db1a24] sm:text-xs">
                  {brand && !allBrands.includes(brand) && <option value={brand}>{brand}</option>}
                  {allBrands.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              </span>
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-extrabold text-slate-900">Model Name <span className="text-[#db1a24]">*</span></span>
              <input value={name} onChange={(event) => handleNameChange(event.target.value)} required maxLength={120} className="min-h-9 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-base font-semibold text-slate-800 outline-none focus:border-[#db1a24] focus:ring-1 focus:ring-[#db1a24] sm:text-xs" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-extrabold text-slate-900">Model Slug (URL) <Info className="h-3.5 w-3.5 text-slate-400" /></span>
            <span className="relative block">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }} placeholder="model-url-slug" maxLength={140} className="min-h-9 w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-base font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#db1a24] focus:ring-1 focus:ring-[#db1a24] sm:text-xs" />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold text-slate-900">Short Description <span className="font-medium text-slate-400">(Optional)</span></span>
            <span className="relative block">
              <textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH))} maxLength={MAX_DESCRIPTION_LENGTH} rows={3} placeholder="Write a short description for this model..." className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 pb-6 text-base font-medium leading-relaxed text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-[#db1a24] focus:ring-1 focus:ring-[#db1a24] sm:text-xs" />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[10.5px] font-medium text-slate-400">{description.length}/{MAX_DESCRIPTION_LENGTH}</span>
            </span>
          </label>
        </section>

        <section className="space-y-2.5 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#FCEBEB] text-[#db1a24]"><ImageIcon className="h-3.5 w-3.5" /></span>
            <h3 className="text-sm font-extrabold text-slate-900">Model Image</h3>
          </div>
          <p className="text-[11px] font-medium text-slate-500">Update the model image — any size works, auto-cropped to 800×600 WebP (Max 5MB)</p>
          <div className="flex flex-col items-stretch gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-2.5 sm:flex-row sm:items-center">
            {model.image ? (
              <div className="relative mx-auto aspect-[4/3] w-full max-w-[140px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white sm:mx-0 sm:h-[72px] sm:w-[96px]">
                <img src={model.image} alt="Current model preview" className="h-full w-full object-cover" />
                <button type="button" onClick={() => void removeImage()} disabled={removingImage} aria-label="Remove model image" className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white text-slate-600 shadow transition hover:text-rose-600 disabled:opacity-50">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="mx-auto grid h-[72px] w-[96px] shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-300 sm:mx-0"><ImageIcon className="h-6 w-6" /></div>
            )}
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex min-h-9 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-center transition hover:opacity-80 disabled:opacity-60">
              <CloudUpload className={`h-7 w-7 text-[#db1a24] ${uploading ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-extrabold text-slate-900">{uploading ? 'Uploading…' : 'Replace Image'}</span>
              <span className="text-[10.5px] font-medium text-slate-400">Tap to upload or choose from gallery</span>
            </button>
          </div>
        </section>

        <section className="space-y-2.5 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#FCEBEB] text-[#db1a24]"><Eye className="h-3.5 w-3.5" /></span>
            <h3 className="text-sm font-extrabold text-slate-900">Visibility</h3>
          </div>
          <p className="text-[11px] font-medium text-slate-500">Control whether this model is visible to users.</p>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#FDF1F1] p-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FCEBEB] text-[#db1a24]"><Eye className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-slate-900">Visible to Users</p>
                <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-400">Show this model in the public catalog</p>
              </div>
            </div>
            <button type="button" role="switch" aria-checked={isActive} aria-label="Visible to users" onClick={() => setIsActive((value) => !value)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${isActive ? 'bg-[#db1a24]' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isActive ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2 sm:gap-3">
          <button type="button" onClick={() => void removeModel()} disabled={deleting || saving} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FCEBEB] px-3 py-2 text-xs font-extrabold text-[#db1a24] transition hover:bg-red-100 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" />{deleting ? 'Deleting…' : 'Delete Model'}
          </button>
          <button type="button" onClick={() => void saveChanges()} disabled={saving || deleting || !brand.trim() || !name.trim()} className="banner-cta-shine inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#db1a24] px-3 py-2 text-xs font-extrabold text-white shadow-sm shadow-red-600/20 transition hover:bg-[#c4151e] hover:shadow-md active:scale-[0.98] disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} className="hidden" aria-label="Upload vehicle model image" />
    </section>
  );
}
