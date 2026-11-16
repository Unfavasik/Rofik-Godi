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
    <aside aria-label={t('pwa.installTitle')} className="flex items-start gap-3 rounded-2xl border border-[#E6CE73] bg-gradient-to-br from-[#FFFCF4] to-[#FFF8D6] px-3.5 py-3 shadow-[0_3px_12px_rgba(107,53,42,0.08)]">
      <div aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#6B352A] text-sm font-black text-[#FFF1A6] shadow-sm">RG</div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[13px] font-extrabold leading-tight text-[#2B1611]">{t('pwa.installTitle')}</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[#4A2B23]">
          {canInstall
            ? t('pwa.installHint')
            : isIOSSafari
              ? t('pwa.iosHint')
              : t('pwa.genericHint')}
        </p>
        {installError && <p role="alert" className="mt-1 text-[11px] font-semibold text-[#9E2A2B]">{installError}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {canInstall && <button type="button" disabled={isInstalling} aria-busy={isInstalling} onClick={() => void onInstall()} className="banner-cta-shine min-h-11 rounded-xl bg-[#6B352A] hover:bg-[#53271E] px-3.5 text-[11px] font-extrabold text-[#FFFCF4] shadow-xs active:scale-95 disabled:opacity-60 cursor-pointer">
            {isInstalling ? t('pwa.opening') : t('pwa.install')}
          </button>}
          <button type="button" onClick={onDismiss} aria-label={t('pwa.dismiss')} className="min-h-11 rounded-xl px-3 text-[11px] font-bold text-[#6B4C44] hover:bg-[#FFF1A6]/60 cursor-pointer">{t('pwa.notNow')}</button>
        </div>
      </div>
    </aside>
  );
};
