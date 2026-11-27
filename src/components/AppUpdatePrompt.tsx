import { Browser } from '@capacitor/browser';
import { Download, Sparkles } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { sanitizeUrl } from '../lib/security';

/** Bottom-sheet that tells Android users a new APK is available. Mount once near the app root. */
export const AppUpdatePrompt = () => {
  const { update, required, dismiss } = useAppUpdate();
  const safeApkUrl = update ? sanitizeUrl(update.apkUrl, { allowRelative: false }) : null;
  if (!update || !safeApkUrl) return null;

  const startUpdate = () => {
    Browser.open({ url: safeApkUrl }).catch(() => window.open(safeApkUrl, '_blank', 'noopener,noreferrer'));
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="app-update-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fdecee] text-[#d9232d]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 id="app-update-title" className="text-base font-black text-slate-900">{update.title || 'New update available'} 🎉</h2>
            <p className="text-xs font-semibold text-slate-500">Rofik Godi Center · version {update.versionName}</p>
          </div>
        </div>
        {!!update.notes?.length && (
          <ul className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-3.5 text-[13px] leading-snug text-slate-700">
            {update.notes.map((note) => (
              <li key={note} className="flex gap-2"><span aria-hidden="true">✨</span><span>{note}</span></li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2.5">
          {!required && (
            <button type="button" onClick={dismiss} className="min-h-12 flex-1 rounded-2xl bg-slate-100 text-sm font-extrabold text-slate-700 active:scale-[0.98]">
              Later
            </button>
          )}
          <button type="button" onClick={startUpdate} className="flex min-h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#d9232d] text-sm font-extrabold text-white active:scale-[0.98]">
            <Download className="h-4 w-4" /> Update now
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-400">After download, tap the file and choose Install. Your data stays safe.</p>
      </div>
    </div>
  );
};
