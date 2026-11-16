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
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1F0E0A]/60 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative max-h-[92dvh] w-full max-w-full sm:max-w-[440px] bg-[#FFFCF4] border border-[#E8D8C4] rounded-t-[32px] sm:rounded-[32px] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl z-10 overflow-x-hidden overflow-y-auto font-sans"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close sign-in prompt"
            className="absolute top-5 right-5 grid min-h-11 min-w-11 place-items-center rounded-full bg-[#FFF8D6] text-[#6B4C44] hover:text-[#2B1611] hover:bg-[#FFF1A6] active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Lock Badge */}
          <div className="flex flex-col items-center text-center space-y-2 pt-2">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF1A6] border border-[#E6CE73] flex items-center justify-center text-[#6B352A] shadow-sm mb-1">
              <Lock className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-[20px] font-black text-[#2B1611] tracking-tight leading-tight">
              {reason}
            </h3>

            <p className="text-[13px] text-[#6B4C44] leading-relaxed max-w-[320px]">
              Sign in with your account to securely track pickup orders, save your profile and earn loyalty rewards.
            </p>
          </div>

          {/* Value points */}
          <div className="bg-[#FFF8D6]/60 border border-[#E8D8C4] rounded-2xl p-3 my-4 space-y-2 text-left">
            <div className="flex items-center space-x-2.5 text-[12px] font-semibold text-[#2B1611]">
              <ShieldCheck className="w-4 h-4 text-[#6B352A] flex-shrink-0" />
              <span>Live workshop stitching &amp; dispatch tracking</span>
            </div>
            <div className="flex items-center space-x-2.5 text-[12px] font-semibold text-[#2B1611]">
              <Sparkles className="w-4 h-4 text-[#FF6115] flex-shrink-0" />
              <span>Free warranty fitment at Murshidabad Store</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* New customer: begin with the dedicated signup onboarding. */}
            <button
              onClick={() => onOpenAuth('signup')}
              className="banner-cta-shine group/cta w-full h-12 bg-[#FF6115] hover:bg-[#E5520D] shadow-[0_6px_18px_rgba(255,97,21,0.3)] active:scale-[0.98] text-[#1F0E0A] rounded-2xl flex items-center justify-center space-x-3 transition-all font-extrabold text-[14.5px] cursor-pointer"
            >
              <Sparkles className="h-5 w-5 transition-transform duration-200 group-hover/cta:scale-105" />
              <span>Create an account</span>
            </button>

            {/* Email / Phone Login */}
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full h-11 bg-[#6B352A] hover:bg-[#53271E] active:scale-[0.98] text-[#FFFCF4] rounded-2xl flex items-center justify-center space-x-2 transition-all font-bold text-[13.5px] cursor-pointer"
            >
              <span>I already have an account — Sign in</span>
              <ArrowRight className="w-4 h-4 text-[#FFF1A6]" />
            </button>

            {/* Continue browsing as Guest */}
            <button
              onClick={onClose}
              className="min-h-11 w-full py-2 text-center text-xs font-semibold text-[#8A6C63] hover:text-[#6B352A] transition-colors cursor-pointer"
            >
              Continue browsing as Guest
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
