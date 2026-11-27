import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { fetchLatestRelease, type AppRelease } from '../lib/supabaseAppRelease';

export type AppUpdateInfo = AppRelease;

export type AppUpdateState = {
  update: AppUpdateInfo | null;
  /** true when the installed app is older than minVersionCode, so "Later" is hidden */
  required: boolean;
  dismiss: () => void;
};

const SNOOZE_KEY = 'rg_update_snooze';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

const readSnooze = (): { code: number; until: number } | null => {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    return raw ? (JSON.parse(raw) as { code: number; until: number }) : null;
  } catch {
    return null;
  }
};

/** Android app only. Compares the installed build (versionCode) with the release published from the admin panel. */
export const useAppUpdate = (): AppUpdateState => {
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const [required, setRequired] = useState(false);

  const check = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    try {
      const [info, latest] = await Promise.all([App.getInfo(), fetchLatestRelease()]);
      const installed = Number(info.build);
      if (!latest || !Number.isFinite(installed) || !latest.apkUrl) return;
      if (latest.versionCode <= installed) {
        setUpdate(null);
        setRequired(false);
        return;
      }
      const mustUpdate = latest.minVersionCode > installed;
      const snooze = readSnooze();
      if (!mustUpdate && snooze && snooze.code === latest.versionCode && snooze.until > Date.now()) return;
      setRequired(mustUpdate);
      setUpdate(latest);
    } catch {
      /* offline: stay silent */
    }
  }, []);

  useEffect(() => {
    void check();
    let remove: (() => void) | null = null;
    let active = true;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void check();
      }).then((handle) => {
        if (active) remove = () => { void handle.remove(); };
        else void handle.remove();
      }).catch(() => {});
    }
    return () => {
      active = false;
      remove?.();
    };
  }, [check]);

  const dismiss = useCallback(() => {
    if (update) {
      try {
        localStorage.setItem(SNOOZE_KEY, JSON.stringify({ code: update.versionCode, until: Date.now() + SNOOZE_MS }));
      } catch { /* ignore */ }
    }
    setUpdate(null);
  }, [update]);

  return { update, required, dismiss };
};
