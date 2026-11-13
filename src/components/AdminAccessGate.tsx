import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import type { AuthStatus } from '../hooks/useAuth';

export const AdminAccessGate: React.FC<{
  children: React.ReactNode;
  onBackToStore: () => void;
  onSignIn: () => void;
  authStatus: AuthStatus;
  isAdmin: boolean | null;
}> = ({ children, onBackToStore, onSignIn, authStatus, isAdmin }) => {
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [message, setMessage] = useState('Verifying administrator access…');
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    if (authStatus === 'AUTH_LOADING' || isAdmin === null) {
      setState('checking');
      setNeedsSignIn(false);
      setMessage('Verifying administrator access…');
      return;
    }
    if (authStatus === 'AUTHENTICATED' && isAdmin) {
      setState('allowed');
      setNeedsSignIn(false);
      return;
    }
    setState('denied');
    setNeedsSignIn(authStatus === 'UNAUTHENTICATED');
    setMessage(authStatus === 'UNAUTHENTICATED'
      ? 'Your administrator session is missing or expired. Sign in again to open this workspace.'
      : 'This account does not have administrator access.');
  }, [authStatus, isAdmin]);

  if (state === 'allowed') return <>{children}</>;
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${state === 'checking' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>{state === 'checking' ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertCircle className="h-5 w-5" />}</span>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">Rofik Godi · Admin</p>
      <h1 className="mt-1 text-xl font-black text-slate-900">{state === 'checking' ? 'Checking access' : 'Admin access required'}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">{needsSignIn && <button onClick={onSignIn} className="banner-cta-shine group/cta inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 py-3 text-xs font-black text-white shadow-sm shadow-red-600/20 transition hover:bg-[#b91822] active:scale-[0.98]"><LogIn className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />Sign in</button>}<button onClick={onBackToStore} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white"><ArrowLeft className="h-4 w-4" />Back to storefront</button><span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-3 text-[10px] font-bold text-emerald-800"><ShieldCheck className="h-4 w-4" />Server-verified role</span></div>
    </div>
  </div>;
};
