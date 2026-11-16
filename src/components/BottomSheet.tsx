import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export const BottomSheet: React.FC<BottomSheetProps> = ({ open, title, onClose, children, className = '' }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')).filter((item) => !item.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => sheetRef.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus(), 0);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKeyDown); };
  }, [open, onClose]);
  return <AnimatePresence>{open && <motion.div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/45 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="bottom-sheet-title" className={`flex max-h-[85dvh] w-full max-w-full flex-col overflow-hidden overflow-x-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl ${className}`} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}>
      <div className="shrink-0 border-b border-slate-100 px-5 pb-3.5 pt-3 sm:pt-4">
        <div className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 id="bottom-sheet-title" className="min-w-0 flex-1 truncate text-base font-black text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
};
