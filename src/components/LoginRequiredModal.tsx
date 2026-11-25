import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, ShieldCheck, ArrowRight, Wrench, UserPlus } from 'lucide-react';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: (mode?: 'signup' | 'login') => void;
  reason?: string;
}

export const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  reason = 'Please login to place your order.',
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative max-h-[92dvh] w-full max-w-full sm:max-w-[400px] bg-white rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl border border-slate-200/85 z-10 overflow-x-hidden overflow-y-auto font-sans"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close sign-in prompt"
            className="absolute top-3.5 right-3.5 grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 active:scale-95 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Lock Badge */}
          <div className="flex flex-col items-center text-center space-y-1.5 pt-1">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-[#D9232D] mb-0.5">
              <Lock className="w-5 h-5 stroke-[2.2]" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-950 tracking-tight leading-tight">
              {reason}
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed max-w-[300px]">
              Sign in with your account to track pickup orders, save your vehicle profile and manage custom requests.
            </p>
          </div>

          {/* Value points */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 my-3.5 space-y-2 text-left">
            <div className="flex items-center space-x-2 text-[12px] font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <span>Live workshop stitching &amp; pickup tracking</span>
            </div>
            <div className="flex items-center space-x-2 text-[12px] font-semibold text-slate-800">
              <Wrench className="w-4 h-4 text-[#D9232D] flex-shrink-0" />
              <span>Free on-spot fitment at our Murshidabad store</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-0.5">
            {/* New customer: begin with the dedicated signup onboarding. */}
            <button
              onClick={() => onOpenAuth('signup')}
              className="banner-cta-shine group/cta w-full h-11 bg-[#D9232D] hover:bg-[#BE1C25] active:scale-[0.98] text-white rounded-xl flex items-center justify-center space-x-2 transition-colors font-bold text-[13.5px]"
            >
              <UserPlus className="h-4 w-4 transition-transform duration-200 group-hover/cta:scale-105" />
              <span>Create an account</span>
            </button>

            {/* Email / Phone Login */}
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full h-10 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-900 border border-slate-200 rounded-xl flex items-center justify-center space-x-2 transition-colors font-semibold text-[13px]"
            >
              <span>I already have an account — Sign in</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Continue browsing as Guest */}
            <button
              onClick={onClose}
              className="min-h-9 w-full py-1.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Continue browsing as Guest
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
