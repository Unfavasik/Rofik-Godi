import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, Check, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  classifyTouchDirection,
  computeDampedPullDistance,
  computePullProgress,
  isPullAllowedForTarget,
  isPullThresholdMet,
  PULL_TRIGGER_THRESHOLD,
  type PullToRefreshPhase,
} from '../lib/pullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  hapticsEnabled?: boolean;
}

const MIN_REFRESH_SPINNER_MS = 520;
const DONE_HOLD_MS = 500;
const RING_RADIUS = 9;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  disabled = false,
  hapticsEnabled = true,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<PullToRefreshPhase>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshedCount, setRefreshedCount] = useState(0);

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const hapticsRef = useRef(hapticsEnabled);
  hapticsRef.current = hapticsEnabled;

  const phaseRef = useRef<PullToRefreshPhase>('idle');
  const pullDistanceRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const activeTargetRef = useRef<EventTarget | null>(null);
  const activeRef = useRef(false);
  const lockRef = useRef<'pending' | 'pull' | 'scroll'>('pending');
  const crossedThresholdRef = useRef(false);
  const minSpinnerTimerRef = useRef<number | null>(null);
  const doneTimerRef = useRef<number | null>(null);

  const updatePhase = (next: PullToRefreshPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const updatePullDistance = (next: number) => {
    pullDistanceRef.current = next;
    setPullDistance(next);
  };

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const triggerHaptic = (duration = 12) => {
      if (!hapticsRef.current || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
        return;
      }
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignore devices/browsers without vibration permission
      }
    };

    const resetGesture = () => {
      activeRef.current = false;
      activeTargetRef.current = null;
      lockRef.current = 'pending';
      crossedThresholdRef.current = false;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        resetGesture();
        return;
      }
      if (phaseRef.current === 'refreshing' || phaseRef.current === 'done') return;
      if (!isPullAllowedForTarget(event.target)) return;

      const touch = event.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      activeTargetRef.current = event.target;
      activeRef.current = true;
      lockRef.current = 'pending';
      crossedThresholdRef.current = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!activeRef.current || event.touches.length !== 1) return;
      if (phaseRef.current === 'refreshing' || phaseRef.current === 'done') return;

      const touch = event.touches[0];
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      if (lockRef.current === 'pending') {
        const direction = classifyTouchDirection(dx, dy);
        if (direction === 'pending') return;
        lockRef.current = direction;
        if (direction === 'scroll') {
          activeRef.current = false;
          return;
        }
      }

      if (lockRef.current !== 'pull') return;

      if (!isPullAllowedForTarget(activeTargetRef.current)) {
        resetGesture();
        updatePullDistance(0);
        updatePhase('idle');
        return;
      }

      const damped = computeDampedPullDistance(dy);
      if (damped <= 0) {
        updatePullDistance(0);
        updatePhase('idle');
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      const ready = isPullThresholdMet(damped);
      if (ready && !crossedThresholdRef.current) {
        crossedThresholdRef.current = true;
        triggerHaptic(12);
      } else if (!ready && crossedThresholdRef.current) {
        crossedThresholdRef.current = false;
      }

      updatePullDistance(damped);
      updatePhase(ready ? 'ready' : 'pulling');
    };

    const handleTouchEnd = () => {
      if (!activeRef.current) return;
      const wasPulling = lockRef.current === 'pull';
      const finalDistance = pullDistanceRef.current;
      resetGesture();

      if (!wasPulling) return;

      if (isPullThresholdMet(finalDistance)) {
        updatePhase('refreshing');
        updatePullDistance(PULL_TRIGGER_THRESHOLD);
        const startedAt = Date.now();

        void Promise.resolve()
          .then(() => onRefreshRef.current())
          .catch(() => {
            // Individual loaders manage their own error states
          })
          .finally(() => {
            const elapsed = Date.now() - startedAt;
            const remaining = Math.max(0, MIN_REFRESH_SPINNER_MS - elapsed);
            if (minSpinnerTimerRef.current !== null) {
              window.clearTimeout(minSpinnerTimerRef.current);
            }
            minSpinnerTimerRef.current = window.setTimeout(() => {
              minSpinnerTimerRef.current = null;
              setRefreshedCount((count) => count + 1);
              updatePhase('done');
              triggerHaptic(8);
              if (doneTimerRef.current !== null) {
                window.clearTimeout(doneTimerRef.current);
              }
              doneTimerRef.current = window.setTimeout(() => {
                doneTimerRef.current = null;
                updatePullDistance(0);
                updatePhase('idle');
              }, DONE_HOLD_MS);
            }, remaining);
          });
      } else {
        updatePullDistance(0);
        updatePhase('idle');
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      if (minSpinnerTimerRef.current !== null) {
        window.clearTimeout(minSpinnerTimerRef.current);
      }
      if (doneTimerRef.current !== null) {
        window.clearTimeout(doneTimerRef.current);
      }
    };
  }, [disabled]);

  const progress = computePullProgress(pullDistance);
  const isVisible = phase !== 'idle' && (pullDistance > 6 || phase === 'refreshing' || phase === 'done');
  const translateY =
    phase === 'refreshing' || phase === 'done'
      ? 18
      : Math.max(-44, Math.min(34, pullDistance * 0.52 - 22));
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - (phase === 'refreshing' || phase === 'done' ? 1 : progress));

  const label =
    phase === 'done'
      ? 'Updated'
      : phase === 'refreshing'
        ? 'Refreshing…'
        : phase === 'ready'
          ? 'Release to refresh'
          : 'Pull to refresh';

  return (
    <div
      data-testid="pull-to-refresh-indicator"
      data-ptr-state={phase}
      data-ptr-refreshed-count={refreshedCount}
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] flex justify-center px-4"
    >
      {phase === 'refreshing' && (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 top-0 z-[91] h-[2.5px] overflow-hidden bg-white/10"
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={prefersReducedMotion ? { x: '0%' } : { x: ['-100%', '100%'] }}
            transition={
              prefersReducedMotion
                ? { duration: 0.2 }
                : { repeat: Infinity, duration: 1.05, ease: 'easeInOut' }
            }
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#FF4D58] to-rose-300 shadow-[0_0_10px_rgba(255,77,88,0.85)]"
          />
        </div>
      )}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="ptr-pill"
            initial={prefersReducedMotion ? { opacity: 0 } : { y: -32, opacity: 0, scale: 0.9 }}
            animate={{
              y: translateY,
              opacity: phase === 'pulling' ? Math.min(1, 0.35 + progress * 0.65) : 1,
              scale: phase === 'ready' ? 1.03 : 1,
            }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: -28, opacity: 0, scale: 0.92 }}
            transition={
              phase === 'pulling' || phase === 'ready'
                ? { type: 'spring', stiffness: 520, damping: 38, mass: 0.5 }
                : { type: 'spring', stiffness: 380, damping: 30, mass: 0.75 }
            }
            className={`inline-flex items-center gap-2.5 rounded-full border bg-[#0B0A0C]/88 px-3.5 py-2 text-white backdrop-blur-2xl backdrop-saturate-150 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.68),0_4px_12px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-black/40 ${
              phase === 'done'
                ? 'border-emerald-400/45'
                : phase === 'ready'
                  ? 'border-white/35'
                  : 'border-white/18 border-t-white/30'
            }`}
          >
            <span className="relative flex h-6 w-6 items-center justify-center">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="absolute inset-0 h-6 w-6 -rotate-90"
              >
                <circle
                  cx="12"
                  cy="12"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth="2"
                />
                <circle
                  cx="12"
                  cy="12"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={phase === 'done' ? '#34D399' : phase === 'ready' || phase === 'refreshing' ? '#FF4D58' : '#FFFFFF'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-[stroke-dashoffset,stroke] duration-150"
                />
              </svg>

              {phase === 'done' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.75} aria-hidden="true" />
              ) : phase === 'refreshing' ? (
                <RefreshCw
                  className={`h-3.5 w-3.5 text-white ${prefersReducedMotion ? '' : 'animate-spin'}`}
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              ) : (
                <ArrowDown
                  className="h-3.5 w-3.5 text-white transition-transform duration-200"
                  style={{ transform: `rotate(${phase === 'ready' ? 180 : Math.round(progress * 140)}deg)` }}
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              )}
            </span>

            <span className="font-accent text-[11.5px] font-bold tracking-[0.01em] text-white/95">
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
