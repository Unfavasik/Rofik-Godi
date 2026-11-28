import { Browser } from '@capacitor/browser';
import type { AppRelease } from './supabaseAppRelease';
import { sanitizeUrl } from './security';

export type UpdateSnoozeRecord = {
  code: number;
  until: number;
};

export type RgUpdaterBridge = {
  download: (url: string, fileName: string) => string;
  progress: () => string;
};

export type ApkInstallPhase = 'idle' | 'downloading' | 'installing' | 'permission' | 'error';

export const APP_UPDATE_SNOOZE_KEY = 'rg_update_snooze';
export const APP_UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000;
export const APP_UPDATE_CHANGED_EVENT = 'rg:app-update-changed';

export interface ResolvedAppUpdateUiState {
  /** Non-null when the bottom-sheet modal should currently be shown. */
  promptUpdate: AppRelease | null;
  /** Non-null whenever a safe, newer uninstalled APK release exists (even if snoozed via "Later"). */
  pendingUpdate: AppRelease | null;
  /** True when the installed version is below minVersionCode ("Later" is hidden). */
  required: boolean;
  /** True when a newer update was deferred ("Later" tapped / currently snoozed), lighting up Account & Settings red dots. */
  showDeferredDot: boolean;
}

export const getRgUpdater = (): RgUpdaterBridge | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { RGUpdater?: RgUpdaterBridge }).RGUpdater;
};

export const buildApkFileName = (versionName: string): string => {
  const safe = versionName.replace(/[^0-9A-Za-z._-]/g, '') || 'latest';
  return `Rofik_Godi_Center_${safe}.apk`;
};

export const parseRgUpdaterProgress = (
  raw: string,
): { status: number; done: number; total: number; percent: number | null } => {
  const [statusRaw = '', doneRaw = '', totalRaw = ''] = String(raw || '').split('|');
  const status = Number(statusRaw);
  const done = Number(doneRaw);
  const total = Number(totalRaw);
  const percent =
    Number.isFinite(done) && Number.isFinite(total) && total > 0
      ? Math.max(0, Math.min(100, Math.round((done / total) * 100)))
      : null;

  return {
    status: Number.isFinite(status) ? status : 0,
    done: Number.isFinite(done) ? done : 0,
    total: Number.isFinite(total) ? total : 0,
    percent,
  };
};

export const readAppUpdateSnooze = (storage: Pick<Storage, 'getItem'> | null | undefined): UpdateSnoozeRecord | null => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(APP_UPDATE_SNOOZE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UpdateSnoozeRecord>;
    if (typeof parsed.code !== 'number' || typeof parsed.until !== 'number') return null;
    if (!Number.isFinite(parsed.code) || !Number.isFinite(parsed.until)) return null;
    return { code: parsed.code, until: parsed.until };
  } catch {
    return null;
  }
};

export const writeAppUpdateSnooze = (
  storage: Pick<Storage, 'setItem'> | null | undefined,
  versionCode: number,
  now = Date.now(),
): UpdateSnoozeRecord | null => {
  if (!storage || !Number.isFinite(versionCode)) return null;
  const record: UpdateSnoozeRecord = {
    code: versionCode,
    until: now + APP_UPDATE_SNOOZE_MS,
  };
  try {
    storage.setItem(APP_UPDATE_SNOOZE_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
};

export const resolveAppUpdateUiState = ({
  latest,
  installedVersionCode,
  snooze,
  now = Date.now(),
}: {
  latest: AppRelease | null;
  installedVersionCode: number;
  snooze: UpdateSnoozeRecord | null;
  now?: number;
}): ResolvedAppUpdateUiState => {
  if (!latest || !Number.isFinite(installedVersionCode)) {
    return { promptUpdate: null, pendingUpdate: null, required: false, showDeferredDot: false };
  }

  const safeUrl = sanitizeUrl(latest.apkUrl, { allowRelative: false });
  if (!safeUrl || latest.versionCode <= installedVersionCode) {
    return { promptUpdate: null, pendingUpdate: null, required: false, showDeferredDot: false };
  }

  const required = latest.minVersionCode > installedVersionCode;
  const isSnoozed =
    !required &&
    Boolean(snooze && snooze.code === latest.versionCode && snooze.until > now);

  return {
    promptUpdate: isSnoozed ? null : latest,
    pendingUpdate: latest,
    required,
    showDeferredDot: isSnoozed,
  };
};

export const openApkUpdateDownload = (apkUrl: string | null | undefined): boolean => {
  if (!apkUrl) return false;
  const safeApkUrl = sanitizeUrl(apkUrl, { allowRelative: false });
  if (!safeApkUrl) return false;

  if (typeof window !== 'undefined') {
    Browser.open({ url: safeApkUrl }).catch(() => {
      window.open(safeApkUrl, '_blank', 'noopener,noreferrer');
    });
  }
  return true;
};
