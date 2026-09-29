import React, { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react';
import { UserProfile } from '../types';
import './AuthScreen.css';

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
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const finishSignIn = (provider?: 'Google' | 'Facebook') => {
    setIsLoading(true);
    window.setTimeout(() => {
      setIsLoading(false);
      onSuccess({
        id: `usr${provider ? `-${provider.toLowerCase()}` : ''}-${Date.now()}`,
        name: provider
          ? `Asif Ikbal (${provider})`
          : mode === 'login'
            ? fullName || 'Rider Asif'
            : fullName,
        email: email || (provider === 'Google' ? 'asif.ikbal@gmail.com' : 'asif@example.com'),
        phone: phone || '+91 98765 43210',
        isGuest: false,
        vehicle: 'Hero Splendor Plus & Toto',
        joinedDate: 'September 2026',
      });
    }, provider ? 650 : 800);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'signup') {
      if (!fullName.trim()) return setError('Enter your full name');
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address');
      if (password.length < 6) return setError('Password must be at least 6 characters');
      if (!agreeTerms) return setError('Please accept the personal data terms');
    }

    if (mode === 'login') {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address');
      if (!password) return setError('Enter your password');
    }

    if (mode === 'phone_otp') {
      if (!/^\+?[\d\s()-]{7,}$/.test(phone.trim())) return setError('Enter a valid phone number');
      if (!isOtpSent) {
        setIsOtpSent(true);
        setNotice('A verification code has been sent to your phone.');
        return;
      }
      if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit verification code');
    }

    finishSignIn();
  };

  const switchMode = (nextMode: 'signup' | 'login' | 'phone_otp') => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  const subtitle = mode === 'signup'
    ? 'Create your account to explore Rofik Godi Centre.'
    : mode === 'login'
      ? 'Sign in to continue to Rofik Godi Centre.'
      : isOtpSent
        ? `Enter the 6-digit code sent to ${phone}.`
        : 'Enter your phone number to receive a verification code.';

  return (
    <main className="auth-page">
      <section className="auth-screen" aria-label="Account access">
        <div className="auth-hero">
          <button className="auth-back" type="button" aria-label="Go back" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
          </button>
          <h1>
            {mode === 'signup' ? <>Get <strong>Started</strong></> : mode === 'login' ? <>Welcome <strong>Back</strong></> : <><strong>Verify</strong> Phone</>}
          </h1>
          <p>{mode === 'signup' ? <>Create your account to explore<br />Rofik Godi Centre.</> : subtitle}</p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <div className="auth-field-group">
              <label className="auth-field">
                <UserRound aria-hidden="true" />
                <input
                  autoComplete="name"
                  aria-label="Full name"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
              <p className="auth-hint">Enter Full Name</p>
            </div>
          )}

          {mode === 'phone_otp' ? (
            <>
              <div className="auth-field-group">
                <label className="auth-field">
                  <Phone aria-hidden="true" />
                  <input
                    autoComplete="tel"
                    aria-label="Phone number"
                    inputMode="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
                <p className="auth-hint">Enter Phone Number</p>
              </div>
              {isOtpSent && (
                <div className="auth-field-group">
                  <label className="auth-field">
                    <LockKeyhole aria-hidden="true" />
                    <input
                      aria-label="6-digit verification code"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                    />
                  </label>
                  <p className="auth-hint">Enter Verification Code</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="auth-field-group">
                <label className="auth-field">
                  <Mail aria-hidden="true" />
                  <input
                    type="email"
                    autoComplete="email"
                    aria-label="Email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <p className="auth-hint">Enter Email</p>
              </div>

              <div className="auth-field-group">
                <label className="auth-field">
                  <LockKeyhole aria-hidden="true" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    aria-label="Password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((shown) => !shown)}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </label>
                <p className="auth-hint">Enter Password</p>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <label className="auth-consent">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(event) => setAgreeTerms(event.target.checked)}
              />
              <span>I agree to the processing of{' '}
                <button type="button" onClick={onOpenPrivacy}>Personal data</button>
              </span>
            </label>
          )}

          {mode === 'login' && (
            <div className="auth-login-options">
              <label><input type="checkbox" /> Remember me</label>
              <button type="button" onClick={() => setNotice('Password recovery is not available yet.')}>Forgot password?</button>
            </div>
          )}

          {error && <p className="auth-message auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-message auth-notice" role="status">{notice}</p>}

          <button className="auth-submit" type="submit" disabled={isLoading}>
            <span>{isLoading ? 'Please wait…' : mode === 'signup' ? 'Sign up' : mode === 'login' ? 'Sign in' : isOtpSent ? 'Verify & proceed' : 'Send code'}</span>
            {!isLoading && <ArrowRight aria-hidden="true" />}
          </button>

          {mode !== 'phone_otp' && (
            <>
              <div className="auth-divider"><span>{mode === 'signup' ? 'Sign up with' : 'Sign in with'}</span></div>
              <div className="auth-socials" aria-label="Other sign-in options">
                <button type="button" aria-label="Continue with Facebook" onClick={() => finishSignIn('Facebook')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1877f2"/><path d="M13.4 21v-7h2.4l.4-2.8h-2.8V9.5c0-.8.3-1.4 1.4-1.4h1.5V5.6c-.3 0-1.1-.1-2.1-.1-2.2 0-3.6 1.3-3.6 3.7v2H8.2V14h2.4v7z" fill="#fff"/></svg>
                </button>
                <button type="button" aria-label="Continue with Google" onClick={() => finishSignIn('Google')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ea4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3-3C17.3 1.8 14.9.8 12 .8 7.7.8 4 3.3 2.2 6.9l3.5 2.7C6.6 7.1 9 5 12 5z"/><path fill="#4285f4" d="M23.2 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h6.3c-.3 1.4-1.1 2.6-2.3 3.4l3.5 2.7c2.1-1.9 3.7-4.8 3.7-8.2z"/><path fill="#fbbc05" d="M5.7 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L2.2 7C1.5 8.5 1.1 10.2 1.1 12s.4 3.5 1.1 5z"/><path fill="#34a853" d="M12 23.2c3 0 5.5-1 7.4-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.8l-3.5 2.7C4 20.7 7.7 23.2 12 23.2z"/></svg>
                </button>
                <button type="button" aria-label="Apple sign-in unavailable" onClick={() => setNotice('Apple sign-in is not connected yet.')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#111" d="M16.4 12.7c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8 2.2-1.2 3-2.4c.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-4.1zM14.1 5.6c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>
                </button>
                <button type="button" aria-label="Twitter sign-in unavailable" onClick={() => setNotice('Twitter sign-in is not connected yet.')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1d9bf0" d="M23 4.6c-.8.4-1.7.6-2.6.7.9-.6 1.6-1.4 2-2.5-.9.5-1.9.9-2.9 1.1a4.5 4.5 0 0 0-7.7 4.1C8 7.8 4.7 6 2.5 3.3c-1.2 2-.6 4.7 1.4 6-.7 0-1.4-.2-2-.6 0 2.2 1.5 4.1 3.6 4.5-.7.2-1.4.2-2 .1.6 1.8 2.2 3.1 4.2 3.1A9 9 0 0 1 1 18.3a12.8 12.8 0 0 0 6.9 2c8.3 0 12.9-6.9 12.7-13 .9-.6 1.7-1.4 2.4-2.4z"/></svg>
                </button>
              </div>
            </>
          )}

          <p className="auth-switch">
            {mode === 'signup' ? (
              <>Already have an account? <button type="button" onClick={() => switchMode('login')}>Sign in</button></>
            ) : mode === 'login' ? (
              <>New to Rofik Godi Centre? <button type="button" onClick={() => switchMode('signup')}>Sign up</button></>
            ) : (
              <>Use email instead? <button type="button" onClick={() => switchMode('login')}>Sign in</button></>
            )}
          </p>
          <div className="auth-home-indicator" aria-hidden="true" />
        </form>
      </section>
    </main>
  );
};
