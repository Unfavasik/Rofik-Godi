export type GuaranteeMode = 'fixed_date' | 'duration_months';

export interface ProductGuaranteePolicy {
  enabled: boolean;
  mode: GuaranteeMode;
  validUntilDate: string | null;
  durationMonths: number;
  updatedAt?: string;
}

export interface ResolvedGuaranteeInfo {
  enabled: boolean;
  validUntilIso: string | null;
  validUntilLabel: string;
  coverageBadgeLabel: string;
  summaryText: string;
  isActive: boolean;
}

export const GUARANTEE_POLICY_STORAGE_KEY = 'rofik-godi:product-guarantee-policy:v1';
export const PRODUCT_GUARANTEE_MAP_STORAGE_KEY = 'rofik-godi:product-guarantee-dates:v1';
export const PRODUCT_GUARANTEE_CHANGED_EVENT = 'rofik-godi:product-guarantee-changed';

export const DEFAULT_PRODUCT_GUARANTEE_POLICY: ProductGuaranteePolicy = {
  enabled: false,
  mode: 'fixed_date',
  validUntilDate: null,
  durationMonths: 12,
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) return false;
  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function normalizeGuaranteeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 10);
  return isValidIsoDateString(trimmed) ? trimmed : null;
}

export function normalizeProductGuaranteePolicy(raw: unknown): ProductGuaranteePolicy {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PRODUCT_GUARANTEE_POLICY };
  }
  const obj = raw as Record<string, unknown>;
  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : true;
  const rawDate = obj.validUntilDate ?? obj.valid_until_date;
  const validUntilDate = normalizeGuaranteeDate(rawDate);

  const rawMonths = Number(obj.durationMonths ?? obj.duration_months);
  const durationMonths =
    Number.isFinite(rawMonths) && rawMonths >= 1
      ? Math.min(120, Math.round(rawMonths))
      : DEFAULT_PRODUCT_GUARANTEE_POLICY.durationMonths;

  const rawMode = obj.mode;
  const mode: GuaranteeMode =
    rawMode === 'fixed_date' && validUntilDate
      ? 'fixed_date'
      : rawMode === 'duration_months'
        ? 'duration_months'
        : validUntilDate
          ? 'fixed_date'
          : 'duration_months';

  const updatedAt =
    typeof obj.updatedAt === 'string' && obj.updatedAt.trim()
      ? obj.updatedAt.trim()
      : typeof obj.updated_at === 'string' && obj.updated_at.trim()
        ? obj.updated_at.trim()
        : undefined;

  return {
    enabled,
    mode,
    validUntilDate,
    durationMonths,
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function addMonthsToIsoDate(baseDateInput: string | Date, months: number): string {
  const parsed =
    baseDateInput instanceof Date ? new Date(baseDateInput.getTime()) : new Date(baseDateInput);
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const targetYear = base.getUTCFullYear();
  const targetMonth = base.getUTCMonth() + Math.max(1, Math.round(months));
  const originalDay = base.getUTCDate();

  const firstOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const clampedDay = Math.min(originalDay, lastDayOfTargetMonth);

  const result = new Date(
    Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth(), clampedDay),
  );
  return result.toISOString().slice(0, 10);
}

export function formatGuaranteeDateLabel(isoDate: string): string {
  const normalized = normalizeGuaranteeDate(isoDate);
  if (!normalized) return 'Date unavailable';
  const [yearStr, monthStr, dayStr] = normalized.split('-');
  const utcDate = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));
  return utcDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDurationLabel(months: number): string {
  if (months === 12) return '1-Year';
  if (months === 24) return '2-Year';
  if (months === 36) return '3-Year';
  if (months % 12 === 0) return `${months / 12}-Year`;
  return `${months}-Month`;
}

