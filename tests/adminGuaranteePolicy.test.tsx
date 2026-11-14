import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AdminGuaranteePolicyCard } from '../src/components/AdminGuaranteePolicyCard';

describe('AdminGuaranteePolicyCard', () => {
  it('renders the All-Products Guarantee Date policy manager with presets and coverage rules', () => {
    const html = renderToStaticMarkup(<AdminGuaranteePolicyCard notify={vi.fn()} />);

    expect(html).toContain('All-Products Guarantee Date');
    expect(html).toContain('Fixed Expiry Date');
    expect(html).toContain('From Order Date');
    expect(html).toContain('Save guarantee date');
    expect(html).toContain('6 Months');
    expect(html).toContain('1 Year');
    expect(html).toContain('2 Years');
    expect(html).toContain('rexine peeling');
    expect(html).toContain('cat scratches');
    expect(html).toContain('blade cuts');
    expect(html).toContain('fire burns');
  });
});
