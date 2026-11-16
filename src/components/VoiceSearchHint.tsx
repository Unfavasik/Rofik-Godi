import React from 'react';
import { X } from 'lucide-react';

interface VoiceSearchHintProps {
  id: string;
  visible: boolean;
  onDismiss: () => void;
  alignClassName?: string;
}

export const VoiceSearchHint: React.FC<VoiceSearchHintProps> = ({
  id,
  visible,
  onDismiss,
  alignClassName = '',
}) => {
  if (!visible) return null;

  return (
    <div
      id={id}
      data-purpose="voice-search-hint"
      className={`mt-1.5 flex items-center justify-end gap-1 ${alignClassName}`}
    >
      <p className="min-w-0 text-right text-[11px] leading-snug text-[#6B4C44]">
        <span className="font-semibold text-[#4A2B23]">Say:</span>{' '}
        <span>&ldquo;Show me bike covers&rdquo;</span>
        <span aria-hidden="true" className="mx-1 text-[#CBB8A6]">
          ·
        </span>
        <span>&ldquo;Activa seat cover&rdquo;</span>
        <span aria-hidden="true" className="hidden sm:inline mx-1 text-[#CBB8A6]">
          ·
        </span>
        <span className="hidden sm:inline">&ldquo;Toto cushion&rdquo;</span>
      </p>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss voice command tip"
        title="Dismiss tip"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#8A6C63] hover:bg-[#FFF8D6] hover:text-[#2B1611] transition-colors cursor-pointer"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};
