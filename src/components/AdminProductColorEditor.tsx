import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Product } from '../types';
import { isValidProductColorValue, toColorPickerValue } from '../lib/productColors';

type ProductColor = Product['colors'][number];

export const AdminProductColorEditor: React.FC<{
  colors: Product['colors'];
  onChange: (colors: Product['colors']) => void;
}> = ({ colors, onChange }) => {
  const updateColor = (index: number, patch: Partial<ProductColor>) => {
    onChange(colors.map((color, colorIndex) => colorIndex === index ? { ...color, ...patch } : color));
  };

  return <section aria-label="Product color options" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-xs font-black text-slate-800">Product color options</h3>
        <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-slate-500">
          Set the name customers see and enter a hex code or CSS color name for the swatch, such as “Crimson Red” with “#D9232D”, or “Navy” with “navy”.
        </p>
      </div>
      <button type="button" onClick={() => onChange([...colors, { name: `Color ${colors.length + 1}`, hex: '#111827', bgClass: 'bg-slate-900' }])} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-700 hover:border-rose-200 hover:text-[#D9232D]">
        <Plus className="h-3.5 w-3.5" />Add color
      </button>
    </div>
    <div className="mt-3 space-y-2.5">
      {colors.map((color, index) => {
        const validColor = isValidProductColorValue(color.hex);
        return <div key={`${index}-${color.name}`} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Color {index + 1}</p>
            <button type="button" onClick={() => onChange(colors.filter((_, colorIndex) => colorIndex !== index))} disabled={colors.length <= 1} aria-label={`Remove color ${color.name || index + 1}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block min-w-0">
              <span className="mb-1 block text-[10px] font-bold text-slate-500">Display name</span>
              <input value={color.name} onChange={(event) => updateColor(index, { name: event.target.value })} placeholder="Crimson Red" aria-label={`Color name ${index + 1}`} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold outline-none focus:border-[#D9232D] focus:bg-white" />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-[10px] font-bold text-slate-500">Hex code or CSS color name</span>
              <input value={color.hex} onChange={(event) => updateColor(index, { hex: event.target.value })} placeholder="#D9232D or navy" aria-label={`Color code or CSS name ${index + 1}`} aria-invalid={!validColor} className={`h-9 w-full rounded-lg border bg-slate-50 px-2.5 text-xs font-semibold outline-none focus:bg-white ${validColor ? 'border-slate-200 focus:border-[#D9232D]' : 'border-rose-300 focus:border-rose-500'}`} />
            </label>
            <div className="flex items-center gap-2">
              <label className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-slate-200" title="Choose a hex color">
                <input type="color" value={toColorPickerValue(color.hex)} onChange={(event) => updateColor(index, { hex: event.target.value })} aria-label={`Choose color ${index + 1}`} className="absolute inset-[-6px] h-[52px] w-[52px] cursor-pointer border-0 p-0" />
              </label>
              <span aria-label={validColor ? `Preview ${color.hex}` : 'Invalid color value'} className={`h-7 w-7 shrink-0 rounded-full border border-slate-200 ${validColor ? '' : 'bg-slate-100'}`} style={validColor ? { backgroundColor: color.hex } : undefined} />
            </div>
          </div>
          {!validColor && <p role="alert" className="mt-1.5 text-[10px] font-semibold text-rose-600">Enter a valid hex code or CSS color name.</p>}
        </div>;
      })}
    </div>
  </section>;
};
