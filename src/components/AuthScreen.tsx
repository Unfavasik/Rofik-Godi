import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import { UserProfile } from '../types';

interface AuthScreenProps {
  initialMode?: 'signup' | 'login' | 'phone_otp';
  onSuccess: (user: UserProfile) => void;
  onBack: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'signup',
  onSuccess,
  onBack,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const [mode, setMode] = useState<'signup' | 'login' | 'phone_otp'>(initialMode);

  // Form fields
  const [fullName, setFullName] = useState('Asif Ikbal');
  const [email, setEmail] = useState('asif@example.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP state for Phone login
  const [otpCode, setOtpCode] = useState(['5', '8', '2', '4', '', '']);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [timer, setTimer] = useState(30);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }
      if (!agreeTerms) {
        setError('Please agree to the Terms & Conditions');
        return;
      }
    }

    if (mode === 'login' && (!email.trim() || !password.trim())) {
      setError('Please fill in all login credentials');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user: UserProfile = {
        id: `usr-${Date.now()}`,
        name: mode === 'login' ? (fullName || 'Rider Asif') : fullName,
        email: email || 'asif@example.com',
        phone: phone || '+91 98765 43210',
        isGuest: false,
        vehicle: 'Hero Splendor Plus & Toto',
        joinedDate: 'September 2026',
      };
      onSuccess(user);
    }, 800);
  };

  const handleSocialLogin = (provider: 'Google' | 'Facebook') => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const user: UserProfile = {
        id: `usr-${provider.toLowerCase()}-${Date.now()}`,
        name: provider === 'Google' ? 'Asif Ikbal (Google)' : 'Asif Ikbal (Facebook)',
        email: 'asif.ikbal@gmail.com',
        phone: '+91 98765 43210',
        isGuest: false,
        vehicle: 'Universal Garage Fitment',
        joinedDate: 'September 2026',
      };
      onSuccess(user);
    }, 700);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-between p-5 max-w-[440px] mx-auto select-none font-sans animate-fade-in">
      {/* Top Header Row with Back Button (Matching Image 3) */}
      <div>
        <div className="flex items-center space-x-3 pt-2 mb-4">
          <button
            onClick={onBack}
            aria-label="Go Back"
            className="p-1 -ml-1 text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1 mb-6">
          <h1 className="text-[26px] font-extrabold text-gray-950 tracking-tight leading-tight">
            {mode === 'signup' && 'Create Account'}
            {mode === 'login' && 'Welcome Back'}
            {mode === 'phone_otp' && 'Verify Phone'}
          </h1>
          <p className="text-[13.5px] text-gray-500 font-normal">
            {mode === 'signup' && 'Join Rofik Godi Centre for tracking & discounts'}
            {mode === 'login' && 'Sign in to access your garage & orders'}
            {mode === 'phone_otp' && `Enter 6-digit code sent to ${phone}`}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl animate-shake">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <div className="relative flex items-center bg-[#F8FAFC] border border-gray-200/80 rounded-2xl px-3.5 py-2.5 focus-within:border-[#D9232D] focus-within:bg-white transition-all shadow-2xs">
                <div className="w-7 text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-transparent text-[13.5px] font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {mode !== 'phone_otp' && (
            <div>
              <div className="relative flex items-center bg-[#F8FAFC] border border-gray-200/80 rounded-2xl px-3.5 py-2.5 focus-within:border-[#D9232D] focus-within:bg-white transition-all shadow-2xs">
                <div className="w-7 text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-transparent text-[13.5px] font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <div className="relative flex items-center bg-[#F8FAFC] border border-gray-200/80 rounded-2xl px-3.5 py-2.5 focus-within:border-[#D9232D] focus-within:bg-white transition-all shadow-2xs">
                <div className="w-7 text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-transparent text-[13.5px] font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {mode !== 'phone_otp' && (
            <div>
              <div className="relative flex items-center bg-[#F8FAFC] border border-gray-200/80 rounded-2xl px-3.5 py-2.5 focus-within:border-[#D9232D] focus-within:bg-white transition-all shadow-2xs">
                <div className="w-7 text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                    Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent text-[13.5px] font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Terms & Conditions Checkbox (Matching Image 3) */}
          {mode === 'signup' && (
            <div className="flex items-center space-x-2.5 pt-1 px-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded text-[#D9232D] focus:ring-[#D9232D] border-gray-300 accent-[#D9232D] cursor-pointer"
              />
              <label htmlFor="terms" className="text-[12px] text-gray-600 font-normal cursor-pointer select-none">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="text-[#D9232D] font-bold hover:underline"
                >
                  Terms &amp; Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="text-[#D9232D] font-bold hover:underline"
                >
                  Privacy Policy
                </button>
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#D9232D] hover:bg-[#C01B24] active:scale-[0.98] text-white rounded-2xl flex items-center justify-center space-x-2 shadow-[0_4px_14px_rgba(217,35,45,0.3)] transition-all font-bold text-[15px] mt-4"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'login' && 'Sign In'}
                  {mode === 'phone_otp' && 'Verify & Proceed'}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="flex items-center space-x-3 my-5">
          <div className="flex-1 h-[1px] bg-gray-200" />
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">OR</span>
          <div className="flex-1 h-[1px] bg-gray-200" />
        </div>

        {/* Social Logins (Google & Facebook Matching Image 3) */}
        <div className="space-y-2.5">
          {/* Google */}
          <button
            onClick={() => handleSocialLogin('Google')}
            className="w-full h-11 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-900 border border-gray-200 rounded-2xl flex items-center justify-center space-x-3 transition-all font-semibold text-[13.5px] shadow-2xs"
          >
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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

          {/* Facebook */}
          <button
            onClick={() => handleSocialLogin('Facebook')}
            className="w-full h-11 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-900 border border-gray-200 rounded-2xl flex items-center justify-center space-x-3 transition-all font-semibold text-[13.5px] shadow-2xs"
          >
            <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <span>Continue with Facebook</span>
          </button>
        </div>
      </div>

      {/* Switch between Login and Sign up */}
      <div className="pt-6 pb-2 text-center">
        {mode === 'signup' ? (
          <p className="text-[13px] text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('login');
              }}
              className="text-[#D9232D] font-bold hover:underline ml-1"
            >
              Login
            </button>
          </p>
        ) : (
          <p className="text-[13px] text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('signup');
              }}
              className="text-[#D9232D] font-bold hover:underline ml-1"
            >
              Create Account
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