export function resolveSpecificProductGuarantee(
  guaranteeDate: unknown,
  now: Date = new Date(),
): ResolvedGuaranteeInfo | null {
  const validUntilIso = normalizeGuaranteeDate(guaranteeDate);
  if (!validUntilIso) return null;

  const todayIso = now.toISOString().slice(0, 10);
  const validUntilLabel = formatGuaranteeDateLabel(validUntilIso);
  const isActive = validUntilIso >= todayIso;

  return {
    enabled: true,
    validUntilIso,
    validUntilLabel,
    coverageBadgeLabel: `Guarantee until ${validUntilLabel}`,
    summaryText: `Valid until ${validUntilLabel} under normal everyday use`,
    isActive,
  };
}

export function resolveProductGuarantee(
  policy?: ProductGuaranteePolicy | null,
  options?: {
    referenceDate?: string | Date;
    productOverrideDate?: string | null;
    now?: Date;
  },
): ResolvedGuaranteeInfo {
  const now = options?.now ?? new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const overrideDate = normalizeGuaranteeDate(options?.productOverrideDate);

  if (overrideDate) {
    const validUntilLabel = formatGuaranteeDateLabel(overrideDate);
    return {
      enabled: true,
      validUntilIso: overrideDate,
      validUntilLabel,
      coverageBadgeLabel: `Guarantee until ${validUntilLabel}`,
      summaryText: `Valid until ${validUntilLabel} under normal use`,
      isActive: overrideDate >= todayIso,
    };
  }

  if (!policy || !policy.enabled) {
    return {
      enabled: false,
      validUntilIso: null,
      validUntilLabel: 'Not set',
      coverageBadgeLabel: 'No Guarantee Set',
      summaryText: 'Standard 7-day unused defect check applies.',
      isActive: false,
    };
  }

  const normalized = normalizeProductGuaranteePolicy(policy);
  let validUntilIso: string;
  let coverageBadgeLabel: string;

  if (normalized.mode === 'fixed_date' && normalized.validUntilDate) {
    validUntilIso = normalized.validUntilDate;
    coverageBadgeLabel = `Guarantee until ${formatGuaranteeDateLabel(validUntilIso)}`;
  } else {
    const base = options?.referenceDate ?? now;
    validUntilIso = addMonthsToIsoDate(base, normalized.durationMonths);
    coverageBadgeLabel = `${formatDurationLabel(normalized.durationMonths)} Replacement Guarantee`;
  }

  const validUntilLabel = formatGuaranteeDateLabel(validUntilIso);
  const isActive = validUntilIso >= todayIso;
  const summaryText =
    normalized.mode === 'fixed_date' && normalized.validUntilDate
      ? `Valid until ${validUntilLabel} under normal use`
      : `${formatDurationLabel(normalized.durationMonths)} guarantee (valid until ${validUntilLabel})`;

  return {
    enabled: true,
    validUntilIso,
    validUntilLabel,
    coverageBadgeLabel,
    summaryText,
    isActive,
  };
}

export function buildInvoiceTermsText(guaranteeInfo?: ResolvedGuaranteeInfo | null): {
  returnPolicyText: string;
  guaranteePolicyText: string;
} {
  const returnPolicyText =
    'Standard, non-customised items may be replaced within 7 days for stitching defects, incorrect fitment or transit damage if unused, uninstalled and returned with original packaging and tags. Personalised items are not returnable except for verified manufacturing defects. Approved refunds go to the original payment method within 3–5 working banking days.';

  const guaranteeWindow =
    guaranteeInfo?.enabled && guaranteeInfo.validUntilIso
      ? `valid until ${guaranteeInfo.validUntilLabel}`
      : 'applicable only on products with an admin-issued guarantee date';

  const guaranteePolicyText = `Product Replacement Guarantee (${guaranteeWindow}): Under normal everyday use before the product's guarantee expiry date, items developing natural splitting/cracking, seam tearing, or rexine/leatherette surface peeling qualify for workshop replacement. External, accidental, or self-inflicted damage—including cat or animal scratches, blade or sharp-object cuts, fire or burn damage, and intentional misuse—is strictly excluded from guarantee coverage.`;

  return {
    returnPolicyText,
    guaranteePolicyText,
  };
}
