import { describe, expect, it, vi } from 'vitest';
import { PWA_INSTALL_DISMISSAL_KEY, PWA_INSTALL_DISMISSAL_MS, readPwaInstallDismissalUntil, rememberPwaInstallDismissal, shouldShowPwaInstallCard } from '../src/lib/pwaInstall';

const createStorage = (value: string | null = null) => {
  let stored = value;
  return {
    getItem: vi.fn(() => stored),
    removeItem: vi.fn(() => { stored = null; }),
    setItem: vi.fn((_key: string, next: string) => { stored = next; }),
    current: () => stored,
  };
};

describe('PWA install prompt state', () => {
  it('shows only when not installed or dismissed and a prompt or iOS Safari hint is available', () => {
    expect(shouldShowPwaInstallCard({ isInstalled: false, canInstall: true, isIOSSafari: false, isDismissed: false })).toBe(true);
    expect(shouldShowPwaInstallCard({ isInstalled: false, canInstall: false, isIOSSafari: true, isDismissed: false })).toBe(true);
    expect(shouldShowPwaInstallCard({ isInstalled: true, canInstall: true, isIOSSafari: false, isDismissed: false })).toBe(false);
    expect(shouldShowPwaInstallCard({ isInstalled: false, canInstall: false, isIOSSafari: false, isDismissed: false })).toBe(false);
    expect(shouldShowPwaInstallCard({ isInstalled: false, canInstall: true, isIOSSafari: false, isDismissed: true })).toBe(false);
  });

  it('stores dismissal for exactly 14 days and reads an unexpired timestamp', () => {
    const now = 1_800_000_000_000;
    const storage = createStorage();
    const until = rememberPwaInstallDismissal(now, storage);
    expect(until).toBe(now + PWA_INSTALL_DISMISSAL_MS);
    expect(storage.setItem).toHaveBeenCalledWith(PWA_INSTALL_DISMISSAL_KEY, String(until));
    expect(readPwaInstallDismissalUntil(now + 1, storage)).toBe(until);
  });

  it('clears expired dismissal records and recovers safely when storage throws', () => {
    const storage = createStorage('1700000000000');
    expect(readPwaInstallDismissalUntil(1_800_000_000_000, storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(PWA_INSTALL_DISMISSAL_KEY);

    const blockedStorage = {
      getItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(readPwaInstallDismissalUntil(1_800_000_000_000, blockedStorage)).toBeNull();
    expect(rememberPwaInstallDismissal(1_800_000_000_000, blockedStorage)).toBe(1_800_000_000_000 + PWA_INSTALL_DISMISSAL_MS);
  });
});
