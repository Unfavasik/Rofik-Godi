import React, { useRef, useState } from 'react';
import { Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import type { Product } from '../types';
import { isValidProductColorValue, toColorPickerValue } from '../lib/productColors';

type ProductColor = Product['colors'][number];

type Props = {
  colors: Product['colors'];
  onChange: (colors: Product['colors']) => void;
  onUploadFiles?: (files: File[]) => Promise<string[]>;
};

export const AdminProductColorEditor: React.FC<Props> = ({ colors, onChange, onUploadFiles }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [urlDrafts, setUrlDrafts] = useState<Record<number, string>>({});
  const [urlError, setUrlError] = useState<Record<number, string>>({});
  const updateColor = (index: number, patch: Partial<ProductColor>) => {
    onChange(colors.map((color, colorIndex) => colorIndex === index ? { ...color, ...patch } : color));
  };
  const updateImages = (index: number, images: string[]) => updateColor(index, { images: images.filter(Boolean) });
  const openFilePicker = (index: number) => {
    fileRef.current?.setAttribute('data-color-index', String(index));
    fileRef.current?.click();
  };
  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = Number(event.currentTarget.getAttribute('data-color-index'));
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!Number.isInteger(index) || !files.length || !onUploadFiles) return;
    setUploadingIndex(index);
    try {
      const uploaded = await onUploadFiles(files);
      updateImages(index, [...(colors[index]?.images || []), ...uploaded]);
    } catch {
      // The parent editor already presents the upload error beside the form.
    } finally {
      setUploadingIndex(null);
    }
  };
  const addUrl = (index: number) => {
    const value = (urlDrafts[index] || '').trim();
    if (!value) return;
    try { new URL(value); } catch { setUrlError((current) => ({ ...current, [index]: 'Enter a valid image URL.' })); return; }
    updateImages(index, [...(colors[index]?.images || []), value]);
    setUrlDrafts((current) => ({ ...current, [index]: '' }));
    setUrlError((current) => ({ ...current, [index]: '' }));
  };

  return <section aria-label="Product color options" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-xs font-black text-slate-800">Product color options</h3>
        <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-slate-500">Set the customer-facing color and optional photos. If a color has no images, the product&apos;s main gallery is shown.</p>
      </div>
      <button type="button" onClick={() => onChange([...colors, { name: `Color ${colors.length + 1}`, hex: '#111827', bgClass: 'bg-slate-900', images: [] }])} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-700 hover:border-rose-200 hover:text-[#D9232D]"><Plus className="h-3.5 w-3.5" />Add color</button>
    </div>
    <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void uploadFiles(event); }} />
    <div className="mt-3 space-y-2.5">
      {colors.map((color, index) => {
        const validColor = isValidProductColorValue(color.hex);
        const images = color.images || [];
        return <div key={`${index}-${color.name}`} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2"><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Color {index + 1}</p><button type="button" onClick={() => onChange(colors.filter((_, colorIndex) => colorIndex !== index))} disabled={colors.length <= 1} aria-label={`Remove color ${color.name || index + 1}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button></div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block min-w-0"><span className="mb-1 block text-[10px] font-bold text-slate-500">Display name</span><input value={color.name} onChange={(event) => updateColor(index, { name: event.target.value })} placeholder="Crimson Red" aria-label={`Color name ${index + 1}`} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold outline-none focus:border-[#D9232D] focus:bg-white" /></label>
            <label className="block min-w-0"><span className="mb-1 block text-[10px] font-bold text-slate-500">Hex code or CSS color name</span><input value={color.hex} onChange={(event) => updateColor(index, { hex: event.target.value })} placeholder="#D9232D or navy" aria-label={`Color code or CSS name ${index + 1}`} aria-invalid={!validColor} className={`h-9 w-full rounded-lg border bg-slate-50 px-2.5 text-xs font-semibold outline-none focus:bg-white ${validColor ? 'border-slate-200 focus:border-[#D9232D]' : 'border-rose-300 focus:border-rose-500'}`} /></label>
            <div className="flex items-center gap-2"><label className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-slate-200" title="Choose a hex color"><input type="color" value={toColorPickerValue(color.hex)} onChange={(event) => updateColor(index, { hex: event.target.value })} aria-label={`Choose color ${index + 1}`} className="absolute inset-[-6px] h-[52px] w-[52px] cursor-pointer border-0 p-0" /></label><span aria-label={validColor ? `Preview ${color.hex}` : 'Invalid color value'} className={`h-7 w-7 shrink-0 rounded-full border border-slate-200 ${validColor ? '' : 'bg-slate-100'}`} style={validColor ? { backgroundColor: color.hex } : undefined} /></div>
          </div>
          {!validColor && <p role="alert" className="mt-1.5 text-[10px] font-semibold text-rose-600">Enter a valid hex code or CSS color name.</p>}
          <div className="mt-3 border-t border-slate-100 pt-3"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-black text-slate-600">Images for this color</p><span className="text-[10px] text-slate-400">{images.length} added</span></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => openFilePicker(index)} disabled={!onUploadFiles || uploadingIndex !== null} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">{uploadingIndex === index ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Upload images</button><div className="flex flex-1 gap-1.5"><input value={urlDrafts[index] || ''} onChange={(event) => setUrlDrafts((current) => ({ ...current, [index]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addUrl(index); } }} placeholder="Paste image URL" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-semibold outline-none focus:border-[#D9232D] focus:bg-white" /><button type="button" onClick={() => addUrl(index)} className="rounded-lg bg-slate-900 px-2.5 text-white" aria-label={`Add image URL for ${color.name}`}><Plus className="h-3.5 w-3.5" /></button></div></div>{urlError[index] && <p role="alert" className="mt-1 text-[10px] font-semibold text-rose-600">{urlError[index]}</p>}<div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">{images.map((image, imageIndex) => <div key={`${image}-${imageIndex}`} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"><img src={image} alt={`${color.name} ${imageIndex + 1}`} className="h-full w-full object-cover" /><span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-black text-white">{imageIndex === 0 ? 'Main' : imageIndex + 1}</span><button type="button" onClick={() => updateImages(index, images.filter((_, itemIndex) => itemIndex !== imageIndex))} aria-label={`Remove ${color.name} image ${imageIndex + 1}`} className="absolute right-1 top-1 rounded-full bg-slate-900/80 p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"><X className="h-3 w-3" /></button></div>)}</div></div>
        </div>;
      })}
    </div>
  </section>;
};
