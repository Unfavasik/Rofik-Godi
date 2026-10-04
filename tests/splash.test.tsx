import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SplashScreen } from '../src/components/SplashScreen';

describe('startup splash', () => {
  it('renders the branded loading status without requiring an auto-dismiss callback', () => {
    const markup = renderToStaticMarkup(<SplashScreen />);

    expect(markup).toContain('data-purpose="splash-screen"');
    expect(markup).toContain('Loading Rofik Godi Centre');
    expect(markup).toContain('ROFIK GODI');
    expect(markup).toContain('bg-[#D9232D]');
  });
});
