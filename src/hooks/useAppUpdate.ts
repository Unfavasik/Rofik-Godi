import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { fetchLatestRelease, type AppRelease } from '../lib/supabaseAppRelease';
import {
  APP_UPDATE_CHANGED_EVENT,
  openApkUpdateDownload,
  readAppUpdateSnooze,
  resolveAppUpdateUiState,
  writeAppUpdateSnooze,
} from '../lib/appUpdateState';

export type AppUpdateInfo = AppRelease;

export type AppUpdateState = {
  /** Visible bottom-sheet release (null when up to date or snoozed via "Later"). */
  update: AppUpdateInfo | null;
  /** Any newer safe APK release installed build hasn't reached yet (persists when snoozed). */
  pendingUpdate: AppUpdateInfo | null;
  /** true when the installed app is older than minVersionCode, so "Later" is hidden */
  required: boolean;
  /** true when the user deferred an available update ("Later" / snoozed), lighting up Account & Settings red dots */
  showDeferredDot: boolean;
  dismiss: () => void;
  startUpdate: () => void;
};

type Snapshot = {
  latest: AppRelease | null;
  installedVersionCode: number;
};

let sharedSnapshot: Snapshot = {
  latest: null,
  installedVersionCode: NaN,
};

const readCurrentUiState = () => {
  const storage = typeof window !== 'undefined' ? window.localStorage : null;
  return resolveAppUpdateUiState({
    latest: sharedSnapshot.latest,
    installedVersionCode: sharedSnapshot.installedVersionCode,
    snooze: readAppUpdateSnooze(storage),
  });
};

const emitAppUpdateChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(APP_UPDATE_CHANGED_EVENT));
  }
};

/** Android app only. Compares the installed build (versionCode) with the release published from the admin panel. */
export const useAppUpdate = (): AppUpdateState => {
  const [uiState, setUiState] = useState(() => readCurrentUiState());

  const syncFromSnapshot = useCallback(() => {
    setUiState(readCurrentUiState());
  }, []);

  const check = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    try {
      const [info, latest] = await Promise.all([App.getInfo(), fetchLatestRelease()]);
      const installed = Number(info.build);
      if (!Number.isFinite(installed)) return;
      sharedSnapshot = {
        latest: latest ?? null,
        installedVersionCode: installed,
      };
      emitAppUpdateChange();
      setUiState(readCurrentUiState());
    } catch {
      /* offline: stay silent */
    }
  }, []);

  useEffect(() => {
    syncFromSnapshot();
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

    if (typeof window !== 'undefined') {
      window.addEventListener(APP_UPDATE_CHANGED_EVENT, syncFromSnapshot);
    }

    return () => {
      active = false;
      remove?.();
      if (typeof window !== 'undefined') {
        window.removeEventListener(APP_UPDATE_CHANGED_EVENT, syncFromSnapshot);
      }
    };
  }, [check, syncFromSnapshot]);

  const dismiss = useCallback(() => {
    const activeRelease = uiState.promptUpdate ?? uiState.pendingUpdate;
    if (activeRelease && typeof window !== 'undefined') {
      writeAppUpdateSnooze(window.localStorage, activeRelease.versionCode);
    }
    emitAppUpdateChange();
    setUiState(readCurrentUiState());
  }, [uiState.pendingUpdate, uiState.promptUpdate]);

  const startUpdate = useCallback(() => {
    const target = uiState.promptUpdate ?? uiState.pendingUpdate;
    openApkUpdateDownload(target?.apkUrl);
  }, [uiState.pendingUpdate, uiState.promptUpdate]);

  return {
    update: uiState.promptUpdate,
    pendingUpdate: uiState.pendingUpdate,
    required: uiState.required,
    showDeferredDot: uiState.showDeferredDot,
    dismiss,
    startUpdate,
  };
};
