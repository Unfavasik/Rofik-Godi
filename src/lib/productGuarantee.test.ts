import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonthsToIsoDate,
  buildInvoiceTermsText,
  normalizeProductGuaranteePolicy,
  resolveProductGuarantee,
} from './productGuaranteeLogic';

test('normalizeProductGuaranteePolicy handles empty/malformed values safely', () => {
  const fallback = normalizeProductGuaranteePolicy(null);
  assert.equal(fallback.enabled, true);
  assert.equal(fallback.mode, 'duration_months');
  assert.equal(fallback.durationMonths, 12);
  assert.equal(fallback.validUntilDate, null);

  const fixed = normalizeProductGuaranteePolicy({
    enabled: true,
    mode: 'fixed_date',
    valid_until_date: '2027-12-31',
    duration_months: 18,
  });
  assert.equal(fixed.mode, 'fixed_date');
  assert.equal(fixed.validUntilDate, '2027-12-31');
  assert.equal(fixed.durationMonths, 18);
});

test('addMonthsToIsoDate clamps end-of-month dates accurately', () => {
  assert.equal(addMonthsToIsoDate('2026-01-31T10:00:00Z', 1), '2026-02-28');
  assert.equal(addMonthsToIsoDate('2026-11-14T10:00:00Z', 12), '2027-11-14');
});

test('resolveProductGuarantee prioritizes product override date, then admin fixed date, then duration', () => {
  const fixedPolicy = normalizeProductGuaranteePolicy({
    enabled: true,
    mode: 'fixed_date',
    validUntilDate: '2028-06-30',
    durationMonths: 12,
  });

  const resolvedGlobal = resolveProductGuarantee(fixedPolicy, {
    referenceDate: '2026-11-14T10:00:00Z',
    now: new Date('2026-11-14T10:00:00Z'),
  });
  assert.equal(resolvedGlobal.validUntilIso, '2028-06-30');
  assert.equal(resolvedGlobal.validUntilLabel, '30 Jun 2028');
  assert.equal(resolvedGlobal.isActive, true);

  const resolvedOverride = resolveProductGuarantee(fixedPolicy, {
    referenceDate: '2026-11-14T10:00:00Z',
    productOverrideDate: '2027-03-15',
    now: new Date('2026-11-14T10:00:00Z'),
  });
  assert.equal(resolvedOverride.validUntilIso, '2027-03-15');
  assert.equal(resolvedOverride.validUntilLabel, '15 Mar 2027');

  const expiredPolicy = normalizeProductGuaranteePolicy({
    enabled: true,
    mode: 'fixed_date',
    validUntilDate: '2026-01-01',
  });
  const resolvedExpired = resolveProductGuarantee(expiredPolicy, {
    now: new Date('2026-11-14T10:00:00Z'),
  });
  assert.equal(resolvedExpired.isActive, false);
});

test('buildInvoiceTermsText includes 7-day rule, normal-use defects, and explicit exclusions', () => {
  const info = resolveProductGuarantee(
    normalizeProductGuaranteePolicy({
      enabled: true,
      mode: 'fixed_date',
      validUntilDate: '2027-11-14',
    }),
    { now: new Date('2026-11-14T10:00:00Z') },
  );

  const terms = buildInvoiceTermsText(info);
  assert.match(terms.returnPolicyText, /7 days/i);
  assert.match(terms.returnPolicyText, /3–5 working banking days/i);
  assert.match(terms.guaranteePolicyText, /14 Nov 2027/);
  assert.match(terms.guaranteePolicyText, /natural splitting\/cracking, seam tearing, or rexine\/leatherette surface peeling/i);
  assert.match(terms.guaranteePolicyText, /cat or animal scratches/i);
  assert.match(terms.guaranteePolicyText, /blade or sharp-object cuts/i);
  assert.match(terms.guaranteePolicyText, /fire or burn damage/i);
  assert.match(terms.guaranteePolicyText, /intentional misuse/i);
});
