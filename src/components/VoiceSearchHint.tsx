import React from 'react';
import { X } from 'lucide-react';

interface VoiceSearchHintProps {
  id: string;
  visible: boolean;
  onDismiss: () => void;
  alignClassName?: string;
  tone?: 'light' | 'dark';
}

export const VoiceSearchHint: React.FC<VoiceSearchHintProps> = ({
  id,
  visible,
  onDismiss,
  alignClassName = '',
  tone = 'light',
}) => {
  if (!visible) return null;

  const isDark = tone === 'dark';

  return (
    <div
      id={id}
      data-purpose="voice-search-hint"
      className={`mt-1.5 flex items-center justify-end gap-1 ${alignClassName}`}
    >
      <p
        className={`min-w-0 text-right text-[11px] leading-snug ${
          isDark ? 'text-white/85' : 'text-slate-500'
        }`}
      >
        <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-700'}`}>Say:</span>{' '}
        <span>&ldquo;Show me bike covers&rdquo;</span>
        <span aria-hidden="true" className={`mx-1 ${isDark ? 'text-white/45' : 'text-slate-300'}`}>
          ·
        </span>
        <span>&ldquo;Activa seat cover&rdquo;</span>
        <span
          aria-hidden="true"
          className={`hidden sm:inline mx-1 ${isDark ? 'text-white/45' : 'text-slate-300'}`}
        >
          ·
        </span>
        <span className="hidden sm:inline">&ldquo;Toto cushion&rdquo;</span>
      </p>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss voice command tip"
        title="Dismiss tip"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
          isDark
            ? 'text-white/80 hover:bg-white/18 hover:text-white'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
        }`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};
