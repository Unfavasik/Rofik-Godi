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
        className={`overflow-hidden rounded-[20px] border border-[#E6CE73] bg-gradient-to-r from-[#FFF8D6] via-white to-[#FFFCF4] px-3.5 py-3 shadow-2xs ${className}`}
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#6B352A] text-[#FFF1A6] shadow-2xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <h3 className="text-[12px] font-black tracking-tight text-[#2B1611]">
                  Official Product Guarantee
                </h3>
                <span aria-hidden="true" className="text-[#CBB8A6]">
                  ·
                </span>
                <span
                  className={`text-[10px] font-extrabold ${
                    guarantee.isActive ? 'text-[#6B352A]' : 'text-[#8A6C63]'
                  }`}
                >
                  {guarantee.isActive ? 'Active' : 'Expired'}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-[#6B4C44] tabular-nums">
                Valid until{' '}
                <strong className="font-extrabold text-[#6B352A]">
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
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-[#E6CE73] bg-white px-2.5 text-[10px] font-extrabold text-[#6B352A] transition hover:bg-[#FFF1A6] active:scale-95"
          >
            <span>{expanded ? 'Hide' : 'Terms'}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <p className="mt-2 border-t border-[#EAD278]/70 pt-2 text-[10.5px] leading-snug text-[#4A2B23]">
          <strong className="font-bold text-[#6B352A]">Covered:</strong> Natural cracking, seam
          tearing &amp; rexine peeling under normal use ·{' '}
          <strong className="font-bold text-[#9E2A2B]">Void:</strong> Cat scratches, bilet/blade
          cuts, fire &amp; self-damage.
        </p>

        {expanded && (
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E6CE73] bg-white/95 p-2.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-[#6B352A]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#6B352A]" />
                <span>Covered (Normal Use)</span>
              </p>
              <ul className="mt-1.5 space-y-1 text-[10px] leading-snug text-[#4A2B23]">
                {COVERED_DEFECTS.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span
                      aria-hidden="true"
                      className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#6B352A]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#E9C2B5] bg-[#FDF2EE] p-2.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-[#9E2A2B]">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#9E2A2B]" />
                <span>Guarantee Void (Not Covered)</span>
              </p>
              <ul className="mt-1.5 space-y-1 text-[10px] leading-snug text-[#4A2B23]">
                {VOID_EXCLUSIONS.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <XCircle
                      aria-hidden="true"
                      className="mt-0.5 h-3 w-3 shrink-0 text-[#9E2A2B]"
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
      className={`classic-glass overflow-hidden rounded-3xl border border-[#E6CE73] bg-gradient-to-br from-[#FFF8D6] via-white to-[#FFFCF4] p-4 shadow-[0_14px_34px_-20px_rgba(107,53,42,0.14)] sm:p-5 ${className}`}
    >
      {/* Header & Admin Guarantee Expiry Date */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#6B352A] text-[#FFF1A6] shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#6B352A]">
              Workshop Replacement Protection
            </p>
            <h3 className="mt-0.5 text-sm font-black tracking-tight text-[#2B1611] sm:text-base">
              Official Product Guarantee
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6CE73] bg-white px-3 py-1.5 text-xs font-extrabold text-[#6B352A] shadow-2xs tabular-nums">
            <Calendar className="h-3.5 w-3.5 text-[#6B352A]" />
            <span>Valid until {guarantee.validUntilLabel}</span>
          </span>
          <span
            className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
              guarantee.isActive
                ? 'border-[#E6CE73] bg-[#FFF1A6] text-[#6B352A]'
                : 'border-[#E8D8C4] bg-[#F4EAE0] text-[#6B4C44]'
            }`}
          >
            {guarantee.isActive ? 'Active' : 'Expired'}
          </span>
        </div>
      </div>

      {/* Polished Guarantee Summary */}
      <p className="mt-3 text-xs leading-relaxed text-[#4A2B23]">
        Protected by Rofik Godi Centre until{' '}
        <strong className="font-extrabold text-[#2B1611]">{guarantee.validUntilLabel}</strong>. If
        this product develops natural material cracking, seam tearing, or rexine surface peeling
        during normal everyday use before the guarantee expiry date, we will replace it at our
        workshop.
      </p>

      {/* Covered vs. Excluded Breakdown */}
      <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#E6CE73] bg-white/95 p-3.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#6B352A]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6B352A]" />
            <span>Covered for Replacement (Normal Use)</span>
          </div>
          <ul className="mt-2 space-y-1.5 text-[11.5px] leading-snug text-[#4A2B23]">
            {COVERED_DEFECTS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6B352A]"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#E9C2B5] bg-[#FDF2EE] p-3.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#9E2A2B]">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#9E2A2B]" />
            <span>Guarantee Void (Not Covered)</span>
          </div>
          <ul className="mt-2 space-y-1.5 text-[11.5px] leading-snug text-[#4A2B23]">
            {VOID_EXCLUSIONS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <XCircle
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9E2A2B]"
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

