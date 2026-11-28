import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Download, Loader2, Rocket, ShieldCheck } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { useApkInstaller } from '../hooks/useApkInstaller';
import { sanitizeUrl } from '../lib/security';
import { getAppUpdateSheetMotion } from '../lib/appUpdateMotion';
import { VignetteBarBackdrop } from './VignetteBarBackdrop';

/** Bottom-sheet that tells Android users a new APK is available. Downloads & installs inside the app (APK 1.1.59+). */
export const AppUpdatePrompt = () => {
  const { update, required, dismiss } = useAppUpdate();
  const { phase, percent, busy, hasInAppUpdater, startInstall } = useApkInstaller(update);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const sheetMotion = getAppUpdateSheetMotion(prefersReducedMotion);

  const safeApkUrl = update ? sanitizeUrl(update.apkUrl, { allowRelative: false }) : null;
  const isVisible = Boolean(update && safeApkUrl);

  useEffect(() => {
    if (!isVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !required && !busy) {
        dismiss();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, required, busy, dismiss]);

  const ctaLabel =
    phase === 'downloading'
      ? 'Downloading…'
      : phase === 'installing'
        ? 'Install again'
        : phase === 'error'
          ? 'Try again'
          : 'Update now';

  return (
    <AnimatePresence>
      {isVisible && update && safeApkUrl && (
        <motion.div
          key="app-update-backdrop"
          initial={sheetMotion.backdropInitial}
          animate={sheetMotion.backdropAnimate}
          exit={sheetMotion.backdropExit}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !required && !busy) {
              dismiss();
            }
          }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-update-title"
        >
          <motion.div
            key="app-update-sheet"
            data-testid="app-update-sheet"
            initial={sheetMotion.sheetInitial}
            animate={sheetMotion.sheetAnimate}
            exit={{
              ...sheetMotion.sheetExit,
              transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
            }}
            transition={
              sheetMotion.enabled
                ? { type: 'spring', stiffness: 360, damping: 28, mass: 0.8 }
                : { duration: 0 }
            }
            className="w-full max-w-md overflow-hidden rounded-t-[28px] border border-slate-200/80 bg-white shadow-[0_24px_60px_-16px_rgba(9,8,8,0.55)] sm:rounded-[28px]"
          >
            {/* Signature Dark Obsidian Header Band */}
            <div className="relative isolate overflow-hidden bg-[#090808] px-5 pb-5 pt-3 text-white sm:pt-4">
              <VignetteBarBackdrop variant="top" />

              {/* Mobile Drag Handle Affordance */}
              <div
                aria-hidden="true"
                className="relative z-10 mx-auto mb-3.5 h-1 w-10 rounded-full bg-white/25 sm:hidden"
              />

              <div className="relative z-10 flex items-center gap-3.5">
                {/* Animated Floating Update Emblem */}
                <div className="relative flex h-13 w-13 shrink-0 items-center justify-center">
                  <motion.div
                    aria-hidden="true"
                    animate={sheetMotion.haloAnimate}
                    transition={
                      sheetMotion.enabled
                        ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0 }
                    }
                    className="absolute inset-0 rounded-2xl bg-[#D9232D]/35 blur-[6px]"
                  />
                  <motion.div
                    animate={sheetMotion.emblemAnimate}
                    transition={
                      sheetMotion.enabled
                        ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0 }
                    }
                    className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-[#D9232D] to-[#a6161f] text-white shadow-[0_10px_22px_-8px_rgba(217,35,45,0.75)]"
                  >
                    <Rocket className="h-5 w-5" />
                  </motion.div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold tracking-wide text-white/70 tabular-nums">
                    Rofik Godi Center · version {update.versionName}
                  </p>
                  <h2
                    id="app-update-title"
                    className="mt-0.5 font-display text-lg font-extrabold tracking-[-0.01em] text-white"
                  >
                    {update.title || 'New update available'}
                  </h2>
                  {required && (
                    <p className="mt-0.5 text-[11px] font-semibold text-rose-300">
                      Required release · Install to continue
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sheet Body */}
            <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:pb-5">
              {!!update.notes?.length && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/85 p-3.5">
                  <p className="text-[11px] font-bold text-slate-500">
                    What&apos;s new in this update
                  </p>
                  <ul className="mt-2 space-y-2">
                    {update.notes.map((note, index) => (
                      <motion.li
                        key={note}
                        initial={sheetMotion.getNoteInitial(index)}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: sheetMotion.getNoteDelay(index),
                          duration: 0.24,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-slate-700"
                      >
                        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-red-50 text-[#D9232D]">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                        <span>{note}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {busy && (
                <div className="mt-4" role="status" aria-live="polite">
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#D9232D] transition-[width] duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-center text-xs font-bold text-slate-600 tabular-nums">
                    {phase === 'downloading'
                      ? `Downloading… ${percent}%`
                      : 'Download complete. Tap Install on the next screen.'}
                  </p>
                </div>
              )}

              {phase === 'permission' && (
                <p
                  role="status"
                  className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50 p-3 text-xs font-semibold text-amber-800"
                >
                  Turn on &ldquo;Allow from this source&rdquo; for Rofik Godi Center, go back, then tap Update now again.
                </p>
              )}

              {phase === 'error' && (
                <p
                  role="alert"
                  className="mt-4 rounded-2xl border border-red-200/80 bg-red-50 p-3 text-xs font-semibold text-red-700"
                >
                  Download failed. Check your internet and try again.
                </p>
              )}

              {/* Thumb-Zone Primary Action Row */}
              <div className="mt-4 flex gap-2.5">
                {!required && !busy && (
                  <motion.button
                    type="button"
                    onClick={dismiss}
                    whileTap={sheetMotion.enabled ? { scale: 0.97 } : undefined}
                    className="min-h-12 flex-1 rounded-2xl border border-slate-200/90 bg-slate-100/90 px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200/80"
                  >
                    Later
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  disabled={phase === 'downloading'}
                  onClick={() => void startInstall()}
                  whileTap={sheetMotion.enabled && phase !== 'downloading' ? { scale: 0.97 } : undefined}
                  className="banner-cta-shine group relative flex min-h-12 flex-[1.45] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#D9232D] px-5 text-sm font-bold text-white shadow-[0_12px_24px_-10px_rgba(217,35,45,0.65)] transition-colors hover:bg-[#b91822] disabled:opacity-60"
                >
                  {phase === 'downloading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <motion.span
                      aria-hidden="true"
                      animate={sheetMotion.arrowAnimate}
                      transition={
                        sheetMotion.enabled
                          ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                          : { duration: 0 }
                      }
                      className="inline-flex"
                    >
                      <Download className="h-4 w-4" />
                    </motion.span>
                  )}
                  <span>{ctaLabel}</span>
                </motion.button>
              </div>

              <p
                data-testid="app-update-installer-status"
                className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-slate-500"
              >
                <ShieldCheck
                  className={`h-3.5 w-3.5 shrink-0 ${hasInAppUpdater ? 'text-emerald-600' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span>
                  {hasInAppUpdater
                    ? 'In-app installer ready'
                    : 'Install the latest APK once by hand to enable in-app updates'}
                </span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
