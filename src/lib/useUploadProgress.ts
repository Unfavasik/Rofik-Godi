import { useCallback, useEffect, useRef, useState } from 'react';

export interface UploadProgressState {
  active: boolean;
  progress: number;
  stageLabel: string;
  fileName: string;
  completedCount: number;
  totalCount: number;
}

const INITIAL_UPLOAD_STATE: UploadProgressState = {
  active: false,
  progress: 0,
  stageLabel: '',
  fileName: '',
  completedCount: 0,
  totalCount: 0,
};

export function getUploadStageLabel(progress: number, baseLabel = 'file'): string {
  if (progress >= 100) return `Uploaded ${baseLabel}`;
  if (progress >= 65) return `Uploading ${baseLabel}…`;
  if (progress >= 35) return `Processing ${baseLabel}…`;
  return `Preparing ${baseLabel}…`;
}

export function useUploadProgress(defaultBaseLabel = 'file') {
  const [state, setState] = useState<UploadProgressState>(INITIAL_UPLOAD_STATE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseLabelRef = useRef<string>(defaultBaseLabel);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const startUpload = useCallback(
    (
      fileName = '',
      options?: {
        totalCount?: number;
        baseLabel?: string;
        initialStage?: string;
      }
    ) => {
      clearTimers();
      const baseLabel = options?.baseLabel ?? defaultBaseLabel;
      baseLabelRef.current = baseLabel;
      const totalCount = Math.max(1, options?.totalCount ?? 1);

      setState({
        active: true,
        progress: 12,
        stageLabel: options?.initialStage ?? getUploadStageLabel(12, baseLabel),
        fileName,
        completedCount: 0,
        totalCount,
      });

      timerRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev.active || prev.progress >= 92) return prev;
          const step =
            prev.progress < 36 ? 7 : prev.progress < 64 ? 4.5 : prev.progress < 82 ? 2.2 : 0.8;
          const next = Math.min(92, Number((prev.progress + step).toFixed(1)));
          return {
            ...prev,
            progress: next,
            stageLabel: getUploadStageLabel(next, baseLabelRef.current),
          };
        });
      }, 140);
    },
    [clearTimers, defaultBaseLabel]
  );

  const updateStage = useCallback(
    (patch: {
      progress?: number;
      stageLabel?: string;
      fileName?: string;
      completedCount?: number;
      totalCount?: number;
    }) => {
      setState((prev) => {
        if (!prev.active) return prev;
        const nextProgress =
          typeof patch.progress === 'number'
            ? Math.max(prev.progress, Math.min(99, patch.progress))
            : prev.progress;
        return {
          ...prev,
          ...patch,
          progress: nextProgress,
          stageLabel:
            patch.stageLabel ??
            (typeof patch.progress === 'number'
              ? getUploadStageLabel(nextProgress, baseLabelRef.current)
              : prev.stageLabel),
        };
      });
    },
    []
  );

  const finishUpload = useCallback(
    (completedLabel?: string) => {
      clearTimers();
      setState((prev) => {
        if (!prev.active) return prev;
        return {
          ...prev,
          active: true,
          progress: 100,
          completedCount: prev.totalCount,
          stageLabel: completedLabel ?? getUploadStageLabel(100, baseLabelRef.current),
        };
      });

      dismissTimerRef.current = setTimeout(() => {
        setState(INITIAL_UPLOAD_STATE);
      }, 650);
    },
    [clearTimers]
  );

  const resetUpload = useCallback(() => {
    clearTimers();
    setState(INITIAL_UPLOAD_STATE);
  }, [clearTimers]);

  return {
    state,
    startUpload,
    updateStage,
    finishUpload,
    resetUpload,
  };
}
