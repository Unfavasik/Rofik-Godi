import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { getMyProfile } from '../lib/supabaseCustomer';

export type AuthStatus = 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

const guestUser = (): UserProfile => ({
  id: 'guest-user',
  name: 'Guest Rider',
  email: '',
  phone: '',
  isGuest: true,
});

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(guestUser);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('AUTH_LOADING');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const checkIsAdmin = useCallback(async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.rpc('is_admin');
      return !error && data === true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    let resolutionId = 0;

    const clearSession = () => {
      resolutionId += 1;
      setCurrentUser(guestUser());
      setAuthStatus('UNAUTHENTICATED');
      setIsAdmin(false);
    };

    const applySession = (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
      const currentResolution = ++resolutionId;
      setCurrentUser({
        id: user.id,
        name: String(user.user_metadata?.full_name || 'Rider'),
        email: user.email || '',
        phone: String(user.user_metadata?.phone || ''),
        isGuest: false,
      });
      setAuthStatus('AUTHENTICATED');
      setIsAdmin(null);
      void Promise.all([checkIsAdmin(), getMyProfile(user.id).catch(() => null)]).then(([admin, profile]) => {
        if (!active || resolutionId !== currentResolution) return;
        setIsAdmin(admin);
        if (profile) {
          setCurrentUser((current) => current.id === user.id ? {
            ...current,
            name: profile.full_name?.trim() || current.name,
            phone: profile.phone || current.phone,
            avatar: profile.avatar_url || undefined,
            vehicle: profile.vehicle_model || current.vehicle,
          } : current);
        }
      });
    };

    if (!supabase) {
      clearSession();
      return () => { active = false; };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session?.user) {
        // Defer RPC until the auth event callback releases Supabase's internal lock.
        queueMicrotask(() => { if (active) applySession(session.user); });
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        clearSession();
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.session?.user) clearSession();
      else applySession(data.session.user);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [checkIsAdmin]);

  return { currentUser, setCurrentUser, authStatus, setAuthStatus, isAdmin, setIsAdmin, checkIsAdmin };
}
