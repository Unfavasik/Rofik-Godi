import React from 'react';
import { useI18n } from '../lib/i18n';

export interface PwaInstallCardProps {
  visible: boolean;
  canInstall: boolean;
  isIOSSafari: boolean;
  isInstalling: boolean;
  installError: string | null;
  onInstall: () => void | Promise<void>;
  onDismiss: () => void;
}

export const PwaInstallCard: React.FC<PwaInstallCardProps> = ({
  visible,
  canInstall,
  isIOSSafari,
  isInstalling,
  installError,
  onInstall,
  onDismiss,
}) => {
  const { t } = useI18n();
  if (!visible) return null;
  return (
    <aside aria-label={t('pwa.installTitle')} className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50 px-3.5 py-3 shadow-[0_3px_12px_rgba(15,23,42,.05)]">
      <div aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D9232D] text-sm font-black text-white shadow-sm">RG</div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[13px] font-extrabold leading-tight text-slate-900">{t('pwa.installTitle')}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-700">
          {canInstall
            ? t('pwa.installHint')
            : isIOSSafari
              ? t('pwa.iosHint')
              : t('pwa.genericHint')}
        </p>
        {installError && <p role="alert" className="mt-1 text-[11px] font-semibold text-rose-800">{installError}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {canInstall && <button type="button" disabled={isInstalling} aria-busy={isInstalling} onClick={() => void onInstall()} className="banner-cta-shine min-h-11 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-3.5 text-[11px] font-extrabold text-white shadow-xs hover:brightness-105 active:scale-95 disabled:opacity-60">
            {isInstalling ? t('pwa.opening') : t('pwa.install')}
          </button>}
          <button type="button" onClick={onDismiss} aria-label={t('pwa.dismiss')} className="min-h-11 rounded-xl px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-100">{t('pwa.notNow')}</button>
        </div>
      </div>
    </aside>
  );
};
