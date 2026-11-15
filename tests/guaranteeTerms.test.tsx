import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GuaranteeTerms } from '../src/components/GuaranteeTerms';

describe('GuaranteeTerms component', () => {
  it('renders nothing when no admin guarantee date is provided', () => {
    expect(renderToStaticMarkup(<GuaranteeTerms />)).toBe('');
    expect(renderToStaticMarkup(<GuaranteeTerms guaranteeDate={null} />)).toBe('');
    expect(renderToStaticMarkup(<GuaranteeTerms guaranteeDate="" />)).toBe('');
  });

  it('renders the admin expiry date, manufacturing defect coverage, and user-damage exclusions when set', () => {
    const html = renderToStaticMarkup(
      <GuaranteeTerms guaranteeDate="2028-06-30" />,
    );

    expect(html).toContain('data-testid="product-guarantee-terms"');
    expect(html).toContain('Official Product Guarantee');
    expect(html).toContain('30 Jun 2028');
    expect(html).toContain('Natural material cracking or splitting');
    expect(html).toContain('Seam or lockstitch tearing');
    expect(html).toContain('Rexine or leatherette top-coat peeling');
    expect(html).toContain('Cat or animal claw scratches');
    expect(html).toContain('Blade (bilet), knife, key, or sharp-object cuts');
    expect(html).toContain('Fire, cigarette, exhaust heat, or burn damage');
    expect(html).toContain('Intentional, self-inflicted, or accidental external misuse');
  });

  it('renders a compact summary card with expandable Terms toggle for Order Details', () => {
    const html = renderToStaticMarkup(
      <GuaranteeTerms guaranteeDate="2028-06-30" variant="compact" />,
    );

    expect(html).toContain('data-testid="product-guarantee-terms"');
    expect(html).toContain('data-variant="compact"');
    expect(html).toContain('Official Product Guarantee');
    expect(html).toContain('30 Jun 2028');
    expect(html).toContain('data-testid="guarantee-terms-toggle"');
    expect(html).toContain('Natural cracking, seam tearing');
    expect(html).toContain('Cat scratches, bilet/blade cuts');
  });
});

