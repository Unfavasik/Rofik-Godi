import { CheckCircle2, LoaderCircle } from 'lucide-react';
import type { UploadProgressState } from '../lib/useUploadProgress';

interface UploadProgressBarProps {
  state: UploadProgressState;
  tone?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
}

export function UploadProgressBar({
  state,
  tone = 'light',
  compact = false,
  className = '',
}: UploadProgressBarProps) {
  if (!state.active) return null;

  const pct = Math.max(0, Math.min(100, Math.round(state.progress)));
  const isDone = pct >= 100;
  const isDark = tone === 'dark';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border ${
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
      } ${
        isDark
          ? 'border-white/10 bg-[#1a1816]/90 text-white'
          : 'border-slate-200/90 bg-slate-50/95 text-slate-800'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
        <div className="flex min-w-0 items-center gap-1.5">
          {isDone ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          ) : (
            <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-[#D9232D]" />
          )}
          <span className="truncate">{state.stageLabel || 'Processing file…'}</span>
          {state.totalCount > 1 ? (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                isDark ? 'bg-white/10 text-white/80' : 'bg-slate-200/75 text-slate-600'
              }`}
            >
              {Math.min(state.completedCount + (isDone ? 0 : 1), state.totalCount)}/{state.totalCount}
            </span>
          ) : null}
          {state.fileName ? (
            <span
              className={`hidden truncate text-[10px] sm:inline ${
                isDark ? 'text-white/55' : 'text-slate-500'
              }`}
            >
              · {state.fileName}
            </span>
          ) : null}
        </div>
        <span
          className={`shrink-0 font-bold tabular-nums ${
            isDone
              ? 'text-emerald-600'
              : isDark
                ? 'text-white/90'
                : 'text-slate-700'
          }`}
        >
          {pct}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={state.stageLabel || 'File upload progress'}
        className={`mt-1.5 h-1.5 w-full overflow-hidden rounded-full ${
          isDark ? 'bg-white/10' : 'bg-slate-200/80'
        }`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-out ${
            isDone
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-[#D9232D] via-[#ef4444] to-[#f97316] skeleton-shimmer'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
