import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import {
  fetchProductGuaranteeDateFromDb,
  getLocalProductGuaranteeDate,
  normalizeGuaranteeDate,
  PRODUCT_GUARANTEE_CHANGED_EVENT,
  resolveSpecificProductGuarantee,
} from '../lib/productGuarantee';

export interface GuaranteeTermsProps {
  productId?: string | null;
  productSlug?: string | null;
  guaranteeDate?: string | null;
  variant?: 'default' | 'compact';
  className?: string;
}

const COVERED_DEFECTS = [
  'Natural material cracking or splitting under regular riding use',
  'Seam or lockstitch tearing during normal everyday use',
  'Rexine or leatherette top-coat peeling and surface flaking',
];

const VOID_EXCLUSIONS = [
  'Cat or animal claw scratches, bites, and pet damage',
  'Blade (bilet), knife, key, or sharp-object cuts and slashes',
  'Fire, cigarette, exhaust heat, or burn damage',
  'Intentional, self-inflicted, or accidental external misuse',
];

export const GuaranteeTerms: React.FC<GuaranteeTermsProps> = ({
  productId,
  productSlug,
  guaranteeDate,
  variant = 'default',
  className = '',
}) => {
  const propDate = normalizeGuaranteeDate(guaranteeDate);
  const [fetchedDate, setFetchedDate] = useState<string | null | undefined>(() =>
    getLocalProductGuaranteeDate(productId, productSlug),
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setFetchedDate(getLocalProductGuaranteeDate(productId, productSlug));
    let active = true;
    void fetchProductGuaranteeDateFromDb({
      productId,
      productSlug,
      fallbackDate: propDate,
    }).then((dbDate) => {
      if (active) {
        setFetchedDate(dbDate);
      }
    });

    const handleGuaranteeUpdated = () => {
      setFetchedDate(getLocalProductGuaranteeDate(productId, productSlug));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleGuaranteeUpdated);
      window.addEventListener('storage', handleGuaranteeUpdated);
    }
    return () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleGuaranteeUpdated);
        window.removeEventListener('storage', handleGuaranteeUpdated);
      }
    };
  }, [productId, productSlug, propDate]);

  const effectiveDate = useMemo(() => {
    if (fetchedDate !== undefined) return fetchedDate;
    return propDate;
  }, [propDate, fetchedDate]);

  const guarantee = useMemo(
    () => resolveSpecificProductGuarantee(effectiveDate),
    [effectiveDate],
  );

  if (!guarantee) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <section
        aria-label="Product replacement guarantee terms"
        data-testid="product-guarantee-terms"
        data-variant="compact"
        className={`overflow-hidden rounded-xl border border-emerald-200/85 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/80 px-3 py-2.5 shadow-2xs ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <h3 className="text-[11.5px] font-black tracking-tight text-slate-900">
                  Official Product Guarantee
                </h3>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span
                  className={`text-[9.5px] font-extrabold ${
                    guarantee.isActive ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {guarantee.isActive ? 'Active' : 'Expired'}
                </span>
              </div>
              <p className="mt-0.5 text-[10.5px] font-semibold text-slate-600 tabular-nums">
                Valid until{' '}
                <strong className="font-extrabold text-emerald-800">
                  {guarantee.validUntilLabel}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="guarantee-terms-toggle"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex h-6.5 shrink-0 items-center gap-1 rounded-lg border border-emerald-200/90 bg-white px-2 text-[9.5px] font-extrabold text-emerald-800 transition hover:bg-emerald-50 active:scale-95"
          >
            <span>{expanded ? 'Hide' : 'Terms'}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <p className="mt-1.5 border-t border-emerald-100/90 pt-1.5 text-[10px] leading-snug text-slate-600">
          <strong className="font-bold text-emerald-800">Covered:</strong> Natural cracking, seam
          tearing &amp; rexine peeling under normal use ·{' '}
          <strong className="font-bold text-[#D9232D]">Void:</strong> Cat scratches, bilet/blade
          cuts, fire &amp; self-damage.
        </p>

        {expanded && (
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200/75 bg-white/95 p-2.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Covered (Normal Use)</span>
              </p>
              <ul className="mt-1.5 space-y-1 text-[10px] leading-snug text-slate-600">
                {COVERED_DEFECTS.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span
                      aria-hidden="true"
                      className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-rose-200/75 bg-white/95 p-2.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-rose-800">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
                <span>Guarantee Void (Not Covered)</span>
              </p>
              <ul className="mt-1.5 space-y-1 text-[10px] leading-snug text-slate-600">
                {VOID_EXCLUSIONS.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <XCircle
                      aria-hidden="true"
                      className="mt-0.5 h-3 w-3 shrink-0 text-[#D9232D]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Product replacement guarantee terms"
      data-testid="product-guarantee-terms"
      className={`classic-glass overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/75 via-white/92 to-rose-50/45 p-3.5 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-4 ${className}`}
    >
      {/* Header & Admin Guarantee Expiry Date */}
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Workshop Replacement Protection
            </p>
            <h3 className="mt-0.5 text-[13.5px] font-black tracking-tight text-slate-950 sm:text-[15px]">
              Official Product Guarantee
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 shadow-2xs tabular-nums">
            <Calendar className="h-3 w-3 text-emerald-600" />
            <span>Valid until {guarantee.validUntilLabel}</span>
          </span>
          <span
            className={`inline-flex items-center rounded-lg border px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-wide ${
              guarantee.isActive
                ? 'border-emerald-200 bg-emerald-100/80 text-emerald-800'
                : 'border-slate-200 bg-slate-100 text-slate-600'
            }`}
          >
            {guarantee.isActive ? 'Active' : 'Expired'}
          </span>
        </div>
      </div>

      {/* Polished Guarantee Summary */}
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-slate-600">
        Protected by Rofik Godi Centre until{' '}
        <strong className="font-extrabold text-slate-900">{guarantee.validUntilLabel}</strong>. If
        this product develops natural material cracking, seam tearing, or rexine surface peeling
        during normal everyday use before the guarantee expiry date, we will replace it at our
        workshop.
      </p>

      {/* Covered vs. Excluded Breakdown */}
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200/80 bg-white/90 p-3">
          <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>Covered for Replacement (Normal Use)</span>
          </div>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-slate-700">
            {COVERED_DEFECTS.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-rose-200/80 bg-white/90 p-3">
          <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-rose-800">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
            <span>Guarantee Void (Not Covered)</span>
          </div>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-slate-700">
            {VOID_EXCLUSIONS.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <XCircle
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9232D]"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default GuaranteeTerms;

