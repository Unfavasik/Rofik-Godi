export const PWA_INSTALL_DISMISSAL_KEY = 'work-app:pwa-install-dismissed-until';
export const PWA_INSTALL_DISMISSAL_MS = 14 * 24 * 60 * 60 * 1000;

type ReadStorage = Pick<Storage, 'getItem' | 'removeItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

function getBrowserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readPwaInstallDismissalUntil(nowMs = Date.now(), storage: ReadStorage | null = getBrowserStorage()): number | null {
  if (!storage) return null;
  try {
    const rawExpiry = storage.getItem(PWA_INSTALL_DISMISSAL_KEY);
    if (!rawExpiry) return null;
    const expiry = Number(rawExpiry);
    if (!Number.isFinite(expiry) || expiry <= nowMs) {
      storage.removeItem(PWA_INSTALL_DISMISSAL_KEY);
      return null;
    }
    return expiry;
  } catch {
    return null;
  }
}

export function rememberPwaInstallDismissal(nowMs = Date.now(), storage: WriteStorage | null = getBrowserStorage()): number {
  const expiry = nowMs + PWA_INSTALL_DISMISSAL_MS;
  try {
    storage?.setItem(PWA_INSTALL_DISMISSAL_KEY, String(expiry));
  } catch {
    // Keep the in-memory dismissal even when browser storage is blocked.
  }
  return expiry;
}

export function shouldShowPwaInstallCard(input: {
  isInstalled: boolean;
  canInstall: boolean;
  isIOSSafari: boolean;
  isDismissed: boolean;
}): boolean {
  return !input.isInstalled && !input.isDismissed && (input.canInstall || input.isIOSSafari);
}
