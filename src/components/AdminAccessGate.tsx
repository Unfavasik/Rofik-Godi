import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AdminAccessGate: React.FC<{ children: React.ReactNode; onBackToStore: () => void; onSignIn: () => void }> = ({ children, onBackToStore, onSignIn }) => {
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [message, setMessage] = useState('Verifying administrator access…');
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    let active = true;
    let verificationId = 0;

    const denyForSignIn = (text: string) => {
      setState('denied');
      setNeedsSignIn(true);
      setMessage(text);
    };

    const verify = async () => {
      const currentVerification = ++verificationId;
      const isCurrent = () => active && currentVerification === verificationId;
      setState('checking');
      setNeedsSignIn(false);
      setMessage('Verifying administrator access…');

      if (!supabase) {
        if (isCurrent()) {
          setState('denied');
          setMessage('The Supabase client is not configured for this preview. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then reload.');
        }
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!isCurrent()) return;
      if (sessionError || !sessionData.session) {
        denyForSignIn('Your administrator session is missing or expired. Sign in again to open this workspace.');
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!isCurrent()) return;
      if (authError || !authData.user) {
        denyForSignIn('Sign in with an authorized administrator account to open this workspace.');
        return;
      }

      const { data, error } = await supabase.rpc('is_admin');
      if (!isCurrent()) return;
      if (!error && data === true) {
        setState('allowed');
      } else {
        setState('denied');
        setNeedsSignIn(false);
        setMessage(error ? 'The server could not verify admin permissions. Confirm the secure coupon migration is installed.' : 'This account does not have administrator access.');
      }
    };

    const authSubscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        verificationId += 1;
        denyForSignIn('Your administrator session is missing or expired. Sign in again to open this workspace.');
        return;
      }
      if (event === 'SIGNED_IN') {
        window.setTimeout(() => { if (active) void verify(); }, 0);
      }
    });

    void verify();
    return () => {
      active = false;
      verificationId += 1;
      authSubscription?.data.subscription.unsubscribe();
    };
  }, []);

  if (state === 'allowed') return <>{children}</>;
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${state === 'checking' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>{state === 'checking' ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertCircle className="h-5 w-5" />}</span>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#D9232D]">Rofik Godi · Admin</p>
      <h1 className="mt-1 text-xl font-black text-slate-900">{state === 'checking' ? 'Checking access' : 'Admin access required'}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">{needsSignIn && <button onClick={onSignIn} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 py-3 text-xs font-black text-white"><LogIn className="h-4 w-4" />Sign in</button>}<button onClick={onBackToStore} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white"><ArrowLeft className="h-4 w-4" />Back to storefront</button><span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-3 text-[10px] font-bold text-emerald-800"><ShieldCheck className="h-4 w-4" />Server-verified role</span></div>
    </div>
  </div>;
};
