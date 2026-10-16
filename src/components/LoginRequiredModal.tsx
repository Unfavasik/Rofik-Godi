import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-[440px] bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl z-10 overflow-hidden font-sans"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Lock Badge */}
          <div className="flex flex-col items-center text-center space-y-2 pt-2">
            <div className="w-14 h-14 rounded-2xl bg-[#FEECEC] border border-red-200 flex items-center justify-center text-[#D9232D] shadow-sm mb-1">
              <Lock className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-[20px] font-black text-gray-950 tracking-tight leading-tight">
              {reason}
            </h3>

            <p className="text-[13px] text-gray-500 leading-relaxed max-w-[320px]">
              Sign in with your account to securely track pickup orders, save your profile and earn loyalty rewards.
            </p>
          </div>

          {/* Value points */}
          <div className="bg-[#FAF9FB] border border-gray-100 rounded-2xl p-3 my-4 space-y-2 text-left">
            <div className="flex items-center space-x-2.5 text-[12px] font-semibold text-gray-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Live workshop stitching &amp; dispatch tracking</span>
            </div>
            <div className="flex items-center space-x-2.5 text-[12px] font-semibold text-gray-800">
              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Free warranty fitment at Murshidabad Store</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* New customer: begin with the dedicated signup onboarding. */}
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full h-12 bg-[#D9232D] hover:bg-[#C01B24] active:scale-[0.98] text-white rounded-2xl flex items-center justify-center space-x-3 shadow-[0_4px_14px_rgba(217,35,45,0.3)] transition-all font-bold text-[14.5px]"
            >
              <Sparkles className="h-5 w-5" />
              <span>Create an account</span>
            </button>

            {/* Email / Phone Login */}
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full h-11 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-900 border border-gray-200 rounded-2xl flex items-center justify-center space-x-2 transition-all font-semibold text-[13.5px]"
            >
              <span>I already have an account — Sign in</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </button>

            {/* Continue browsing as Guest */}
            <button
              onClick={onClose}
              className="w-full py-2 text-center text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors"
            >
              Continue browsing as Guest
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
