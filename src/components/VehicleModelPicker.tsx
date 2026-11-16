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
  compact?: boolean;
}

export const VehicleModelPicker: React.FC<VehicleModelPickerProps> = ({
  models,
  selectedModel,
  onSelect,
  selectedLabel,
  changeLabel,
  ariaLabel,
  disabled = false,
  compact = false,
}) => {
  const selectedFitment = models.find((model) => model.name === selectedModel);

  if (selectedFitment) {
    if (compact) {
      return (
        <div className="mt-1.5 flex items-center gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-2.5 shadow-2xs">
          <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl border border-emerald-100 bg-white">
            {selectedFitment.image ? (
              <img src={selectedFitment.image} alt={`${selectedFitment.brand} ${selectedFitment.name}`} className="h-full w-full object-contain p-1" />
            ) : (
              <span className="grid h-full place-items-center text-slate-300"><Truck className="h-5 w-5" /></span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-800">
              <Check className="h-2.5 w-2.5" />{selectedLabel}
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] font-black leading-tight text-slate-950">
              {selectedFitment.name}
            </span>
            <span className="block truncate text-[10px] font-semibold text-slate-500">
              {selectedFitment.brand}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onSelect('')}
            disabled={disabled}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-emerald-200/80 bg-white px-2.5 text-[10.5px] font-extrabold text-[#D9232D] shadow-2xs transition hover:border-red-200 hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Pencil className="h-3 w-3" />
            <span>{changeLabel}</span>
          </button>
        </div>
      );
    }

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
    <div role="group" aria-label={ariaLabel} className={`no-scrollbar mt-1.5 overflow-x-hidden overflow-y-auto rounded-2xl ${compact ? 'max-h-[min(36vh,280px)] space-y-1.5' : 'max-h-[min(42vh,360px)] space-y-2'}`}>
      {models.map((model) => (
        <button
          key={`${model.brand}-${model.name}`}
          type="button"
          aria-pressed={false}
          disabled={disabled}
          onClick={() => onSelect(model.name)}
          className={`flex w-full min-w-0 items-center border border-slate-200 bg-slate-50/70 text-left transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60 ${
            compact ? 'min-h-[60px] gap-2.5 rounded-xl p-2' : 'min-h-[104px] gap-3 rounded-2xl p-2.5'
          }`}
        >
          {model.image ? (
            <span className={`shrink-0 overflow-hidden bg-white ${compact ? 'h-11 w-16 rounded-lg' : 'h-[80px] w-[36%] max-w-[128px] rounded-xl sm:h-[86px] sm:w-[42%] sm:max-w-none'}`}>
              <img src={model.image} alt="" loading="lazy" className="h-full w-full object-cover" />
            </span>
          ) : (
            <span className={`grid shrink-0 place-items-center bg-white text-slate-300 ${compact ? 'h-11 w-16 rounded-lg' : 'h-[80px] w-[36%] max-w-[128px] rounded-xl sm:h-[86px] sm:w-[42%] sm:max-w-none'}`}>
              <Truck className={compact ? 'h-5 w-5' : 'h-8 w-8'} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className={`block break-words font-extrabold leading-snug text-slate-900 ${compact ? 'text-xs' : 'text-sm font-black'}`}>{model.name}</span>
            <span className={`block truncate font-medium leading-snug text-slate-500 ${compact ? 'mt-0.5 text-[10.5px]' : 'mt-1 text-xs'}`}>{model.brand}</span>
          </span>
          <span aria-hidden="true" className={`shrink-0 rounded-full border-2 border-slate-300 ${compact ? 'h-4.5 w-4.5' : 'h-6 w-6 border-slate-400'}`} />
        </button>
      ))}
    </div>
  );
};

