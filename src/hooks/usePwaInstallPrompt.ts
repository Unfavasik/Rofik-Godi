import { useCallback, useEffect, useRef, useState } from 'react';
import { readPwaInstallDismissalUntil, rememberPwaInstallDismissal, shouldShowPwaInstallCard } from '../lib/pwaInstall';

export interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
  const displayModeStandalone = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  return displayModeStandalone || standaloneNavigator.standalone === true;
}

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(userAgent) && !/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent);
  return isIOS && isSafari;
}

export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode);
  const [isIOSSafariDevice, setIsIOSSafariDevice] = useState(isIOSSafari);
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(() => readPwaInstallDismissalUntil());
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const installLockRef = useRef(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());
    setIsIOSSafariDevice(isIOSSafari());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)')
      : null;
    const handleDisplayModeChange = () => setIsInstalled(isStandaloneMode());

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (media?.addEventListener) media.addEventListener('change', handleDisplayModeChange);
    else media?.addListener?.(handleDisplayModeChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (media?.removeEventListener) media.removeEventListener('change', handleDisplayModeChange);
      else media?.removeListener?.(handleDisplayModeChange);
    };
  }, []);

  useEffect(() => {
    if (dismissedUntil === null) return;
    const remaining = dismissedUntil - Date.now();
    if (remaining <= 0) {
      setDismissedUntil(null);
      return;
    }
    const timer = window.setTimeout(() => setDismissedUntil(null), remaining);
    return () => window.clearTimeout(timer);
  }, [dismissedUntil]);

  const dismiss = useCallback(() => {
    setDismissedUntil(rememberPwaInstallDismissal());
    setInstallError(null);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt || installLockRef.current) return;
    installLockRef.current = true;
    setIsInstalling(true);
    setInstallError(null);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') setIsInstalled(true);
      else dismiss();
    } catch {
      setInstallError('Could not start installation. Try your browser menu instead.');
    } finally {
      installLockRef.current = false;
      setIsInstalling(false);
    }
  }, [deferredPrompt, dismiss]);

  const isDismissed = dismissedUntil !== null && dismissedUntil > Date.now();
  const canInstall = deferredPrompt !== null;
  const visible = shouldShowPwaInstallCard({
    isInstalled,
    canInstall,
    isIOSSafari: isIOSSafariDevice,
    isDismissed,
  });

  return { visible, canInstall, isIOSSafari: isIOSSafariDevice, isInstalling, installError, install, dismiss };
}
