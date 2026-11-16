import React from 'react';
import { AlertCircle, Mic, X } from 'lucide-react';

interface VoiceSearchBannerProps {
  isListening: boolean;
  interimTranscript: string;
  error: string | null;
  onStop: () => void;
  onDismissError: () => void;
}

export const VoiceSearchBanner: React.FC<VoiceSearchBannerProps> = ({
  isListening,
  interimTranscript,
  error,
  onStop,
  onDismissError,
}) => {
  if (!isListening && !error) return null;

  if (isListening) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-purpose="voice-listening-banner"
        className="mt-2 flex items-center justify-between gap-2.5 rounded-xl border border-[#E6CE73] bg-[#FFF8D6] px-3 py-2 text-xs"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-hidden="true"
            className="voice-mic-pulse flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6B352A] text-[#FFFCF4]"
          >
            <Mic className="h-3.5 w-3.5" />
          </span>
          <p className="min-w-0 flex-1 truncate font-semibold text-[#2B1611]">
            {interimTranscript ? (
              <span>&ldquo;{interimTranscript}&rdquo;</span>
            ) : (
              <span className="text-[#6B352A]">
                Listening… Speak a seat cover or bike model
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onStop}
          className="min-h-8 shrink-0 rounded-lg border border-[#E6CE73] bg-white px-2.5 py-1 text-[11px] font-bold text-[#6B352A] hover:bg-[#FFF1A6] transition-colors cursor-pointer"
        >
          Stop
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      data-purpose="voice-error-banner"
      className="mt-2 flex items-center justify-between gap-2.5 rounded-xl border border-[#E6CE73] bg-[#FFF8D6] px-3 py-2 text-xs"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-[#9A4D16]" />
        <p className="min-w-0 flex-1 font-medium text-[#6B352A]">{error}</p>
      </div>

      <button
        type="button"
        onClick={onDismissError}
        aria-label="Dismiss voice search notice"
        title="Dismiss"
        className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg text-[#9A4D16] hover:bg-[#FFF1A6] transition-colors cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
