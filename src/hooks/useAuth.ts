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
    let profileSyncId = 0;
    let initialSessionResolved = false;
    let activeUserId: string | null = null;

    const clearSession = () => {
      resolutionId += 1;
      profileSyncId += 1;
      activeUserId = null;
      initialSessionResolved = true;
      setCurrentUser(guestUser());
      setAuthStatus('UNAUTHENTICATED');
      setIsAdmin(false);
    };

    const applySession = (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
      const currentResolution = ++resolutionId;
      profileSyncId += 1;
      activeUserId = user.id;
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
        if (!active || resolutionId !== currentResolution || activeUserId !== user.id) return;
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

    const refreshProfileFromAuthEvent = (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
      const currentProfileSync = ++profileSyncId;
      void getMyProfile(user.id).catch(() => null).then((profile) => {
        if (!active || profileSyncId !== currentProfileSync || activeUserId !== user.id) return;
        setCurrentUser((current) => current.id === user.id ? {
          ...current,
          name: profile?.full_name?.trim() || String(user.user_metadata?.full_name || current.name),
          email: user.email || current.email,
          phone: profile?.phone || String(user.user_metadata?.phone || current.phone),
          avatar: profile ? profile.avatar_url || undefined : current.avatar,
          vehicle: profile?.vehicle_model || current.vehicle,
        } : current);
      });
    };

    const requestWelcomeEmail = (userId: string) => {
      const storageKey = `welcome-email-requested:${userId}`;
      try {
        if (sessionStorage.getItem(storageKey)) return;
        sessionStorage.setItem(storageKey, '1');
      } catch {
        // Session storage can be disabled; the server-side send ledger remains authoritative.
      }
      setTimeout(() => {
        if (!active || !supabase) return;
        void supabase.functions.invoke('send-order-confirmation', { body: { type: 'welcome' } })
          .then(({ error }) => {
            if (error) {
              try { sessionStorage.removeItem(storageKey); } catch { /* best effort */ }
              console.warn('Welcome email request failed');
            }
          })
          .catch(() => {
            try { sessionStorage.removeItem(storageKey); } catch { /* best effort */ }
            console.warn('Welcome email request failed');
          });
      }, 0);
    };

    if (!supabase) {
      clearSession();
      return () => { active = false; };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'INITIAL_SESSION') {
        if (initialSessionResolved) return;
        initialSessionResolved = true;
        if (session?.user) queueMicrotask(() => {
          if (!active) return;
          applySession(session.user);
          requestWelcomeEmail(session.user.id);
        });
        else clearSession();
        return;
      }
      if (event === 'SIGNED_OUT') {
        clearSession();
        return;
      }
      if (event === 'TOKEN_REFRESHED') return;
      if (event === 'SIGNED_IN' && session?.user) {
        initialSessionResolved = true;
        queueMicrotask(() => {
          if (!active) return;
          applySession(session.user);
          requestWelcomeEmail(session.user.id);
        });
        return;
      }
      if (event === 'USER_UPDATED' && session?.user) {
        queueMicrotask(() => { if (active) refreshProfileFromAuthEvent(session.user); });
      }
    });

    // Fallback for clients that resolve getSession before dispatching INITIAL_SESSION.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || initialSessionResolved) return;
      initialSessionResolved = true;
      if (error || !data.session?.user) clearSession();
      else {
        applySession(data.session.user);
        requestWelcomeEmail(data.session.user.id);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [checkIsAdmin]);

  return { currentUser, setCurrentUser, authStatus, setAuthStatus, isAdmin, setIsAdmin, checkIsAdmin };
}
