import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonthsToIsoDate,
  buildInvoiceTermsText,
  normalizeGuaranteeDate,
  normalizeProductGuaranteePolicy,
  resolveProductGuarantee,
  resolveSpecificProductGuarantee,
} from './productGuaranteeLogic';

test('normalizeProductGuaranteePolicy defaults to disabled unless enabled explicitly', () => {
  const fallback = normalizeProductGuaranteePolicy(null);
  assert.equal(fallback.enabled, false);
  assert.equal(fallback.mode, 'fixed_date');
  assert.equal(fallback.durationMonths, 12);
  assert.equal(fallback.validUntilDate, null);

  const fixed = normalizeProductGuaranteePolicy({
    enabled: true,
    mode: 'fixed_date',
    valid_until_date: '2027-12-31',
    duration_months: 18,
  });
  assert.equal(fixed.enabled, true);
  assert.equal(fixed.mode, 'fixed_date');
  assert.equal(fixed.validUntilDate, '2027-12-31');
  assert.equal(fixed.durationMonths, 18);
});

test('normalizeGuaranteeDate and resolveSpecificProductGuarantee return null when admin did not set a date', () => {
  assert.equal(normalizeGuaranteeDate(null), null);
  assert.equal(normalizeGuaranteeDate(undefined), null);
  assert.equal(normalizeGuaranteeDate(''), null);
  assert.equal(normalizeGuaranteeDate('2026-02-31'), null);
  assert.equal(normalizeGuaranteeDate('2028-06-30T10:00:00Z'), '2028-06-30');

  assert.equal(resolveSpecificProductGuarantee(null), null);
  assert.equal(resolveSpecificProductGuarantee(undefined), null);
  assert.equal(resolveSpecificProductGuarantee(''), null);

  const active = resolveSpecificProductGuarantee('2028-06-30', new Date('2026-11-14T10:00:00Z'));
  assert.ok(active);
  assert.equal(active.enabled, true);
  assert.equal(active.validUntilIso, '2028-06-30');
  assert.equal(active.validUntilLabel, '30 Jun 2028');
  assert.equal(active.isActive, true);

  const expired = resolveSpecificProductGuarantee('2026-01-01', new Date('2026-11-14T10:00:00Z'));
  assert.ok(expired);
  assert.equal(expired.isActive, false);
});

test('addMonthsToIsoDate clamps end-of-month dates accurately', () => {
  assert.equal(addMonthsToIsoDate('2026-01-31T10:00:00Z', 1), '2026-02-28');
  assert.equal(addMonthsToIsoDate('2026-11-14T10:00:00Z', 12), '2027-11-14');
});

test('resolveProductGuarantee prioritizes per-product override and disables when no date is set', () => {
  const disabledPolicy = normalizeProductGuaranteePolicy(null);
  const unsetResult = resolveProductGuarantee(disabledPolicy, {
    now: new Date('2026-11-14T10:00:00Z'),
  });
  assert.equal(unsetResult.enabled, false);
  assert.equal(unsetResult.validUntilIso, null);

  const perProductOnly = resolveProductGuarantee(disabledPolicy, {
    productOverrideDate: '2027-03-15',
    now: new Date('2026-11-14T10:00:00Z'),
  });
  assert.equal(perProductOnly.enabled, true);
  assert.equal(perProductOnly.validUntilIso, '2027-03-15');
  assert.equal(perProductOnly.validUntilLabel, '15 Mar 2027');
});

test('buildInvoiceTermsText includes 7-day rule, normal-use defects, and explicit exclusions', () => {
  const info = resolveSpecificProductGuarantee('2027-11-14', new Date('2026-11-14T10:00:00Z'));
  const terms = buildInvoiceTermsText(info);
  assert.match(terms.returnPolicyText, /7 days/i);
  assert.match(terms.returnPolicyText, /3–5 working banking days/i);
  assert.match(terms.guaranteePolicyText, /14 Nov 2027/);
  assert.match(terms.guaranteePolicyText, /natural splitting\/cracking, seam tearing, or rexine\/leatherette surface peeling/i);
  assert.match(terms.guaranteePolicyText, /cat or animal scratches/i);
  assert.match(terms.guaranteePolicyText, /blade or sharp-object cuts/i);
  assert.match(terms.guaranteePolicyText, /fire or burn damage/i);
  assert.match(terms.guaranteePolicyText, /intentional misuse/i);

  const genericTerms = buildInvoiceTermsText(null);
  assert.match(genericTerms.guaranteePolicyText, /admin-issued guarantee date/i);
});
