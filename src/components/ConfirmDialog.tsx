import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  children,
  confirmDisabled = false,
  cancelDisabled = false,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-[#1F0E0A]/55 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="max-h-[92dvh] w-full max-w-full overflow-x-hidden overflow-y-auto rounded-t-3xl border border-[#E8D8C4] bg-[#FFFCF4] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${danger ? 'bg-[#FDF2EE] border-[#E9C2B5] text-[#9E2A2B]' : 'bg-[#FFF1A6] border-[#E6CE73] text-[#6B352A]'}`}><AlertTriangle className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><h2 id="confirm-dialog-title" className="text-base font-black text-[#2B1611] break-words">{title}</h2><p className="mt-1 text-sm leading-relaxed text-[#6B4C44] break-words">{message}</p></div>
          <button type="button" onClick={onCancel} disabled={cancelDisabled} aria-label="Close confirmation" className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg p-1 text-[#8A6C63] hover:bg-[#FFF8D6] hover:text-[#2B1611] disabled:opacity-50 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        {children}
        <div className="mt-6 flex flex-wrap justify-end gap-2"><button ref={cancelRef} type="button" onClick={onCancel} disabled={cancelDisabled} className="min-h-11 rounded-xl border border-[#E8D8C4] bg-white px-4 py-2.5 text-xs font-bold text-[#4A2B23] hover:bg-[#FFF8D6] disabled:opacity-50 cursor-pointer">{cancelLabel}</button><button type="button" onClick={onConfirm} disabled={confirmDisabled} className={`min-h-11 rounded-xl px-4 py-2.5 text-xs font-black text-[#FFFCF4] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${danger ? 'bg-[#9E2A2B] hover:bg-[#7F2021]' : 'bg-[#6B352A] hover:bg-[#53271E]'}`}>{confirmLabel}</button></div>
      </div>
    </div>
  );
};
