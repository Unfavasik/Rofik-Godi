export type AppPhase = 'onboarding' | 'main' | 'account-onboarding' | 'splash' | 'auth';

const mainAppPaths = new Set([
  '/home',
  '/shop',
  '/profile',
  '/account',
  '/search',
  '/wishlist',
  '/cart',
  '/notifications',
  '/notification',
  '/custom',
]);

export function getPathForPhase(phase: AppPhase, currentPath: string): string {
  if (phase === 'onboarding') return '/Onboarding';
  if (phase === 'auth') return '/signup';
  if (phase === 'account-onboarding') return '/signup/onboarding';
  if (phase === 'splash') return '/signup/loading';

  const normalizedPath = currentPath.replace(/\/+$/, '') || '/';
  return mainAppPaths.has(normalizedPath) ? normalizedPath : '/home';
}
