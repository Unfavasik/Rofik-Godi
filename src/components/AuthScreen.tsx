import React, { useState } from 'react';
import { UserProfile } from '../types';
import signupAvatar from '../assets/onboarding/signup.svg';
import loginAvatar from '../assets/onboarding/singing.svg';

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
  const [mode, setMode] = useState<'signup' | 'login'>(
    initialMode === 'login' ? 'login' : 'signup'
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Enter your full name');
        return;
      }
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError('Enter a valid email');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (!agree) {
        setError('Please accept the personal data terms');
        return;
      }

      showToast('Account created');
      setTimeout(() => {
        const user: UserProfile = {
          id: `usr-${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          phone: '+91 98765 43210',
          isGuest: false,
          vehicle: 'Hero Splendor Plus & Toto',
          joinedDate: 'September 2026',
        };
        onSuccess(user);
      }, 500);
    } else {
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError('Enter a valid email');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      showToast('Signed in');
      setTimeout(() => {
        const user: UserProfile = {
          id: `usr-${Date.now()}`,
          name: name.trim() || 'Rider Asif',
          email: email.trim(),
          phone: '+91 98765 43210',
          isGuest: false,
          vehicle: 'Hero Splendor Plus & Toto',
          joinedDate: 'September 2026',
        };
        onSuccess(user);
      }, 500);
    }
  };

  const handleSocial = (provider: string) => {
    showToast(`${provider} login`);
    setTimeout(() => {
      const user: UserProfile = {
        id: `usr-${provider.toLowerCase()}-${Date.now()}`,
        name: `Asif Ikbal (${provider})`,
        email: `asif.${provider.toLowerCase()}@example.com`,
        phone: '+91 98765 43210',
        isGuest: false,
        vehicle: 'Rofik Godi Rider',
        joinedDate: 'September 2026',
      };
      onSuccess(user);
    }, 600);
  };

  return (
    <div className="flex min-h-screen w-full justify-center overflow-x-hidden bg-[#f7d9de] font-['Poppins',sans-serif] text-[#0f1a3a] select-none antialiased">
      {/* App Container matching exact 430px phone view */}
      <div className="relative flex min-h-full w-full min-w-0 max-w-[430px] flex-col overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,#fdeff1_0%,#fbe0e4_40%,#fdeff1_100%)] shadow-2xl">
        
        {/* Decorative Background Glow Spheres */}
        <div
          className="pointer-events-none absolute -right-[60px] -top-[70px] h-[230px] w-[230px] rounded-full"
          style={{ background: 'radial-gradient(circle at 35% 30%, #ff5a6b, #c4102a)' }}
        />
        <div
          className="pointer-events-none absolute -right-[90px] top-[50px] h-[170px] w-[170px] rounded-full bg-[#f9b7bf] opacity-70"
        />
        <div
          className="pointer-events-none absolute left-[105px] top-[80px] h-[34px] w-[34px] rounded-full bg-[#f7b9c0]"
        />

        {/* Top Header & Back Button */}
        <div className={`relative overflow-hidden bg-[#fdeff1] px-5 pt-[calc(env(safe-area-inset-top,0px)+18px)] ${mode === 'signup' ? 'min-h-[259px]' : 'min-h-[278px]'}`}>
          <img
            src={mode === 'signup' ? signupAvatar : loginAvatar}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${mode === 'signup' ? 'object-[center_top]' : 'object-[center_top]'}`}
          />
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="relative z-10 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-[#111] shadow-[0_6px_16px_rgba(224,24,45,0.15)] transition-transform active:scale-95"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#111"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>

          {/* Title & Subtitle */}
          <h1 className={`relative z-10 max-w-[220px] whitespace-nowrap font-bold tracking-tight leading-[1.08] text-[#0f1a3a] ${mode === 'signup' ? 'mt-[38px] text-[clamp(28px,8.4vw,36px)]' : 'mt-[54px] text-[clamp(25px,7.3vw,31px)]'}`}>
            {mode === 'signup' ? (
              <>
                Get <span className="text-[#e0182d]">Started</span>
              </>
            ) : (
              <>
                Welcome <span className="text-[#e0182d]">Back</span>
              </>
            )}
          </h1>
          <p className="relative z-10 mt-2.5 max-w-[205px] text-[15px] font-normal leading-[1.55] text-[#3b4258]">
            {mode === 'signup' ? (
              <>
                Create your account to explore
                <br />
                Rofik Godi Centre.
              </>
            ) : (
              <>
                Sign in to continue to
                <br />
                Rofik Godi Centre.
              </>
            )}
          </p>
        </div>

        {/* Bottom Form Card */}
        <div className={`relative flex-1 rounded-t-[44px] bg-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-5 shadow-[0_-6px_30px_rgba(224,24,45,0.08)] ${mode === 'signup' ? '-mt-[34px]' : '-mt-[25px]'}`}>
          <form onSubmit={handleSubmit} className="space-y-0">
            {/* Full Name Input (Signup only) */}
            {mode === 'signup' && (
              <div className="mb-2.5">
                <label className="flex h-[48px] items-center gap-3 rounded-[24px] border-[1.5px] border-[#ece4e6] bg-[#fffafa] px-5 transition-all focus-within:border-[#e0182d] focus-within:shadow-[0_0_0_4px_rgba(224,24,45,0.1)]">
                  <svg
                    className="shrink-0"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7a7f8e"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
                  </svg>
                  <input
                    id="n"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    autoComplete="name"
                    className="w-full min-w-0 border-0 bg-transparent text-[14px] font-medium text-[#0f1a3a] placeholder:text-[#3d4358] focus:outline-none"
                  />
                </label>
                <div className="ml-3 mt-1 text-[13px] text-[#9aa0ad]">Enter Full Name</div>
              </div>
            )}

            {/* Email Input */}
            <div className="mb-2.5">
              <label className="flex h-[48px] items-center gap-3 rounded-[24px] border-[1.5px] border-[#ece4e6] bg-[#fffafa] px-5 transition-all focus-within:border-[#e0182d] focus-within:shadow-[0_0_0_4px_rgba(224,24,45,0.1)]">
                <svg
                  className="shrink-0"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7a7f8e"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="M4 7l8 6 8-6" />
                </svg>
                <input
                  id="e"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  className="w-full min-w-0 border-0 bg-transparent text-[14px] font-medium text-[#0f1a3a] placeholder:text-[#3d4358] focus:outline-none"
                />
              </label>
              <div className="ml-3 mt-1 text-[13px] text-[#9aa0ad]">Enter Email</div>
            </div>

            {/* Password Input */}
            <div className="mb-2.5">
              <label className="flex h-[48px] items-center gap-3 rounded-[24px] border-[1.5px] border-[#ece4e6] bg-[#fffafa] px-5 transition-all focus-within:border-[#e0182d] focus-within:shadow-[0_0_0_4px_rgba(224,24,45,0.1)]">
                <svg
                  className="shrink-0"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7a7f8e"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="10" width="16" height="11" rx="3" />
                  <path d="M8 10V7a4 4 0 018 0v3" />
                  <circle cx="12" cy="15.5" r="1.3" fill="#7a7f8e" />
                </svg>
                <input
                  id="p"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full min-w-0 border-0 bg-transparent text-[14px] font-medium text-[#0f1a3a] placeholder:text-[#3d4358] focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Show password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="cursor-pointer border-0 bg-transparent p-0 text-[#6b7080] focus:outline-none"
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6b7080"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </label>
              <div className="ml-3 mt-1 text-[13px] text-[#9aa0ad]">Enter Password</div>
            </div>

            {/* Checkbox Rows */}
            {mode === 'signup' ? (
              <label className="mx-1 mb-4 mt-2 flex cursor-pointer items-center gap-3 text-[14px] font-medium text-[#0f1a3a]">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="h-[22px] w-[22px] cursor-pointer rounded-md border-2 border-[#333] accent-[#e0182d]"
                />
                <span>
                  I agree to the processing of{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOpenTerms) onOpenTerms();
                      else if (onOpenPrivacy) onOpenPrivacy();
                    }}
                    className="font-semibold text-[#e0182d] hover:underline"
                  >
                    Personal data
                  </button>
                </span>
              </label>
            ) : (
              <div className="mx-1 mb-4 mt-2 flex items-center justify-between text-[14px] font-medium">
                <label className="flex cursor-pointer items-center gap-2.5 text-[#0f1a3a]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-5 w-5 cursor-pointer rounded border-2 border-[#333] accent-[#e0182d]"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => showToast('Password reset link sent to your email')}
                  className="font-semibold text-[#e0182d] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-2.5 ml-3 text-[13px] font-medium text-[#e0182d]">
                {error}
              </div>
            )}

            {/* Main Submit Action Button with right pill arrow icon */}
            <button
              type="submit"
              id="go"
              className="relative flex h-14 w-full cursor-pointer items-center justify-center overflow-hidden rounded-[28px] border-0 bg-[linear-gradient(180deg,#ea2a3d_0%,#d0132a_100%)] text-[19px] font-semibold text-white shadow-[0_10px_22px_rgba(224,24,45,0.32)] transition-transform active:scale-[0.985]"
            >
              <span>{mode === 'signup' ? 'Sign up' : 'Sign in'}</span>
              <i className="absolute bottom-0 right-0 top-0 flex w-[66px] items-center justify-center rounded-l-[28px] bg-white/10">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </i>
            </button>
          </form>

          {/* Social Divider */}
          <div className="mx-1 my-5 flex items-center gap-3.5 text-[15px] text-[#5b6070]">
            <div className="h-[1px] flex-1 bg-[#d9d3d5]" />
            <span>{mode === 'signup' ? 'Sign up with' : 'Sign in with'}</span>
            <div className="h-[1px] flex-1 bg-[#d9d3d5]" />
          </div>

          {/* Social Buttons */}
          <div className="flex justify-center gap-4">
            {/* Facebook */}
            <button
              type="button"
              aria-label="Facebook"
              onClick={() => handleSocial('Facebook')}
              className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-0 bg-white shadow-[0_6px_16px_rgba(224,24,45,0.12)] transition-transform active:scale-95"
            >
              <svg width="34" height="34" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="11" fill="#1877f2" />
                <path
                  d="M13.4 21v-7h2.4l.4-2.8h-2.8V9.5c0-.8.3-1.4 1.4-1.4h1.5V5.6c-.3 0-1.1-.1-2.1-.1-2.2 0-3.6 1.3-3.6 3.7v2H8.2V14h2.4v7z"
                  fill="#fff"
                />
              </svg>
            </button>

            {/* Google */}
            <button
              type="button"
              aria-label="Google"
              onClick={() => handleSocial('Google')}
              className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-0 bg-white shadow-[0_6px_16px_rgba(224,24,45,0.12)] transition-transform active:scale-95"
            >
              <svg width="32" height="32" viewBox="0 0 24 24">
                <path
                  fill="#ea4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3-3C17.3 1.8 14.9.8 12 .8 7.7.8 4 3.3 2.2 6.9l3.5 2.7C6.6 7.1 9 5 12 5z"
                />
                <path
                  fill="#4285f4"
                  d="M23.2 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h6.3c-.3 1.4-1.1 2.6-2.3 3.4l3.5 2.7c2.1-1.9 3.7-4.8 3.7-8.2z"
                />
                <path
                  fill="#fbbc05"
                  d="M5.7 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L2.2 7C1.5 8.5 1.1 10.2 1.1 12s.4 3.5 1.1 5z"
                />
                <path
                  fill="#34a853"
                  d="M12 23.2c3 0 5.5-1 7.4-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.8l-3.5 2.7C4 20.7 7.7 23.2 12 23.2z"
                />
              </svg>
            </button>

            {/* Apple */}
            <button
              type="button"
              aria-label="Apple"
              onClick={() => handleSocial('Apple')}
              className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-0 bg-white shadow-[0_6px_16px_rgba(224,24,45,0.12)] transition-transform active:scale-95"
            >
              <svg width="30" height="30" viewBox="0 0 24 24">
                <path
                  fill="#111"
                  d="M16.4 12.7c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8 2.2-1.2 3-2.4c.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-4.1zM14.1 5.6c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"
                />
              </svg>
            </button>

            {/* Twitter */}
            <button
              type="button"
              aria-label="Twitter"
              onClick={() => handleSocial('Twitter')}
              className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-0 bg-white shadow-[0_6px_16px_rgba(224,24,45,0.12)] transition-transform active:scale-95"
            >
              <svg width="32" height="32" viewBox="0 0 24 24">
                <path
                  fill="#1d9bf0"
                  d="M23 4.6c-.8.4-1.7.6-2.6.7.9-.6 1.6-1.4 2-2.5-.9.5-1.9.9-2.9 1.1a4.5 4.5 0 00-7.7 4.1C8 7.8 4.7 6 2.5 3.3c-1.2 2-.6 4.7 1.4 6-.7 0-1.4-.2-2-.6 0 2.2 1.5 4.1 3.6 4.5-.7.2-1.4.2-2 .1.6 1.8 2.2 3.1 4.2 3.1A9 9 0 011 18.3 12.8 12.8 0 007.9 20.3c8.3 0 12.9-6.9 12.7-13 .9-.6 1.7-1.4 2.4-2.4z"
                />
              </svg>
            </button>
          </div>

          {/* Switch Mode Footer */}
          <div className="mt-6 text-center text-[15px] font-medium text-[#0f1a3a]">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode('login');
                  }}
                  className="font-semibold text-[#e0182d] hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&rsquo;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode('signup');
                  }}
                  className="font-semibold text-[#e0182d] hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </div>

          {/* Guest rider link */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => {
                const guestUser: UserProfile = {
                  id: `guest-${Date.now()}`,
                  name: 'Guest Rider',
                  email: '',
                  phone: '',
                  isGuest: true,
                };
                onSuccess(guestUser);
              }}
              className="text-[13px] font-medium text-[#6b7280] hover:text-[#0f1a3a] hover:underline"
            >
              Skip & Continue as Guest →
            </button>
          </div>

          {/* Home indicator bar */}
          <div className="mx-auto mt-5 h-[5px] w-[130px] rounded-[5px] bg-[#111]" />
        </div>

        {/* Toast Component */}
        <div
          className={`fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+14px)] z-50 -translate-x-1/2 rounded-[14px] bg-[#0f1a3a] px-4 py-2.5 text-[14px] font-medium text-white shadow-xl transition-all duration-350 ${
            toastMessage ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'
          }`}
        >
          {toastMessage}
        </div>
      </div>
    </div>
  );
};
