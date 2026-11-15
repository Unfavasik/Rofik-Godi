import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
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
  className = '',
}) => {
  const propDate = normalizeGuaranteeDate(guaranteeDate);
  const [fetchedDate, setFetchedDate] = useState<string | null | undefined>(() =>
    getLocalProductGuaranteeDate(productId, productSlug),
  );

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

  return (
    <section
      aria-label="Product replacement guarantee terms"
      data-testid="product-guarantee-terms"
      className={`classic-glass overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/75 via-white/92 to-rose-50/45 p-4 shadow-[0_14px_34px_-20px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-5 ${className}`}
    >
      {/* Header & Admin Guarantee Expiry Date */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700">
              Workshop Replacement Protection
            </p>
            <h3 className="mt-0.5 text-sm font-black tracking-tight text-slate-950 sm:text-base">
              Official Product Guarantee
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-extrabold text-emerald-800 shadow-2xs tabular-nums">
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            <span>Valid until {guarantee.validUntilLabel}</span>
          </span>
          <span
            className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
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
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        Protected by Rofik Godi Centre until{' '}
        <strong className="font-extrabold text-slate-900">{guarantee.validUntilLabel}</strong>. If
        this product develops natural material cracking, seam tearing, or rexine surface peeling
        during normal everyday use before the guarantee expiry date, we will replace it at our
        workshop.
      </p>

      {/* Covered vs. Excluded Breakdown */}
      <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200/80 bg-white/90 p-3.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Covered for Replacement (Normal Use)</span>
          </div>
          <ul className="mt-2 space-y-1.5 text-[11.5px] leading-snug text-slate-700">
            {COVERED_DEFECTS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-rose-200/80 bg-white/90 p-3.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-rose-800">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#D9232D]" />
            <span>Guarantee Void (Not Covered)</span>
          </div>
          <ul className="mt-2 space-y-1.5 text-[11.5px] leading-snug text-slate-700">
            {VOID_EXCLUSIONS.map((item) => (
              <li key={item} className="flex items-start gap-2">
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
