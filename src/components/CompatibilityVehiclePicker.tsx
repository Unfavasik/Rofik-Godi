import React, { useEffect, useMemo, useState } from 'react';
import { Bike, Check, Loader2, Motorbike, Search, X } from 'lucide-react';
import { loadVehicleModels, type VehicleCatalogModel } from '../lib/supabaseVehicleCatalog';
import { getBrandInitials, getBrandLogoUrl } from '../lib/brandLogos';
import { getOptimizedImageUrl } from '../lib/imageUrls';

type Props = {
  open: boolean;
  selected: string[];
  onApply: (models: string[]) => void;
  onClose: () => void;
};

function BrandMark({ brand }: { brand: string }) {
  const [failed, setFailed] = useState(false);
  const url = getBrandLogoUrl(brand);
  if (!url || failed) {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[8px] font-black text-[#D9232D]">
        {getBrandInitials(brand)}
      </span>
    );
  }
  return <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-6 w-auto max-w-[34px] shrink-0 object-contain" />;
}

function ModelThumb({ image }: { image: string }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return (
      <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        <Bike className="h-4 w-4" />
      </span>
    );
  }
  return <img src={getOptimizedImageUrl(image, { width: 240, height: 180 })} alt="" loading="lazy" onError={() => setFailed(true)} className="h-9 w-14 shrink-0 rounded-lg bg-slate-50 object-cover" />;
}

export function CompatibilityVehiclePicker({ open, selected, onApply, onClose }: Props) {
  const [models, setModels] = useState<VehicleCatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'bike' | 'scooter'>('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let active = true;
    setPicked(new Set(selected));
    setSearch('');
    setTab('all');
    setLoading(true);
    void loadVehicleModels().then(({ data }) => {
      if (!active) return;
      setModels(data);
      setLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(
    () =>
      models.filter(
        (model) =>
          (tab === 'all' || model.type === tab) &&
          `${model.brand} ${model.name}`.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [models, tab, search],
  );

  const groups = useMemo(() => {
    const byBrand = new Map<string, VehicleCatalogModel[]>();
    for (const model of filtered) {
      const list = byBrand.get(model.brand) || [];
      list.push(model);
      byBrand.set(model.brand, list);
    }
    return Array.from(byBrand.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([brand, items]) => ({ brand, items: [...items].sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [filtered]);

  if (!open) return null;

  const toggleModel = (name: string) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((model) => picked.has(model.name));
  const toggleAllVisible = () => {
    setPicked((current) => {
      const next = new Set(current);
      if (allVisibleSelected) filtered.forEach((model) => next.delete(model.name));
      else filtered.forEach((model) => next.add(model.name));
      return next;
    });
  };

  const selectedNames = Array.from(picked).sort((a, b) => a.localeCompare(b));

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Compatible vehicles picker">
      <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FCEBEB] text-[#D9232D]"><Bike className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-extrabold tracking-tight text-slate-900">Compatible vehicles</h2>
          <p className="truncate text-[11px] font-medium text-slate-500">Choose the bikes this seat cover fits</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close compatible vehicles picker" className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bike or scooter..."
            aria-label="Search bike or scooter"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-[13px] font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-red-50"
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
          {([
            ['all', 'All vehicles', null],
            ['bike', 'Bike', Bike],
            ['scooter', 'Scooty', Motorbike],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[12px] font-extrabold transition ${tab === value ? 'bg-[#D9232D] text-white shadow-sm' : 'text-slate-700 hover:bg-white'}`}
            >
              {Icon && <Icon className="h-4 w-4" />}{label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[13px] font-extrabold text-slate-900">{picked.size} selected</p>
          {picked.size > 0 && (
            <button type="button" onClick={() => setPicked(new Set())} className="text-[12px] font-extrabold text-[#D9232D]">
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 py-12 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#D9232D]" />Loading vehicle catalog…
          </p>
        ) : groups.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-500">No vehicles match your search.</p>
        ) : (
          <div className="mt-2 space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Select all vehicles"
                  className="h-5 w-5 accent-[#D9232D]"
                />
                <span className="text-[13px] font-extrabold text-slate-900">Select all vehicles</span>
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{filtered.length} models</span>
            </label>

            {groups.map((group) => {
              const brandSelected = group.items.filter((model) => picked.has(model.name)).length;
              return (
                <section key={group.brand} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 bg-[#FCEBEB]/70 px-3.5 py-2.5">
                    <BrandMark brand={group.brand} />
                    <h3 className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-slate-900">{group.brand}</h3>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-500">{group.items.length} models</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {group.items.map((model) => {
                      const checked = picked.has(model.name);
                      return (
                        <label key={model.id} className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition hover:bg-slate-50">
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${checked ? 'border-[#D9232D] bg-[#D9232D] text-white' : 'border-slate-300 bg-white'}`}>
                            {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleModel(model.name)}
                            aria-label={`Select ${model.name}`}
                            className="sr-only"
                          />
                          <ModelThumb image={model.image} />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">{model.name}</span>
                          {brandSelected > 0 && <span className="sr-only">{brandSelected} selected in {group.brand}</span>}
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {selectedNames.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3">
                {selectedNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleModel(name)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#FCEBEB] px-3 py-1.5 text-[11px] font-extrabold text-[#D9232D] transition hover:bg-red-100"
                  >
                    {name}<X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}

            <p className="flex items-center gap-1.5 px-1 pt-1 text-[11px] font-medium text-slate-400">
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-slate-300 text-[9px] font-black text-slate-400">i</span>
              You can select multiple models at once.
            </p>
          </div>
        )}
      </div>

      <footer className="grid shrink-0 grid-cols-2 gap-2.5 border-t border-slate-100 bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-slate-200 bg-white text-[13px] font-extrabold text-slate-700 transition hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onApply(selectedNames)}
          className="min-h-12 rounded-xl bg-[#D9232D] text-[13px] font-extrabold text-white shadow-sm transition hover:bg-[#bf1f29]"
        >
          Apply {picked.size} {picked.size === 1 ? 'vehicle' : 'vehicles'}
        </button>
      </footer>
    </div>
  );
}
