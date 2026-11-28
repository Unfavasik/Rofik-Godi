import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppRelease } from '../lib/supabaseAppRelease';
import {
  buildApkFileName,
  getRgUpdater,
  openApkUpdateDownload,
  parseRgUpdaterProgress,
  type ApkInstallPhase,
} from '../lib/appUpdateState';
import { sanitizeUrl } from '../lib/security';
import { supabase } from '../lib/supabase';

export interface ApkInstallerState {
  phase: ApkInstallPhase;
  percent: number;
  busy: boolean;
  hasInAppUpdater: boolean;
  startInstall: () => Promise<void>;
  resetPhase: () => void;
}

/**
 * Coordinates in-app Android APK downloads via `window.RGUpdater` (APK 1.1.59+/1.1.61+),
 * pausing Supabase token auto-refresh so rotated refresh tokens are never lost mid-install,
 * and falls back cleanly to browser download for older APK builds.
 */
export function useApkInstaller(release: AppRelease | null | undefined): ApkInstallerState {
  const [phase, setPhase] = useState<ApkInstallPhase>('idle');
  const [percent, setPercent] = useState(0);
  const pollTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearInterval(pollTimerRef.current);
    }
    pollTimerRef.current = null;
  }, []);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = null;
  }, []);

  const resumeAuth = useCallback(() => {
    void supabase?.auth.startAutoRefresh();
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
      clearResumeTimer();
    };
  }, [stopPolling, clearResumeTimer]);

  const poll = useCallback(() => {
    stopPolling();
    if (typeof window === 'undefined') return;
    pollTimerRef.current = window.setInterval(() => {
      const bridge = getRgUpdater();
      if (!bridge) return;
      const parsed = parseRgUpdaterProgress(bridge.progress());
      if (parsed.percent !== null) {
        setPercent(parsed.percent);
      }
      if (parsed.status === 8) {
        stopPolling();
        setPercent(100);
        setPhase('installing');
        clearResumeTimer();
        resumeTimerRef.current = window.setTimeout(resumeAuth, 120000);
      } else if (parsed.status === 16) {
        stopPolling();
        resumeAuth();
        setPhase('error');
      }
    }, 500);
  }, [clearResumeTimer, resumeAuth, stopPolling]);

  const startInstall = useCallback(async () => {
    if (!release) return;
    const safeUrl = sanitizeUrl(release.apkUrl, { allowRelative: false });
    if (!safeUrl) return;

    const bridge = getRgUpdater();
    if (!bridge) {
      openApkUpdateDownload(safeUrl);
      return;
    }

    // Android force-closes the app while installing. Pause Supabase token refresh first so a freshly
    // rotated refresh token is never lost mid-install (which would otherwise log the user out).
    try {
      await supabase?.auth.stopAutoRefresh();
      await supabase?.auth.getSession();
    } catch {
      /* ignore */
    }

    const result = bridge.download(safeUrl, buildApkFileName(release.versionName));
    if (result === 'STARTED') {
      setPercent(0);
      setPhase('downloading');
      poll();
    } else if (result === 'NEEDS_PERMISSION') {
      resumeAuth();
      setPhase('permission');
    } else {
      resumeAuth();
      setPhase('error');
    }
  }, [poll, release, resumeAuth]);

  const resetPhase = useCallback(() => {
    stopPolling();
    clearResumeTimer();
    setPercent(0);
    setPhase('idle');
  }, [clearResumeTimer, stopPolling]);

  const hasInAppUpdater = Boolean(getRgUpdater());
  const busy = phase === 'downloading' || phase === 'installing';

  return {
    phase,
    percent,
    busy,
    hasInAppUpdater,
    startInstall,
    resetPhase,
  };
}
