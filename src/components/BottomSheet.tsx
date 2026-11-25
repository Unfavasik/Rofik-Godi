import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { VignetteBarBackdrop, VignettePageCurtain } from './VignetteBarBackdrop';

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
  return <AnimatePresence>{open && <motion.div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-slate-950/50 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="bottom-sheet-title" className={`flex max-h-[85dvh] w-full max-w-full flex-col overflow-hidden overflow-x-hidden rounded-t-2xl bg-[#F8FAFC] shadow-2xl sm:max-w-lg sm:rounded-2xl ${className}`} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}>
      <div className="relative isolate shrink-0 overflow-hidden bg-[#090808] px-4 pb-3 pt-2.5 text-white sm:pt-3">
        <VignetteBarBackdrop variant="top" />
        <div className="relative z-10 mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/30 sm:hidden" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <h2 id="bottom-sheet-title" className="min-w-0 flex-1 truncate text-[15px] font-black text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition-colors hover:bg-white/22"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="relative -mt-px min-h-0 min-w-0 overflow-x-hidden overflow-y-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <VignettePageCurtain className="h-[130px]" />
        <div className="relative z-10">{children}</div>
      </div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
};
