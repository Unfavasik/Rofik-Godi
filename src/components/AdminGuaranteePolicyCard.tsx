import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, ShieldCheck } from 'lucide-react';
import {
  addMonthsToIsoDate,
  fetchPublicProductGuaranteePolicy,
  formatDurationLabel,
  resolveProductGuarantee,
  saveAdminProductGuaranteePolicy,
  type ProductGuaranteePolicy,
} from '../lib/productGuarantee';

interface AdminGuaranteePolicyCardProps {
  notify: (message: string) => void;
  compact?: boolean;
}

const DURATION_PRESETS = [
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
];

export const AdminGuaranteePolicyCard: React.FC<AdminGuaranteePolicyCardProps> = ({
  notify,
  compact = false,
}) => {
  const [policy, setPolicy] = useState<ProductGuaranteePolicy>({
    enabled: true,
    mode: 'duration_months',
    validUntilDate: null,
    durationMonths: 12,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchPublicProductGuaranteePolicy().then((loaded) => {
      if (active) setPolicy(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const resolved = useMemo(() => resolveProductGuarantee(policy), [policy]);

  const applyDatePreset = (months: number) => {
    const nextIso = addMonthsToIsoDate(new Date(), months);
    setPolicy((current) => ({
      ...current,
      enabled: true,
      mode: 'fixed_date',
      validUntilDate: nextIso,
    }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const result = await saveAdminProductGuaranteePolicy(policy);
    setPolicy(result.policy);
    setSaving(false);
    notify(
      result.error
        ? result.error.message
        : result.policy.mode === 'fixed_date' && result.policy.validUntilDate
          ? `All-products guarantee date set until ${resolveProductGuarantee(result.policy).validUntilLabel}`
          : `All-products guarantee set to ${formatDurationLabel(result.policy.durationMonths)} from purchase`,
    );
  };

  return (
    <section
      aria-label="All-Products Guarantee Date Policy"
      className={`rounded-3xl border border-slate-200/90 bg-white shadow-2xs ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-50 text-[#D9232D]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-black text-slate-900">
                All-Products Guarantee Date
              </h3>
              <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                {resolved.coverageBadgeLabel}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
              Applies to every product &amp; order invoice. Covers normal-use splitting, seam
              tearing, or rexine peeling before expiry; excludes cat scratches, blade cuts, fire
              burns, and intentional misuse.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="banner-cta-shine inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-red-600/20 transition hover:bg-[#BF1B24] active:scale-[0.98] disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          <span>{saving ? 'Saving…' : 'Save guarantee date'}</span>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 lg:col-span-5">
          <p className="text-[11px] font-bold text-slate-600">Date mode for all products</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setPolicy((current) => ({
                  ...current,
                  enabled: true,
                  mode: 'fixed_date',
                  validUntilDate:
                    current.validUntilDate || addMonthsToIsoDate(new Date(), current.durationMonths),
                }))
              }
              className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                policy.mode === 'fixed_date'
                  ? 'border-[#D9232D] bg-white text-[#D9232D] shadow-2xs'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
              }`}
            >
              Fixed Expiry Date
            </button>
            <button
              type="button"
              onClick={() =>
                setPolicy((current) => ({
                  ...current,
                  enabled: true,
                  mode: 'duration_months',
                }))
              }
              className={`min-h-10 rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                policy.mode === 'duration_months'
                  ? 'border-[#D9232D] bg-white text-[#D9232D] shadow-2xs'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
              }`}
            >
              From Order Date
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 lg:col-span-7">
          {policy.mode === 'fixed_date' ? (
            <div>
              <label className="block">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-[#D9232D]" />
                  <span>Guarantee valid until date (All products)</span>
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    aria-label="Guarantee valid until date"
                    value={policy.validUntilDate || ''}
                    onChange={(event) =>
                      setPolicy((current) => ({
                        ...current,
                        enabled: true,
                        mode: 'fixed_date',
                        validUntilDate: event.target.value || null,
                      }))
                    }
                    className="min-h-11 min-w-[180px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#D9232D]"
                  />
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.months}
                      type="button"
                      onClick={() => applyDatePreset(preset.months)}
                      className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-[#D9232D]"
                    >
                      +{preset.label}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          ) : (
            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-[#D9232D]" />
                <span>Guarantee duration from purchase date (All products)</span>
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.months}
                    type="button"
                    onClick={() =>
                      setPolicy((current) => ({
                        ...current,
                        enabled: true,
                        mode: 'duration_months',
                        durationMonths: preset.months,
                      }))
                    }
                    className={`min-h-10 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                      policy.durationMonths === preset.months
                        ? 'border-[#D9232D] bg-red-50 text-[#D9232D]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    aria-label="Custom guarantee months"
                    value={policy.durationMonths}
                    onChange={(event) => {
                      const months = Math.max(1, Math.min(120, Number(event.target.value) || 1));
                      setPolicy((current) => ({
                        ...current,
                        enabled: true,
                        mode: 'duration_months',
                        durationMonths: months,
                      }));
                    }}
                    className="w-14 bg-transparent py-1 text-center text-xs font-extrabold text-slate-900 outline-none"
                  />
                  <span className="text-[11px] font-semibold text-slate-500">months</span>
                </label>
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] font-semibold text-slate-600">
            Active preview: <span className="font-extrabold text-slate-900">{resolved.summaryText}</span>
          </p>
        </div>
      </div>
    </section>
  );
};
