import { describe, expect, it } from 'vitest';
import { getPathForPhase } from '../src/lib/appRoutes';

describe('main route preservation', () => {
  it.each(['/home', '/shop', '/profile', '/account', '/search', '/wishlist', '/cart', '/notifications', '/notification', '/custom'])(
    'keeps %s when entering the main phase',
    (path) => {
      expect(getPathForPhase('main', path)).toBe(path);
    },
  );

  it('falls back to home when entering main from an auth or onboarding route', () => {
    expect(getPathForPhase('main', '/signup')).toBe('/home');
    expect(getPathForPhase('main', '/Onboarding')).toBe('/home');
  });

  it('normalizes a trailing slash while preserving a valid main route', () => {
    expect(getPathForPhase('main', '/profile/')).toBe('/profile');
  });
});
