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
            {/* Google 1-Tap */}
            <button
              onClick={() => {
                onClose();
                onOpenAuth('login');
              }}
              className="w-full h-12 bg-[#D9232D] hover:bg-[#C01B24] active:scale-[0.98] text-white rounded-2xl flex items-center justify-center space-x-3 shadow-[0_4px_14px_rgba(217,35,45,0.3)] transition-all font-bold text-[14.5px]"
            >
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
              <span>Continue with Google</span>
            </button>

            {/* Email / Phone Login */}
            <button
              onClick={() => {
                onClose();
                onOpenAuth('login');
              }}
              className="w-full h-11 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-900 border border-gray-200 rounded-2xl flex items-center justify-center space-x-2 transition-all font-semibold text-[13.5px]"
            >
              <span>Login / Create Account</span>
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
