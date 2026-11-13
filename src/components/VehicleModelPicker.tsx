import React from 'react';
import { Check, Pencil, Truck } from 'lucide-react';
import type { CheckoutFitmentModel } from '../lib/checkoutVehicleFitment';

interface VehicleModelPickerProps {
  models: CheckoutFitmentModel[];
  selectedModel: string;
  onSelect: (model: string) => void;
  selectedLabel: string;
  changeLabel: string;
  ariaLabel: string;
  disabled?: boolean;
}

export const VehicleModelPicker: React.FC<VehicleModelPickerProps> = ({
  models,
  selectedModel,
  onSelect,
  selectedLabel,
  changeLabel,
  ariaLabel,
  disabled = false,
}) => {
  const selectedFitment = models.find((model) => model.name === selectedModel);

  if (selectedFitment) {
    return (
      <div className="mt-1.5 grid grid-cols-1 gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-3 shadow-[0_8px_24px_rgba(16,185,129,.08)] sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:items-center sm:gap-4 sm:p-4">
        <span className="relative aspect-[16/9] w-full min-w-0 overflow-hidden rounded-2xl border border-emerald-100 bg-white sm:aspect-square">
          {selectedFitment.image ? (
            <img src={selectedFitment.image} alt={`${selectedFitment.brand} ${selectedFitment.name}`} className="h-full w-full object-contain p-2 sm:p-3" />
          ) : (
            <span className="grid h-full place-items-center text-slate-300"><Truck className="h-10 w-10" /></span>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-900 shadow-sm">{selectedFitment.brand}</span>
        </span>
        <span className="flex min-w-0 flex-col items-start">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800"><Check className="h-3.5 w-3.5" />{selectedLabel}</span>
          <span className="mt-2 block text-xs font-semibold text-slate-500">{selectedFitment.brand}</span>
          <span className="mt-0.5 block break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl">{selectedFitment.name}</span>
          <button type="button" onClick={() => onSelect('')} disabled={disabled} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 text-xs font-extrabold text-[#D9232D] shadow-sm transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-4"><Pencil className="h-4 w-4" />{changeLabel}</button>
        </span>
      </div>
    );
  }

  return (
    <div role="group" aria-label={ariaLabel} className="no-scrollbar mt-1.5 max-h-[min(42vh,360px)] space-y-2 overflow-x-hidden overflow-y-auto rounded-2xl">
      {models.map((model) => (
        <button key={`${model.brand}-${model.name}`} type="button" aria-pressed={false} disabled={disabled} onClick={() => onSelect(model.name)} className="flex min-h-[104px] w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 text-left transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60">
          {model.image ? (
            <span className="h-[80px] w-[36%] max-w-[128px] shrink-0 overflow-hidden rounded-xl bg-white sm:h-[86px] sm:w-[42%] sm:max-w-none"><img src={model.image} alt="" loading="lazy" className="h-full w-full object-cover" /></span>
          ) : (
            <span className="grid h-[80px] w-[36%] max-w-[128px] shrink-0 place-items-center rounded-xl bg-white text-slate-300 sm:h-[86px] sm:w-[42%] sm:max-w-none"><Truck className="h-8 w-8" /></span>
          )}
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-black leading-snug text-slate-900">{model.name}</span><span className="mt-1 block truncate text-xs font-medium leading-snug text-slate-500">{model.brand}</span></span>
          <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-400" />
        </button>
      ))}
    </div>
  );
};
