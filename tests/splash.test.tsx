import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SplashScreen } from '../src/components/SplashScreen';

describe('startup splash', () => {
  it('renders only the app icon on the brand background', () => {
    const markup = renderToStaticMarkup(<SplashScreen />);

    expect(markup).toContain('data-purpose="splash-screen"');
    expect(markup).toContain('Loading Rofik Godi Center');
    expect(markup).toContain('src="/icon-192.png"');
    expect(markup).toContain('bg-[#B0182A]');
    expect(markup).not.toContain('Loading your ride essentials');
    expect(markup).not.toContain('/images/rofiq-splash.webp');
    expect(markup).not.toContain('ROFIK GODI CENTER');
  });
});
