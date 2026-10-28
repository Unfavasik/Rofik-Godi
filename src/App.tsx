/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { WORKSHOP_INFO } from './data/products';
import { Product, CartItem, CustomerOrderRecord, VehicleCategory, UserProfile } from './types';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategorySection } from './components/CategorySection';
import { CatalogStatus } from './components/CatalogStatus';
import { VehicleFinder } from './components/VehicleFinder';
import { ProductCard } from './components/ProductCard';
import { PwaInstallCard } from './components/PwaInstallCard';
const ProductDetailModal = lazy(() => import('./components/ProductDetailModal').then((module) => ({ default: module.ProductDetailModal })));
const CustomSeatBuilder = lazy(() => import('./components/CustomSeatBuilder').then((module) => ({ default: module.CustomSeatBuilder })));
const CartDrawer = lazy(() => import('./components/CartDrawer').then((module) => ({ default: module.CartDrawer })));
const CheckoutModal = lazy(() => import('./components/CheckoutModal').then((module) => ({ default: module.CheckoutModal })));
const WishlistModal = lazy(() => import('./components/WishlistModal').then((module) => ({ default: module.WishlistModal })));
const StoreLocationModal = lazy(() => import('./components/StoreLocationModal').then((module) => ({ default: module.StoreLocationModal })));
const PrivacyPolicyView = lazy(() => import('./components/PrivacyPolicyView').then((module) => ({ default: module.PrivacyPolicyView })));
const TermsConditionsView = lazy(() => import('./components/TermsConditionsView').then((module) => ({ default: module.TermsConditionsView })));
const AccountView = lazy(() => import('./components/AccountView').then((module) => ({ default: module.AccountView })));
const CustomerReviews = lazy(() => import('./components/CustomerReviews').then((module) => ({ default: module.CustomerReviews })));
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './components/SplashScreen';
const Onboarding = lazy(() => import('./components/Onboarding'));
const RofikOnboarding = lazy(() => import('./components/RofikOnboarding'));
const AuthScreen = lazy(() => import('./components/AuthScreen').then((module) => ({ default: module.AuthScreen })));
const LoginRequiredModal = lazy(() => import('./components/LoginRequiredModal').then((module) => ({ default: module.LoginRequiredModal })));
const SearchView = lazy(() => import('./components/SearchView').then((module) => ({ default: module.SearchView })));
const NotificationsView = lazy(() => import('./components/NotificationsView').then((module) => ({ default: module.NotificationsView })));
import { ShopView } from './components/ShopView';
import { buildReorderCartItems, createDefaultCartItem, getCartItemUnitPrice, hasMatchingCartItem, MAX_ORDER_ITEM_QUANTITY, refreshCartFromCatalog, toggleCartItem } from './lib/cart';
import { isOrderComplete } from './lib/orderPresentation';
import { createMyStockAlert } from './lib/supabaseStockAlerts';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((module) => ({ default: module.AdminPanel })),
);
import { AdminAccessGate } from './components/AdminAccessGate';
import { INITIAL_FILTERS, SORT_LABELS } from './data/filterOptions';
import { compareProductsByDisplayOrder } from './lib/productOrdering';
import type { FilterState, SortOption } from './data/filterOptions';
import {
  SlidersHorizontal,
  LayoutGrid,
  List,
  PhoneCall,
  MessageCircle,
  Flame,
  ArrowUpDown,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { NATIVE_AUTH_CALLBACK_URL } from './lib/oauthRedirect';
import { getPathForCustomerOrder, getPathForPhase, getPathForProduct, getPathForTab, isAdminPath, requiresCustomerAuthentication, resolveAppRoute, shouldRedirectAdminToWorkspace, type RouteTab } from './lib/appRoutes';
import { signOutCurrentDevice } from './lib/authLogout';
import { CUSTOMER_PREFERENCES_CHANGED_EVENT, isNotificationEnabledByPreferences, prefersHapticFeedback, readCustomerAppPreferences } from './lib/customerPreferences';
import type { PreferredLanguage } from './lib/customerPreferences';
import { I18nProvider, translate } from './lib/i18n';
import { useAuth } from './hooks/useAuth';
import { useCart } from './hooks/useCart';
import { useCatalog } from './hooks/useCatalog';
import { usePwaInstallPrompt } from './hooks/usePwaInstallPrompt';
import { usePushNotifications } from './hooks/usePushNotifications';
import { listMyNotifications, listMyWishlist, toggleWishlist } from './lib/supabaseCustomer';
import { readCustomerNotificationCountCache, writeCustomerNotificationCountCache } from './lib/localCache';
import { CloudLoader } from './components/CloudLoader';
const FilterSortModal = lazy(() => import('./components/FilterSortModal').then((module) => ({ default: module.FilterSortModal })));
const GUEST_WELCOME_KEY = 'rofik-godi:guest-welcome-complete:v1';
const LAST_ROUTE_KEY = 'rofik-godi:last-route:v1';
const SCROLL_KEY = 'rofik-godi:scroll:v1';
const readGuestWelcomeComplete = () => {
  try { return localStorage.getItem(GUEST_WELCOME_KEY) === '1'; } catch { return false; }
};
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedRoute = resolveAppRoute(location.pathname);
  // Route flow: /Onboarding -> /home, and account creation opens at /signup.
  const phaseFromPath = (
    pathname: string,
  ): 'onboarding' | 'main' | 'account-onboarding' | 'splash' | 'auth' => {
    const route = pathname.replace(/\/$/, '') || '/';
    if (route === '/') return 'splash';
    if (route === '/Onboarding' || route === '/onboarding') return 'onboarding';
    if (route === '/signup') return 'auth';
    if (route === '/signup/onboarding') return 'account-onboarding';
    if (route === '/signup/loading') return 'splash';
    return 'main';
  };
  const [appPhase, setAppPhase] = useState<
    'onboarding' | 'main' | 'account-onboarding' | 'splash' | 'auth'
  >(() => phaseFromPath(location.pathname));
  const {
    currentUser,
    setCurrentUser,
    authStatus,
    setAuthStatus,
    isAdmin,
    setIsAdmin,
    checkIsAdmin,
  } = useAuth();
  usePushNotifications(currentUser.isGuest ? null : currentUser.id, navigate);
  const launchPathRef = useRef(location.pathname);
  const restoredRouteRef = useRef(false);
  useEffect(() => {
    if (appPhase === 'main' && !['/auth/callback', '/signup', '/signup/onboarding', '/Onboarding', '/onboarding', '/checkout'].includes(location.pathname)) {
      try { localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify({ path: `${location.pathname}${location.search}`, at: Date.now() })); } catch { /* optional persistence */ }
    }
  }, [appPhase, location.pathname, location.search]);
  useEffect(() => {
    if (restoredRouteRef.current || authStatus === 'AUTH_LOADING' || !['/', '/home'].includes(launchPathRef.current)) return;
    restoredRouteRef.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_ROUTE_KEY) || 'null') as { path?: string; at?: number } | null;
      if (saved?.path && saved.at && Date.now() - saved.at < 24 * 60 * 60 * 1000 && saved.path !== '/home') navigate(saved.path, { replace: true });
    } catch { /* malformed storage is ignored */ }
  }, [authStatus, navigate]);
  useEffect(() => {
    const key = `${SCROLL_KEY}:${location.pathname}${location.search}`;
    const restore = () => { try { const value = Number(sessionStorage.getItem(key) || localStorage.getItem(key)); if (Number.isFinite(value)) window.scrollTo(0, value); } catch { /* optional persistence */ } };
    const save = () => { try { const value = String(window.scrollY); sessionStorage.setItem(key, value); localStorage.setItem(key, value); } catch { /* optional persistence */ } };
    window.setTimeout(restore, 0);
    const hidden = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', hidden); };
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!supabase) return;
    const refreshSession = () => { void supabase?.auth.startAutoRefresh(); void supabase?.auth.getSession(); };
    const visible = () => { if (document.visibilityState === 'visible') refreshSession(); };
    document.addEventListener('visibilitychange', visible);
    let removeResume: (() => void) | null = null;
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => { if (isActive) refreshSession(); }).then((listener) => { removeResume = () => { void listener.remove(); }; }).catch(() => {});
    return () => { document.removeEventListener('visibilitychange', visible); removeResume?.(); };
  }, []);
  const [uiLanguage, setUiLanguage] = useState<PreferredLanguage>(() => readCustomerAppPreferences(currentUser.id).language);
  useEffect(() => {
    const ownerId = currentUser.id || 'guest-user';
    const syncLanguage = (event?: Event) => {
      const changedOwner = (event as CustomEvent<{ userId?: string }> | undefined)?.detail?.userId;
      if (changedOwner && changedOwner !== ownerId) return;
      setUiLanguage(readCustomerAppPreferences(currentUser.id).language);
    };
    syncLanguage();
    window.addEventListener(CUSTOMER_PREFERENCES_CHANGED_EVENT, syncLanguage);
    return () => window.removeEventListener(CUSTOMER_PREFERENCES_CHANGED_EVENT, syncLanguage);
  }, [currentUser.id]);
  const pwaInstall = usePwaInstallPrompt();
  const adminStorefrontRequested = useRef(false);
  const protectedRouteAfterAuth = useRef<string | null>(null);
  const handledNativeOAuthCallbacksRef = useRef(new Set<string>());
  const [guestWelcomeComplete, setGuestWelcomeComplete] = useState(readGuestWelcomeComplete);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalReason, setLoginModalReason] = useState('Please login to place your order.');
  const [pendingCheckoutAfterLogin, setPendingCheckoutAfterLogin] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'signup' | 'login' | 'phone_otp'>(
    'signup',
  );
  const goToPhase = useCallback(
    (phase: 'onboarding' | 'main' | 'account-onboarding' | 'splash' | 'auth') => {
      setAppPhase(phase);
      const nextPath = getPathForPhase(phase, location.pathname);
      if (location.pathname !== nextPath) navigate(nextPath, { replace: true, state: { phase } });
    },
    [location.pathname, navigate],
  );

  const handleNativeOAuthCallback = useCallback(async (callbackUrl: string) => {
    if (!Capacitor.isNativePlatform() || !supabase) return;
    let callback: URL;
    try {
      callback = new URL(callbackUrl);
    } catch {
      return;
    }
    const expectedCallback = new URL(NATIVE_AUTH_CALLBACK_URL);
    if (callback.protocol !== expectedCallback.protocol || callback.hostname !== expectedCallback.hostname || callback.pathname !== expectedCallback.pathname) return;
    if (handledNativeOAuthCallbacksRef.current.has(callbackUrl)) return;
    handledNativeOAuthCallbacksRef.current.add(callbackUrl);
    try { await Browser.close(); } catch { /* Browser may already have closed itself. */ }

    const code = callback.searchParams.get('code');
    let completed = false;
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      completed = !exchangeError;
    } else {
      const callbackParams = new URLSearchParams(callback.hash.replace(/^#/, ''));
      const accessToken = callbackParams.get('access_token');
      const refreshToken = callbackParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        completed = !sessionError;
      }
    }
    if (completed) navigate('/home', { replace: true });
    else if (callback.searchParams.has('error') || callback.hash.includes('error=')) navigate('/signup', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !supabase) return;
    let active = true;
    let removeListener: (() => void) | null = null;
    void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      if (active) void handleNativeOAuthCallback(url);
    }).then((listener) => {
      if (active) removeListener = () => { void listener.remove(); };
      else void listener.remove();
    }).catch(() => {});
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (active && launch?.url) void handleNativeOAuthCallback(launch.url);
    }).catch(() => {});
    return () => {
      active = false;
      removeListener?.();
    };
  }, [handleNativeOAuthCallback]);

  const finishWelcomeOnboarding = () => {
    setGuestWelcomeComplete(true);
    try { localStorage.setItem(GUEST_WELCOME_KEY, '1'); } catch { /* App navigation still works without local storage. */ }
    const pendingPath = protectedRouteAfterAuth.current;
    goToPhase('main');
    if (!pendingPath || !requiresCustomerAuthentication(pendingPath)) {
      protectedRouteAfterAuth.current = null;
      return;
    }
    const kind = resolveAppRoute(pendingPath).kind;
    setLoginModalReason(kind === 'orders'
      ? 'Sign in to view your orders.'
      : kind === 'support' || kind === 'contact-support'
        ? 'Sign in to continue to customer support.'
        : 'Please sign in to place your order.');
    if (kind === 'checkout') setPendingCheckoutAfterLogin(true);
    setIsLoginModalOpen(true);
  };

  const [notificationCount, setNotificationCount] = useState(() => currentUser.isGuest ? 0 : readCustomerNotificationCountCache(currentUser.id) ?? 0);
  const refreshNotificationCount = () => {
    if (currentUser.isGuest) {
      setNotificationCount(0);
      return;
    }
    void listMyNotifications(currentUser.id).then((notifications) => {
      const preferences = readCustomerAppPreferences(currentUser.id).notifications;
      const count = notifications.filter((notification) =>
        !notification.read_at && isNotificationEnabledByPreferences(preferences, notification),
      ).length;
      setNotificationCount(count);
      writeCustomerNotificationCountCache(currentUser.id, count);
    }).catch(() => {});
  };
  useEffect(() => {
    let active = true;
    if (currentUser.isGuest || !supabase || !currentUser.id) {
      setNotificationCount(0);
      return () => {
        active = false;
      };
    }
    const cachedCount = readCustomerNotificationCountCache(currentUser.id);
    if (cachedCount !== null) setNotificationCount(cachedCount);
    const notificationClient = supabase;
    const seenInsertIds = new Set<string>();
    let pendingCountRefresh: number | null = null;
    const refreshCount = () => {
      void listMyNotifications(currentUser.id).then((notifications) => {
        if (active) {
          const preferences = readCustomerAppPreferences(currentUser.id).notifications;
          const count = notifications.filter((notification) =>
            !notification.read_at && isNotificationEnabledByPreferences(preferences, notification),
          ).length;
          setNotificationCount(count);
          writeCustomerNotificationCountCache(currentUser.id, count);
        }
      }).catch(() => { if (active && cachedCount === null) setNotificationCount(0); });
    };
    const scheduleCountRefresh = () => {
      if (pendingCountRefresh !== null) window.clearTimeout(pendingCountRefresh);
      pendingCountRefresh = window.setTimeout(refreshCount, 300);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };
    refreshCount();
    window.addEventListener(CUSTOMER_PREFERENCES_CHANGED_EVENT, refreshCount);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const channel = notificationClient
      .channel(`notifications-user-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload) => {
        const row = payload.new as { id?: unknown; kind?: unknown; title?: unknown; body?: unknown; read_at?: unknown };
        if (typeof row.id !== 'string' || seenInsertIds.has(row.id)) return;
        seenInsertIds.add(row.id);
        if (!row.read_at && typeof row.kind === 'string' && typeof row.title === 'string' && typeof row.body === 'string' && isNotificationEnabledByPreferences(
          readCustomerAppPreferences(currentUser.id).notifications,
          {
            kind: row.kind,
            title: row.title,
            body: row.body,
          },
        )) {
          setNotificationCount((current) => {
            const count = current + 1;
            writeCustomerNotificationCountCache(currentUser.id, count);
            return count;
          });
        }
        scheduleCountRefresh();
      })
      .subscribe();
    return () => {
      active = false;
      if (pendingCountRefresh !== null) window.clearTimeout(pendingCountRefresh);
      window.removeEventListener(CUSTOMER_PREFERENCES_CHANGED_EVENT, refreshCount);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      void notificationClient.removeChannel(channel);
    };
  }, [currentUser.id, currentUser.isGuest]);

  // Navigation & View State
  const routeToTab = useCallback((pathname: string): RouteTab => resolveAppRoute(pathname).tab, []);
  const tabToRoute = useCallback((tab: RouteTab) => getPathForTab(tab), []);
  const [activeTab, setActiveTab] = useState<RouteTab>(() => routeToTab(location.pathname));
  useEffect(() => {
    setAppPhase(phaseFromPath(location.pathname));
    setActiveTab(routeToTab(location.pathname));
  }, [location.pathname, routeToTab]);

  useEffect(() => {
    const route = location.pathname.replace(/\/$/, '') || '/';
    const publicAuthPath = [
      '/Onboarding',
      '/onboarding',
      '/signup',
      '/signup/onboarding',
      '/signup/loading',
    ].includes(route);
    const routeKind = resolveAppRoute(route).kind;
    const publicInfoPath = routeKind === 'privacy' || routeKind === 'terms' || routeKind === 'store';
    if (authStatus === 'AUTHENTICATED' && isAdmin === null) {
      if (appPhase === 'splash') goToPhase('main');
      return;
    }
    if (authStatus === 'AUTHENTICATED' && isAdmin !== null) {
      if (isAdmin) {
        // Role resolution can finish after login; enter admin unless the admin
        // explicitly chose to return to the storefront for this session.
        if (route === '/admin') adminStorefrontRequested.current = false;
        else if (shouldRedirectAdminToWorkspace(route, adminStorefrontRequested.current)) {
          navigate('/admin', { replace: true });
        }
      } else if (route !== '/admin' && appPhase !== 'main') {
        goToPhase('main');
      }
      return;
    }
    // Legacy splash URLs have no timer now; route them as soon as auth has resolved.
    if (authStatus === 'UNAUTHENTICATED' && appPhase === 'splash') {
      goToPhase(guestWelcomeComplete ? 'main' : 'onboarding');
      return;
    }
    if (authStatus !== 'UNAUTHENTICATED' || publicAuthPath || publicInfoPath || isAdminPath(route)) return;

    if (!guestWelcomeComplete) {
      if (requiresCustomerAuthentication(route)) protectedRouteAfterAuth.current = location.pathname;
      if (appPhase !== 'onboarding') goToPhase('onboarding');
      return;
    }

    if (requiresCustomerAuthentication(route)) {
      protectedRouteAfterAuth.current = location.pathname;
      const kind = resolveAppRoute(route).kind;
      setLoginModalReason(kind === 'orders'
        ? 'Sign in to view your orders.'
        : kind === 'support' || kind === 'contact-support'
          ? 'Sign in to continue to customer support.'
          : 'Please sign in to place your order.');
      if (kind === 'checkout') setPendingCheckoutAfterLogin(true);
      setIsLoginModalOpen(true);
      navigate('/home', { replace: true });
    }
  }, [authStatus, isAdmin, location.pathname, appPhase, navigate, goToPhase, guestWelcomeComplete]);

  const lastSyncedTabRef = useRef<RouteTab>(activeTab);
  useEffect(() => {
    const tabChanged = lastSyncedTabRef.current !== activeTab;
    lastSyncedTabRef.current = activeTab;
    if (!tabChanged) return;
    if (isAdminPath(location.pathname)) return;
    if (appPhase !== 'main') return;
    // Supabase needs the callback URL (including its code/hash) to finish
    // exchanging an OAuth response for a session before tab routing can run.
    if (location.pathname === '/auth/callback' && authStatus === 'AUTH_LOADING') return;
    if (resolveAppRoute(location.pathname).kind !== 'tab') return;
    const nextPath = tabToRoute(activeTab);
    if (location.pathname !== nextPath) navigate(nextPath, { state: { tab: activeTab } });
  }, [activeTab, appPhase, authStatus, location.pathname, navigate, tabToRoute]);

  const previousTabRef = useRef<RouteTab>(activeTab);
  useLayoutEffect(() => {
    if (previousTabRef.current === activeTab) return;
    previousTabRef.current = activeTab;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeTab]);

  useLayoutEffect(() => {
    const routeKind = resolveAppRoute(location.pathname).kind;
    if (routeKind !== 'contact-support' && routeKind !== 'support') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  const [shopLayoutMode, setShopLayoutMode] = useState<'grid' | 'list'>('grid');
  // Use the full responsive shell by default. The old 440px phone frame made
  // the website look squeezed on tablets and desktop browsers.
  const [isMobileFrameMode, setIsMobileFrameMode] = useState<boolean>(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | 'all'>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('manual');
  const [homeFilters, setHomeFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isHomeSortOpen, setIsHomeSortOpen] = useState(false);
  const [isHomeFilterOpen, setIsHomeFilterOpen] = useState(false);

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartReorderNotice, setCartReorderNotice] = useState<string | null>(null);
  const [stockAlertFeedback, setStockAlertFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const pendingStockAlertProductRef = useRef<string | null>(null);
  const stockAlertRequestLockRef = useRef(false);
  const stockAlertFeedbackTimerRef = useRef<number | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsConditionsOpen, setIsTermsConditionsOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapacitorApp.addListener('backButton', () => {
      if (isLoginModalOpen) {
        setIsLoginModalOpen(false);
        return;
      }
      if (isHomeSortOpen) {
        setIsHomeSortOpen(false);
        return;
      }
      if (isHomeFilterOpen) {
        setIsHomeFilterOpen(false);
        return;
      }

      const currentPath = location.pathname.replace(/\/+$/, '') || '/';
      const isRouteOverlay = ['/cart', '/wishlist', '/custom'].includes(currentPath);
      const hasOverlay = isCartOpen || isWishlistOpen || isCustomBuilderOpen;
      if (hasOverlay) {
        setIsCartOpen(false);
        setIsWishlistOpen(false);
        setIsCustomBuilderOpen(false);
        if (!isRouteOverlay) return;
      }

      const routerState = window.history.state as { idx?: unknown } | null;
      if (typeof routerState?.idx === 'number' && routerState.idx > 0) {
        navigate(-1);
        return;
      }

      if (currentPath !== '/' && currentPath !== '/home') {
        const route = resolveAppRoute(currentPath);
        const fallback = route.kind === 'product'
          ? '/shop'
          : route.kind === 'orders' || route.kind === 'support' || route.kind === 'contact-support' || route.kind === 'settings'
            ? '/profile'
            : route.kind === 'checkout'
              ? '/cart'
              : route.kind === 'admin-order'
                ? '/admin/orders'
                : route.kind === 'admin-customer'
                  ? '/admin/customers'
                  : route.kind === 'admin'
                    ? '/admin'
                    : '/home';
        navigate(fallback, { replace: true });
        return;
      }

      void CapacitorApp.exitApp();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [
    isCartOpen,
    isCustomBuilderOpen,
    isHomeFilterOpen,
    isHomeSortOpen,
    isLoginModalOpen,
    isWishlistOpen,
    location.pathname,
    navigate,
  ]);

  // Cart and catalog behavior are isolated so the storefront shell stays focused on presentation.
  const {
    products: catalogProducts,
    isLoaded: catalogLoaded,
    isLoading: catalogLoading,
    error: catalogError,
    retry: retryCatalog,
  } = useCatalog(location.pathname);
  const { cart, setCart, clearCart } = useCart(
    currentUser,
    catalogProducts,
    catalogLoaded,
    catalogError,
  );
  const isQuickAddInCart = useCallback(
    (product: Product) => hasMatchingCartItem(cart, createDefaultCartItem(product, `${product.id}-cart-check`)),
    [cart],
  );

  useEffect(() => {
    if (appPhase !== 'main' || authStatus === 'AUTH_LOADING') return;
    const route = resolveAppRoute(location.pathname);
    const publicInfoPath = route.kind === 'privacy' || route.kind === 'terms' || route.kind === 'store';
    if (authStatus === 'UNAUTHENTICATED' && !publicInfoPath) return;
    if (route.kind === 'not-found') {
      navigate('/home', { replace: true });
      return;
    }
    if (route.kind !== 'tab' && route.canonicalPath !== location.pathname) {
      navigate(route.canonicalPath, { replace: true });
    }
    setIsCheckoutOpen(route.kind === 'checkout');
    setIsPrivacyPolicyOpen(route.kind === 'privacy');
    setIsTermsConditionsOpen(route.kind === 'terms');
    setIsStoreInfoOpen(route.kind === 'store');
    if (route.kind !== 'product') {
      setSelectedProduct(null);
      return;
    }
    if (!catalogLoaded) {
      setSelectedProduct(null);
      return;
    }
    const product = catalogProducts.find((item) => item.slug === route.slug);
    if (product) setSelectedProduct(product);
    else navigate('/shop', { replace: true });
  }, [appPhase, authStatus, catalogLoaded, catalogProducts, location.pathname, navigate]);

  const openProductRoute = useCallback((product: Product) => {
    setSelectedProduct(product);
    navigate(getPathForProduct(product.slug), { state: { returnTo: location.pathname } });
  }, [location.pathname, navigate]);
  const closeProductRoute = useCallback(() => {
    setSelectedProduct(null);
    if (resolveAppRoute(location.pathname).kind !== 'product') return;
    const routeState = location.state as { returnTo?: unknown } | null;
    const returnTo = typeof routeState?.returnTo === 'string' ? routeState.returnTo : '/shop';
    const returnRoute = resolveAppRoute(returnTo);
    navigate(returnRoute.kind === 'not-found' ? '/shop' : returnRoute.canonicalPath);
  }, [location.pathname, location.state, navigate]);
  const openPageRoute = useCallback((path: string) => {
    navigate(path, { state: { returnTo: location.pathname } });
  }, [location.pathname, navigate]);
  const navigateBackToPage = useCallback((fallback: string) => {
    const state = location.state as { returnTo?: unknown } | null;
    const returnTo = typeof state?.returnTo === 'string' && state.returnTo.startsWith('/') ? state.returnTo : fallback;
    navigate(returnTo);
  }, [location.state, navigate]);
  const openWishlistPage = () => {
    setActiveTab('wishlist');
    setIsWishlistOpen(true);
  };
  const openCustomBuilderPage = () => {
    setActiveTab('custom');
    setIsCustomBuilderOpen(true);
  };
  const [ownedWishlist, setOwnedWishlist] = useState<{ ownerId: string; items: string[] }>({
    ownerId: 'guest-user',
    items: [],
  });
  const wishlistIds = ownedWishlist.ownerId === currentUser.id ? ownedWishlist.items : [];
  const wishlist = useMemo(() => {
    const productsById = new Map<string, Product>();
    catalogProducts.forEach((product) => productsById.set(product.id, product));
    return wishlistIds
      .map((id) => productsById.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [catalogProducts, wishlistIds]);

  useEffect(() => {
    if (ownedWishlist.ownerId === currentUser.id) return;
    let savedWishlistIds: string[] = [];
    if (!currentUser.isGuest) {
      try {
        const stored = localStorage.getItem(`work-app:${currentUser.id}:wishlist`);
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        if (Array.isArray(parsed)) {
          const ids = parsed.flatMap((entry): string[] => {
            if (typeof entry === 'string' && entry) return [entry];
            if (entry !== null && typeof entry === 'object' && 'id' in entry && typeof entry.id === 'string' && entry.id) {
              return [entry.id];
            }
            return [];
          });
          savedWishlistIds = [...new Set(ids)];
        }
      } catch {
        // Ignore malformed or unavailable browser storage and start this account empty.
      }
    }
    setOwnedWishlist({ ownerId: currentUser.id, items: savedWishlistIds });
  }, [currentUser.id, currentUser.isGuest, ownedWishlist.ownerId]);

  useEffect(() => {
    if (ownedWishlist.ownerId !== currentUser.id || currentUser.isGuest) return;
    try {
      localStorage.setItem(
        `work-app:${currentUser.id}:wishlist`,
        JSON.stringify(ownedWishlist.items),
      );
    } catch {
      // In-memory wishlist state still works when storage is blocked or full.
    }
  }, [ownedWishlist, currentUser.id, currentUser.isGuest]);

  useEffect(() => {
    if (
      ownedWishlist.ownerId !== currentUser.id ||
      currentUser.isGuest ||
      !catalogLoaded ||
      catalogError
    ) return;
    const catalogIds = new Set(catalogProducts.map((product) => product.id));
    setOwnedWishlist((state) => {
      if (state.ownerId !== currentUser.id) return state;
      const items = state.items.filter((id) => catalogIds.has(id));
      return items.length === state.items.length ? state : { ...state, items };
    });
  }, [catalogError, catalogLoaded, catalogProducts, currentUser.id, currentUser.isGuest, ownedWishlist.ownerId]);

  const setWishlist = useCallback(
    (next: Product[] | ((current: Product[]) => Product[])) => {
      setOwnedWishlist((state) => {
        const currentIds = state.ownerId === currentUser.id ? state.items : [];
        const productsById = new Map<string, Product>();
        catalogProducts.forEach((product) => productsById.set(product.id, product));
        const current = currentIds
          .map((id) => productsById.get(id))
          .filter((product): product is Product => Boolean(product));
        const updated = typeof next === 'function' ? next(current) : next;
        const unresolvedIds = !catalogLoaded || catalogError
          ? currentIds.filter((id) => !productsById.has(id))
          : [];
        return {
          ownerId: currentUser.id,
          items: [...new Set([...updated.map((product) => product.id), ...unresolvedIds])],
        };
      });
    },
    [catalogError, catalogLoaded, catalogProducts, currentUser.id],
  );
  const [checkoutItems, setCheckoutItems] = useState<CartItem[] | null>(null);
  const [checkoutReturnPath, setCheckoutReturnPath] = useState('/cart');
  const [checkoutReturnState, setCheckoutReturnState] = useState<unknown>(null);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutCoupon, setCheckoutCoupon] = useState('');
  const [checkoutQuote, setCheckoutQuote] = useState<{ subtotal: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    if (
      currentUser.isGuest ||
      !supabase ||
      ownedWishlist.ownerId !== currentUser.id ||
      !catalogProducts.length
    )
      return;
    void listMyWishlist().then((rows) => {
      const ids = new Set(rows.map((row) => String(row.product_id)));
      setWishlist(catalogProducts.filter((product) => ids.has(product.id)));
    });
  }, [catalogProducts, currentUser.id, currentUser.isGuest, ownedWishlist.ownerId, setWishlist]);

  // Active home filters count
  const activeHomeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all' || homeFilters.category !== 'all') count += 1;
    if (vehicleFilter || homeFilters.vehicleBrand !== 'all') count += 1;
    if (homeFilters.priceRange !== 'all' || homeFilters.maxPrice < 2000) count += 1;
    if (homeFilters.waterproofOnly) count += 1;
    if (homeFilters.bestsellerOnly) count += 1;
    if (homeFilters.inStockOnly) count += 1;
    if (homeFilters.customizableOnly) count += 1;
    if (homeFilters.minRating > 0) count += 1;
    return count;
  }, [selectedCategory, vehicleFilter, homeFilters]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return catalogProducts
      .filter((p) => {
        // Category check (sync selectedCategory with homeFilters)
        const effectiveCategory =
          homeFilters.category !== 'all' ? homeFilters.category : selectedCategory;
        if (effectiveCategory !== 'all' && p.category !== effectiveCategory) {
          return false;
        }

        // Vehicle filter
        if (vehicleFilter) {
          const matchesCompat = p.compatibility.some((comp) =>
            comp.toLowerCase().includes(vehicleFilter.toLowerCase()),
          );
          const matchesTitle = p.title.toLowerCase().includes(vehicleFilter.toLowerCase());
          if (!matchesCompat && !matchesTitle) return false;
        }

        if (homeFilters.vehicleBrand !== 'all') {
          const b = homeFilters.vehicleBrand.toLowerCase();
          const matchesBrand =
            p.compatibility.some((c) => c.toLowerCase().includes(b)) ||
            p.title.toLowerCase().includes(b) ||
            p.category.toLowerCase().includes(b);
          if (!matchesBrand) return false;
        }

        // Price filter
        if (homeFilters.priceRange === 'under_300' && p.price >= 300) return false;
        if (homeFilters.priceRange === '300_600' && (p.price < 300 || p.price > 600)) return false;
        if (homeFilters.priceRange === '600_1000' && (p.price < 600 || p.price > 1000))
          return false;
        if (homeFilters.priceRange === 'above_1000' && p.price <= 1000) return false;
        if (p.price > homeFilters.maxPrice) return false;

        // Feature toggles
        if (homeFilters.waterproofOnly && !p.isWaterproof) return false;
        if (homeFilters.bestsellerOnly && !p.isBestseller && p.badge !== 'Bestseller') return false;
        if (homeFilters.inStockOnly && !p.inStock) return false;
        if (homeFilters.customizableOnly && !p.isCustomizable) return false;
        if (homeFilters.minRating > 0 && p.rating < homeFilters.minRating) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = p.title.toLowerCase().includes(q);
          const matchesDesc = p.description.toLowerCase().includes(q);
          const matchesCat = p.categoryLabel.toLowerCase().includes(q);
          const matchesCompat = p.compatibility.some((c) => c.toLowerCase().includes(q));
          if (!matchesName && !matchesDesc && !matchesCat && !matchesCompat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'manual':
            return compareProductsByDisplayOrder(a, b);
          case 'price_asc':
            return a.price - b.price;
          case 'price_desc':
            return b.price - a.price;
          case 'rating':
            return b.rating - a.rating || b.reviewCount - a.reviewCount;
          case 'newest':
            return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
          case 'discount': {
            const discA = ((a.originalPrice - a.price) / a.originalPrice) * 100;
            const discB = ((b.originalPrice - b.price) / b.originalPrice) * 100;
            return discB - discA;
          }
          case 'popular':
          default:
            return (b.isBestseller ? 2 : 0) + b.rating - ((a.isBestseller ? 2 : 0) + a.rating);
        }
      });
  }, [catalogProducts, selectedCategory, vehicleFilter, searchQuery, sortBy, homeFilters]);

  // Quick cart actions toggle the default product configuration.
  const handleToggleDefaultCartItem = (p: Product) => {
    if (!p.inStock) return;
    setCart((current) => toggleCartItem(current, createDefaultCartItem(p)));
  };

  const handleQuickAddToCart = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleDefaultCartItem(p);
  };

  // Detailed Modal Add To Cart
  const handleDetailAddToCart = (
    product: Product,
    selectedColor: { name: string; hex: string },
    selectedStitch: string,
    selectedThickness: { label: string; extraPrice: number },
    customEmbroideryText?: string,
    quantity = 1,
  ) => {
    if (!product.inStock) return;
    const unitPrice = getCartItemUnitPrice(product, selectedThickness, customEmbroideryText);

    const newItem: CartItem = {
      cartItemId: `${product.id}-${selectedColor.name}-${selectedStitch}-${Date.now()}`,
      product,
      quantity,
      selectedColor,
      selectedStitch,
      selectedThickness,
      customEmbroideryText,
      unitPrice,
    };

    setCart((current) => toggleCartItem(current, newItem));
  };

  const handleDetailBuyNow = (
    product: Product,
    selectedColor: { name: string; hex: string },
    selectedStitch: string,
    selectedThickness: { label: string; extraPrice: number },
    quantity: number,
  ) => {
    if (!product.inStock) return;
    const item: CartItem = {
      cartItemId: `buy-now-${product.id}-${Date.now()}`,
      product,
      quantity: Math.max(1, Math.min(MAX_ORDER_ITEM_QUANTITY, quantity)),
      selectedColor,
      selectedStitch,
      selectedThickness,
      unitPrice: getCartItemUnitPrice(product, selectedThickness),
    };
    setCheckoutItems([item]);
    setCheckoutReturnPath(location.pathname);
    setCheckoutReturnState(location.state);
    setCheckoutDiscount(0);
    setCheckoutCoupon('');
    setCheckoutQuote(null);
    setIsCartOpen(false);
    setSelectedProduct(null);
    if (currentUser.isGuest) {
      setLoginModalReason('Please sign in to place your order.');
      setPendingCheckoutAfterLogin(true);
      setIsLoginModalOpen(true);
      return;
    }
    setIsCheckoutOpen(true);
    navigate('/checkout');
  };

  // Wishlist toggle
  const handleToggleWishlist = async (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const saved = wishlist.some((item) => item.id === p.id);
    setWishlist((current) =>
      saved ? current.filter((item) => item.id !== p.id) : [...current, p],
    );
    if (!currentUser.isGuest && supabase) {
      const result = await toggleWishlist(p.id, saved);
      if (result.error)
        setWishlist((current) =>
          saved ? [...current, p] : current.filter((item) => item.id !== p.id),
        );
    }
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((current) => current.filter((i) => i.cartItemId !== cartItemId));
    } else {
      setCart((current) =>
        current.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity: Math.min(MAX_ORDER_ITEM_QUANTITY, newQty) } : i)),
      );
    }
  };

  const handleCheckoutQuantity = (cartItemId: string, newQty: number) => {
    const quantity = Math.max(1, Math.min(MAX_ORDER_ITEM_QUANTITY, Math.floor(newQty)));
    if (checkoutItems === null) {
      handleUpdateQuantity(cartItemId, quantity);
    } else {
      setCheckoutItems((current) => current?.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity } : item,
      ) ?? null);
    }
    setCheckoutDiscount(0);
    setCheckoutCoupon('');
    setCheckoutQuote(null);
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((current) => current.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleOpenCart = () => {
    setSelectedProduct(null);
    setIsWishlistOpen(false);
    setActiveTab('cart');
    setIsCartOpen(true);
    navigate('/cart');
  };

  const showStockAlertFeedback = useCallback((tone: 'success' | 'error', message: string) => {
    if (stockAlertFeedbackTimerRef.current !== null) window.clearTimeout(stockAlertFeedbackTimerRef.current);
    setStockAlertFeedback({ tone, message });
    stockAlertFeedbackTimerRef.current = window.setTimeout(() => {
      setStockAlertFeedback(null);
      stockAlertFeedbackTimerRef.current = null;
    }, 6500);
  }, []);

  const submitStockAlert = useCallback(async (productId: string, userId: string, productTitle: string) => {
    if (stockAlertRequestLockRef.current) {
      showStockAlertFeedback('error', 'A restock alert is still being created. Please wait.');
      return;
    }
    stockAlertRequestLockRef.current = true;
    try {
      const result = await createMyStockAlert(productId, userId);
      if (result.error) {
        const alreadyAvailable = result.error.message.toLowerCase().includes('already in stock');
        showStockAlertFeedback(alreadyAvailable ? 'success' : 'error', alreadyAvailable
          ? `${productTitle} is back in stock now. Refresh the product page to shop.`
          : result.error.message);
      } else if (result.data) {
        showStockAlertFeedback('success', `You’ll be notified when ${productTitle} is back in stock.`);
      } else {
        showStockAlertFeedback('success', `You’re already signed up for a ${productTitle} restock alert.`);
      }
    } finally {
      stockAlertRequestLockRef.current = false;
    }
  }, [showStockAlertFeedback]);

  const handleNotifyMe = useCallback(async (product: Product) => {
    if (currentUser.isGuest) {
      pendingStockAlertProductRef.current = product.id;
      setLoginModalReason('Sign in to get a back-in-stock alert.');
      setIsLoginModalOpen(true);
      return;
    }
    await submitStockAlert(product.id, currentUser.id, product.title);
  }, [currentUser.id, currentUser.isGuest, submitStockAlert]);

  const handleBuyAgain = async (order: CustomerOrderRecord) => {
    if (!isOrderComplete(order.status)) {
      return { addedCount: 0, skippedItems: [], error: 'Only completed orders can be reordered.' };
    }
    if (!catalogLoaded || catalogError) {
      return { addedCount: 0, skippedItems: [], error: 'The current catalog could not be loaded. Please try again.' };
    }

    const { items, skippedItems } = buildReorderCartItems(order.order_items || [], catalogProducts);
    if (items.length) {
      setCart((current) => refreshCartFromCatalog([...current, ...items], catalogProducts));
    }
    const baseMessage = items.length
      ? `${translate(uiLanguage, 'reorder.added', { count: items.length, unit: items.length === 1 ? 'item' : 'items' })} ${translate(uiLanguage, 'orders.buyAgainHint')}`
      : skippedItems.length
        ? translate(uiLanguage, 'reorder.noneAvailable')
        : translate(uiLanguage, 'reorder.empty');
    const skippedMessage = skippedItems.length ? translate(uiLanguage, 'reorder.skipped', { items: skippedItems.join(', ') }) : '';
    setCartReorderNotice([baseMessage, skippedMessage].filter(Boolean).join(' '));
    handleOpenCart();
    return { addedCount: items.length, skippedItems };
  };

  const handleProceedToCheckout = (
    discount: number,
    coupon: string,
    quote?: { subtotal: number; total: number },
  ) => {
    setCheckoutItems(null);
    setCheckoutReturnPath('/cart');
    setCheckoutReturnState(null);
    setCheckoutDiscount(discount);
    setCheckoutCoupon(coupon);
    setCheckoutQuote(quote || null);

    // 🔐 GUEST USER CHECK: If guest, trigger Login Required modal
    if (currentUser.isGuest) {
      setIsCartOpen(false);
      setLoginModalReason('Please login to place your order.');
      setPendingCheckoutAfterLogin(true);
      setIsLoginModalOpen(true);
      return;
    }

    setIsCartOpen(false);
    setIsCheckoutOpen(true);
    navigate('/checkout');
  };

  const handleLoginSuccess = async (user: UserProfile) => {
    // Resolve the protected role before updating the route, so admins never flash the storefront.
    const admin = await checkIsAdmin();
    setCurrentUser(user);
    setAuthStatus('AUTHENTICATED');
    setIsAdmin(admin);
    setIsLoginModalOpen(false);
    if (admin) {
      pendingStockAlertProductRef.current = null;
      adminStorefrontRequested.current = true;
      protectedRouteAfterAuth.current = null;
      setAppPhase('main');
      navigate('/profile', { replace: true });
      return;
    }
    const returnPath = protectedRouteAfterAuth.current;
    protectedRouteAfterAuth.current = null;
    if (returnPath) {
      setAppPhase('main');
      navigate(returnPath, { replace: true });
    } else {
      goToPhase('main');
    }
    if (pendingCheckoutAfterLogin) {
      setPendingCheckoutAfterLogin(false);
      setIsCheckoutOpen(true);
      navigate('/checkout');
    }
  };

  useEffect(() => {
    const productId = pendingStockAlertProductRef.current;
    if (!productId || authStatus !== 'AUTHENTICATED' || currentUser.isGuest) return;
    if (isAdmin) {
      pendingStockAlertProductRef.current = null;
      return;
    }
    if (!catalogLoaded && !catalogError) return;
    pendingStockAlertProductRef.current = null;
    if (catalogError) {
      showStockAlertFeedback('error', 'The product catalog could not be checked. Please try again.');
      return;
    }
    const product = catalogProducts.find((item) => item.id === productId);
    if (!product) {
      showStockAlertFeedback('error', 'This product is no longer available for restock alerts.');
      return;
    }
    void submitStockAlert(product.id, currentUser.id, product.title);
  }, [authStatus, currentUser.id, currentUser.isGuest, isAdmin, catalogLoaded, catalogError, catalogProducts, showStockAlertFeedback, submitStockAlert]);

  useEffect(() => () => {
    if (stockAlertFeedbackTimerRef.current !== null) window.clearTimeout(stockAlertFeedbackTimerRef.current);
  }, []);

  const handleLogout = async () => {
    const previousUserId = currentUser.id;
    const authClient = supabase?.auth;
    const signOutSucceeded = await signOutCurrentDevice(
      authClient ? (options) => authClient.signOut(options) : null,
    );
    for (const key of [`work-app:${previousUserId}:cart`, `work-app:${previousUserId}:wishlist`]) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Continue signing out even when browser storage is unavailable.
      }
    }
    try {
      clearCart();
    } catch {
      // Keep auth and route state consistent if cart storage cannot be cleared.
    }
    setOwnedWishlist({ ownerId: 'guest-user', items: [] });
    setIsAdmin(false);
    adminStorefrontRequested.current = false;
    setCurrentUser({ id: 'guest-user', name: 'Guest Rider', email: '', phone: '', isGuest: true });
    setNotificationCount(0);
    setPendingCheckoutAfterLogin(false);
    pendingStockAlertProductRef.current = null;
    setIsLoginModalOpen(false);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    protectedRouteAfterAuth.current = null;
    setGuestWelcomeComplete(false);
    setAuthStatus('UNAUTHENTICATED');
    goToPhase('onboarding');
    if (!signOutSucceeded) console.warn('Supabase local sign-out could not be confirmed.');
  };

  const scrollToShop = () => {
    const el = document.getElementById('shop-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBannerClick = useCallback(
    (url: string) => {
      const target = url.trim();
      if (target.startsWith('/')) {
        navigate(target);
        return;
      }
      const externalUrl = /^https?:\/\//i.test(target)
        ? target
        : /^www\./i.test(target)
          ? `https://${target}`
          : '';
      if (externalUrl) window.open(externalUrl, '_blank', 'noopener,noreferrer');
    },
    [navigate],
  );

  // Haptics are an optional progressive enhancement: browsers without Vibration API stay silent.
  const handleAppHapticTap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!prefersHapticFeedback(currentUser.id) || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest('button, a[href], [role="button"], [role="switch"], input[type="checkbox"], input[type="radio"]');
    if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
    try { navigator.vibrate(10); } catch { /* Unsupported devices remain usable without haptics. */ }
  };

  // Phase 1: Product introduction. On each fresh unauthenticated app open, complete this before guest browsing.
  if (isAdminPath(location.pathname)) {
    return (
      <AdminAccessGate
        authStatus={authStatus}
        isAdmin={isAdmin}
        onBackToStore={() => {
          adminStorefrontRequested.current = true;
          navigate('/home', { replace: true });
        }}
        onSignIn={() => {
          setAuthInitialMode('login');
          goToPhase('auth');
        }}
      >
        <Suspense
          fallback={
            <div className="min-h-screen p-8 text-sm font-bold">Loading admin workspace…</div>
          }
        >
          <AdminPanel
            onBackToStore={() => {
              adminStorefrontRequested.current = true;
              navigate('/home', { replace: true });
            }}
          />
        </Suspense>
      </AdminAccessGate>
    );
  }

  // Never render a protected page while Supabase is still resolving the session.
  if (authStatus === 'AUTH_LOADING') {
    return <SplashScreen />;
  }
  if (authStatus === 'UNAUTHENTICATED' && appPhase === 'main' && !guestWelcomeComplete) {
    return <Suspense fallback={<SplashScreen />}><Onboarding onFinish={finishWelcomeOnboarding} /></Suspense>;
  }
  if (authStatus === 'AUTHENTICATED' && appPhase !== 'main') {
    return <SplashScreen />;
  }
  if (appPhase === 'onboarding') {
    return <Suspense fallback={<SplashScreen />}><Onboarding onFinish={finishWelcomeOnboarding} /></Suspense>;
  }

  // Account creation starts with the dedicated Rofik welcome flow.
  if (appPhase === 'account-onboarding') {
    return <Suspense fallback={<SplashScreen />}><RofikOnboarding onFinish={() => goToPhase('auth')} /></Suspense>;
  }

  // Keep the legacy loading phase available for existing links, but the signup onboarding now opens /signup directly.
  if (appPhase === 'splash') {
    return <SplashScreen />;
  }

  // Login / Signup Screen
  if (appPhase === 'auth') {
    return (
      <Suspense fallback={<SplashScreen />}>
      <div className="min-h-screen bg-[#f7d9de] flex justify-center selection:bg-[#e0182d] selection:text-white font-sans antialiased text-[#0f1a3a]">
        <AuthScreen
          initialMode={authInitialMode}
          onSuccess={handleLoginSuccess}
          onBack={() => goToPhase(guestWelcomeComplete ? 'main' : 'onboarding')}
          onOpenTerms={() => openPageRoute('/terms-and-conditions')}
          onOpenPrivacy={() => openPageRoute('/privacy-policy')}
        />
      </div>
      </Suspense>
    );
  }

  // Phase 4: Main Application (Home / Shop / Account / Cart / Guest Mode)
  const isNotificationPage = activeTab === 'notifications';
  const isShopPage = activeTab === 'shop';
  const isSupportPage = resolvedRoute.kind === 'support' || resolvedRoute.kind === 'contact-support';
  const hidesBottomNavigation = isNotificationPage || isShopPage || isSupportPage;

  return (
    <I18nProvider language={uiLanguage}>
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F0F2F5] flex justify-center selection:bg-[#D9232D] selection:text-white font-sans antialiased text-[#1E232A]">
      {/* App Container (Mobile Frame or Full Width based on toggle) */}
      <div
        onClickCapture={handleAppHapticTap}
        className={`w-full min-w-0 overflow-x-hidden bg-[#FDFDFD] min-h-screen flex flex-col relative shadow-2xl transition-all duration-300 ${
          hidesBottomNavigation ? '' : 'pb-28'
        } ${isMobileFrameMode ? 'max-w-[440px]' : 'max-w-7xl'}`}
      >
        {/* Main Header */}
        {!hidesBottomNavigation &&
          activeTab !== 'search' &&
          activeTab !== 'account' &&
          !['cart', 'wishlist', 'custom'].includes(activeTab) && (
            <Header
              cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
              notificationCount={notificationCount}
              wishlistCount={wishlist.length}
              currentUser={currentUser}
              onOpenCart={() => {
                setActiveTab('cart');
                setIsCartOpen(true);
              }}
              onOpenWishlist={openWishlistPage}
              onOpenStoreInfo={() => openPageRoute('/store')}
              onOpenAccount={() => setActiveTab('account')}
              onOpenNotifications={() => {
                refreshNotificationCount();
                setActiveTab('notifications');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenSearch={() => {
                setActiveTab('search');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              searchQuery={searchQuery}
              setSearchQuery={(q) => {
                setSearchQuery(q);
                if (q.trim()) {
                  setActiveTab('search');
                }
              }}
              hideSearchInput={false}
              isMobileFrameMode={isMobileFrameMode}
              setIsMobileFrameMode={setIsMobileFrameMode}
            />
          )}

        {/* View Switcher: Search View / Account View / Home & Shop Experience */}
        <Suspense fallback={<main className="flex min-h-[40vh] flex-1 items-center justify-center"><CloudLoader label="Loading view…" /></main>}>
        {activeTab === 'notifications' ? (
          <NotificationsView
            userId={currentUser.id}
            isGuest={currentUser.isGuest}
            onBack={() => setActiveTab('home')}
            onNotificationsChanged={refreshNotificationCount}
            onOpenShop={() => setActiveTab('shop')}
            products={catalogProducts}
            onOpenProduct={openProductRoute}
            onOpenSupportRequest={(requestId) => navigate(`/support/${encodeURIComponent(requestId)}`)}
            onOpenContactSupport={() => navigate('/contact-support?from=notifications', { state: { returnTo: '/notifications' } })}
            onOpenMyOrders={(orderSlug) => {
              navigate(orderSlug ? getPathForCustomerOrder(orderSlug) : '/my-orders');
            }}
          />
        ) : activeTab === 'shop' ? (
          <ShopView
            products={filteredProducts}
            wishlist={wishlist}
            cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
            isLoading={catalogLoading}
            error={catalogError}
            onRetry={retryCatalog}
            onBack={() => setActiveTab('home')}
            onSearch={(value) => {
              setSearchQuery(value);
              setActiveTab('search');
            }}
            onSelectProduct={openProductRoute}
            onQuickAdd={handleQuickAddToCart}
            onNotifyMe={handleNotifyMe}
            isQuickAddInCart={isQuickAddInCart}
            onToggleWishlist={handleToggleWishlist}
            onOpenCart={handleOpenCart}
            sortLabel={SORT_LABELS[sortBy]?.label || 'Sort'}
            activeFilterCount={activeHomeFiltersCount}
            onOpenSort={() => setIsHomeSortOpen(true)}
            onOpenFilter={() => setIsHomeFilterOpen(true)}
          />
        ) : activeTab === 'search' ? (
          <main className="flex-1 flex flex-col">
            <SearchView
              products={catalogProducts}
              isCatalogLoading={catalogLoading}
              catalogError={catalogError}
              onRetryCatalog={retryCatalog}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectProduct={openProductRoute}
              onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
              onNotifyMe={handleNotifyMe}
              isQuickAddInCart={isQuickAddInCart}
              onOpenCart={handleOpenCart}
              wishlist={wishlist}
              onToggleWishlist={(p, e) => handleToggleWishlist(p, e)}
              onBackToHome={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </main>
        ) : activeTab === 'account' ? (
          <main className="flex-1 flex flex-col">
          <AccountView
              currentUser={currentUser}
              isAdmin={isAdmin === true}
              onOpenAdminPanel={() => {
                adminStorefrontRequested.current = false;
                navigate('/admin');
              }}
              products={catalogProducts}
              pwaInstallCard={pwaInstall.visible ? <PwaInstallCard visible={pwaInstall.visible} canInstall={pwaInstall.canInstall} isIOSSafari={pwaInstall.isIOSSafari} isInstalling={pwaInstall.isInstalling} installError={pwaInstall.installError} onInstall={pwaInstall.install} onDismiss={pwaInstall.dismiss} /> : null}
              onProfileChange={(profile) =>
                setCurrentUser((user) =>
                  user.id === currentUser.id ? { ...user, ...profile } : user,
                )
              }
              onOpenLogin={() => {
                protectedRouteAfterAuth.current = location.pathname;
                setLoginModalReason('Sign in or create an account to continue.');
                setIsLoginModalOpen(true);
              }}
              onLogout={handleLogout}
              onBackToHome={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenWishlist={openWishlistPage}
              routeModal={resolvedRoute.kind === 'profile-edit' ? 'profile' : resolvedRoute.kind === 'orders' ? 'orders' : resolvedRoute.kind === 'settings' ? 'settings' : resolvedRoute.kind === 'support' ? 'support' : resolvedRoute.kind === 'contact-support' ? 'contact-support' : null}
              initialOrderSlug={resolvedRoute.kind === 'orders' ? resolvedRoute.orderSlug : null}
              initialSupportRequestId={resolvedRoute.kind === 'support' ? resolvedRoute.requestId : null}
              onOpenOrdersPage={() => navigate('/my-orders')}
              onOpenProfileEditPage={() => navigate('/profile/edit')}
              onBuyAgain={handleBuyAgain}
              onSelectOrderRoute={(orderSlug) => navigate(getPathForCustomerOrder(orderSlug))}
              onBackToOrdersRoute={() => navigate('/my-orders')}
              onOpenSettingsPage={() => navigate('/settings')}
              onOpenSupportPage={(requestId) => navigate(requestId ? `/support/${encodeURIComponent(requestId)}` : '/contact-support/my-support-requests')}
              onOpenContactSupport={() => {
                const from = resolvedRoute.kind === 'settings' ? 'settings' : 'profile';
                navigate(`/contact-support?from=${from}`, { state: { returnTo: from === 'settings' ? '/settings' : '/profile' } });
              }}
              onSelectSupportRequest={(requestId) => navigate(requestId ? `/support/${encodeURIComponent(requestId)}` : '/support')}
              onBackFromContactSupport={() => {
                const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
                const from = new URLSearchParams(location.search).get('from');
                navigate(from === 'notifications' || returnTo === '/notifications'
                  ? '/notifications'
                  : from === 'settings' || returnTo === '/settings'
                    ? '/settings'
                    : '/profile');
              }}
              onOpenPrivacyPage={() => openPageRoute('/privacy-policy')}
              onOpenTermsPage={() => openPageRoute('/terms-and-conditions')}
              onExitRoutedPage={() => {
                if (resolvedRoute.kind === 'support') {
                  if (location.pathname.toLowerCase() === '/contact-support/my-support-requests') {
                    navigate('/contact-support');
                  } else if (resolvedRoute.requestId) {
                    navigate('/contact-support/my-support-requests');
                  } else {
                    navigate('/profile');
                  }
                  return;
                }
                navigate('/profile');
              }}
              onOpenStoreInfo={() => openPageRoute('/store')}
              onOpenCustomBuilder={openCustomBuilderPage}
              onOpenShop={() => {
                setActiveTab('shop');
              }}
            />
          </main>
        ) : activeTab === 'cart' || activeTab === 'wishlist' || activeTab === 'custom' ? (
          <main className="min-h-screen flex-1 bg-[#FDFDFD]" aria-label={`${activeTab} view`} />
        ) : (
          <main className="flex-1 flex flex-col">
            {/* Hero Section Banner */}
            <HeroBanner
              onExploreClick={scrollToShop}
              onCustomClick={openCustomBuilderPage}
              onBannerClick={handleBannerClick}
            />

            {pwaInstall.visible && <div className="mb-4 px-5"><PwaInstallCard visible={pwaInstall.visible} canInstall={pwaInstall.canInstall} isIOSSafari={pwaInstall.isIOSSafari} isInstalling={pwaInstall.isInstalling} installError={pwaInstall.installError} onInstall={pwaInstall.install} onDismiss={pwaInstall.dismiss} /></div>}

            {/* Categories Section */}
            <CategorySection
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                if (cat !== 'all') scrollToShop();
              }}
            />

            {/* Vehicle Compatibility Filter Tool */}
            <VehicleFinder
              onFilterVehicle={(model) => {
                setVehicleFilter(model);
                if (model) scrollToShop();
              }}
              activeVehicleFilter={vehicleFilter}
            />

            {/* Popular Picks Horizontal Scroll (from user image) */}
            {selectedCategory === 'all' && !searchQuery && !vehicleFilter && (
              <section className="px-5 mb-6" data-purpose="popular-picks">
                <div className="flex justify-between items-baseline mb-3">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#D9232D]" />
                    <div>
                      <h3 className="text-[17px] font-black text-gray-900 tracking-tight">
                        {translate(uiLanguage, 'home.popularPicks')}
                      </h3>
                      <p className="text-[11.5px] text-gray-400 font-medium">
                        {translate(uiLanguage, 'home.favourites')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={scrollToShop}
                    className="text-[12px] font-bold text-[#D9232D] hover:text-red-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>{translate(uiLanguage, 'home.seeAll')}</span>
                    <span className="text-xs">→</span>
                  </button>
                </div>

                {/* Horizontal scrolling shelf */}
                {catalogError && catalogProducts.length === 0 ? (
                  <CatalogStatus state="error" onRetry={retryCatalog} compact />
                ) : catalogLoading && catalogProducts.length === 0 ? (
                  <CatalogStatus state="loading" compact />
                ) : catalogProducts.length === 0 ? (
                  <CatalogStatus state="empty" compact />
                ) : (
                  <div className="flex space-x-3.5 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-5 px-5">
                    {catalogProducts.slice(0, 4).map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        layoutMode="shelf"
                        onSelectProduct={openProductRoute}
                        onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                        onNotifyMe={handleNotifyMe}
                        isInCart={isQuickAddInCart(prod)}
                        onOpenCart={handleOpenCart}
                        isWishlisted={wishlist.some((w) => w.id === prod.id)}
                        onToggleWishlist={(p, e) => handleToggleWishlist(p, e)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Workshop Promotion Banner */}
            <section className="px-5 mb-6">
              <div className="bg-gradient-to-r from-red-600 via-[#D9232D] to-red-800 rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between">
                <div className="relative z-10 max-w-[240px]">
                  <span className="text-[9.5px] font-black tracking-widest uppercase bg-white/20 text-white px-2 py-0.5 rounded-full">
                    ON-SPOT SERVICE
                  </span>
                  <h4 className="text-[15px] font-black mt-1 leading-tight">
                    Need Custom Foam Cutting & Fitting?
                  </h4>
                  <p className="text-[11px] text-red-100 mt-1">
                    Visit Rofik Godi workshop for 15-minute express seat fitting.
                  </p>
                </div>

                <button
                  onClick={openCustomBuilderPage}
                  className="relative z-10 bg-white text-[#D9232D] hover:bg-gray-100 text-[11.5px] font-black px-3.5 py-2 rounded-xl shadow-sm transition-all active:scale-95 flex-shrink-0 cursor-pointer"
                >
                  Custom Fit
                </button>
              </div>
            </section>

            {/* Full Shop / Product Catalog Section */}
            <section id="shop-section" className="px-5 mb-6">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-[17px] font-black text-gray-900 tracking-tight">
                    {selectedCategory === 'all'
                      ? 'All Seat Covers & Essentials'
                      : `${selectedCategory.toUpperCase()} COLLECTION`}
                  </h3>
                  <p className="text-[11.5px] text-gray-400 font-medium">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}{' '}
                    available
                  </p>
                </div>

                {/* Sort & Filter Action Bar */}
                <div className="flex items-center gap-2">
                  {/* Sort Trigger Button */}
                  <button
                    onClick={() => setIsHomeSortOpen(true)}
                    className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200/80 px-2.5 py-1.5 rounded-xl text-[11.5px] font-bold text-gray-700 transition-all active:scale-95 cursor-pointer border border-gray-200/60"
                    title="Change sorting order"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                    <span>
                      {SORT_LABELS[sortBy]?.label
                        ? SORT_LABELS[sortBy].label.split(' ')[0]
                        : 'Sort'}
                    </span>
                  </button>

                  {/* Filter Trigger Button with badge */}
                  <button
                    onClick={() => setIsHomeFilterOpen(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11.5px] font-bold transition-all active:scale-95 cursor-pointer border ${
                      activeHomeFiltersCount > 0
                        ? 'bg-[#D9232D] text-white border-[#D9232D] shadow-xs'
                        : 'bg-gray-100 hover:bg-gray-200/80 text-gray-700 border-gray-200/60'
                    }`}
                    title="Open Filters"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter</span>
                    {activeHomeFiltersCount > 0 && (
                      <span className="bg-white text-[#D9232D] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                        {activeHomeFiltersCount}
                      </span>
                    )}
                  </button>

                  {/* Grid / List Switcher */}
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/60">
                    <button
                      onClick={() => setShopLayoutMode('grid')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        shopLayoutMode === 'grid'
                          ? 'bg-white text-[#D9232D] shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                      title="2-Column Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShopLayoutMode('list')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        shopLayoutMode === 'list'
                          ? 'bg-white text-[#D9232D] shadow-xs'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {(selectedCategory !== 'all' ||
                vehicleFilter ||
                searchQuery ||
                activeHomeFiltersCount > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-[10.5px] font-semibold text-gray-400">Active filters:</span>

                  {(selectedCategory !== 'all' || homeFilters.category !== 'all') && (
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setHomeFilters((prev) => ({ ...prev, category: 'all' }));
                      }}
                      className="bg-red-50 text-[#D9232D] border border-red-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>
                        Category:{' '}
                        {homeFilters.category !== 'all' ? homeFilters.category : selectedCategory}
                      </span>
                      <span>✕</span>
                    </button>
                  )}

                  {(vehicleFilter || homeFilters.vehicleBrand !== 'all') && (
                    <button
                      onClick={() => {
                        setVehicleFilter(null);
                        setHomeFilters((prev) => ({ ...prev, vehicleBrand: 'all' }));
                      }}
                      className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Vehicle: {vehicleFilter || homeFilters.vehicleBrand}</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.priceRange !== 'all' && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, priceRange: 'all' }))}
                      className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>
                        {homeFilters.priceRange === 'under_300' && 'Under ৳300'}
                        {homeFilters.priceRange === '300_600' && '৳300 - ৳600'}
                        {homeFilters.priceRange === '600_1000' && '৳600 - ৳1000'}
                        {homeFilters.priceRange === 'above_1000' && 'Above ��1000'}
                      </span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.maxPrice < 2000 && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, maxPrice: 2000 }))}
                      className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Max ৳{homeFilters.maxPrice}</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.waterproofOnly && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, waterproofOnly: false }))}
                      className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Waterproof</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.bestsellerOnly && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, bestsellerOnly: false }))}
                      className="bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Bestseller</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.inStockOnly && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, inStockOnly: false }))}
                      className="bg-green-50 text-green-700 border border-green-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>In Stock</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.customizableOnly && (
                    <button
                      onClick={() =>
                        setHomeFilters((prev) => ({ ...prev, customizableOnly: false }))
                      }
                      className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Custom Fit</span>
                      <span>✕</span>
                    </button>
                  )}

                  {homeFilters.minRating > 0 && (
                    <button
                      onClick={() => setHomeFilters((prev) => ({ ...prev, minRating: 0 }))}
                      className="bg-yellow-50 text-yellow-800 border border-yellow-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>{homeFilters.minRating}+ Stars</span>
                      <span>✕</span>
                    </button>
                  )}

                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <span>Search: "{searchQuery}"</span>
                      <span>✕</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setVehicleFilter(null);
                      setSearchQuery('');
                      setHomeFilters(INITIAL_FILTERS);
                    }}
                    className="text-[10px] font-bold text-gray-500 hover:text-[#D9232D] underline ml-1 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Product Grid / List Display */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-xs">
                  <p className="text-gray-500 text-sm font-semibold mb-2">
                    No seat covers found matching your filter.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setVehicleFilter(null);
                      setSearchQuery('');
                    }}
                    className="bg-[#D9232D] text-white text-xs font-bold px-4 py-2 rounded-full cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : shopLayoutMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {filteredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      layoutMode="grid"
                      onSelectProduct={openProductRoute}
                      onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                      onNotifyMe={handleNotifyMe}
                      isInCart={isQuickAddInCart(prod)}
                      onOpenCart={handleOpenCart}
                      isWishlisted={wishlist.some((w) => w.id === prod.id)}
                      onToggleWishlist={(p, e) => handleToggleWishlist(p, e)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {filteredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      layoutMode="list"
                      onSelectProduct={openProductRoute}
                      onQuickAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                      onNotifyMe={handleNotifyMe}
                      isInCart={isQuickAddInCart(prod)}
                      onOpenCart={handleOpenCart}
                      isWishlisted={wishlist.some((w) => w.id === prod.id)}
                      onToggleWishlist={(p, e) => handleToggleWishlist(p, e)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Customer Reviews */}
            <CustomerReviews />

            {/* Footer Brand Info */}
            <footer className="px-5 pt-6 pb-4 bg-gray-900 text-gray-300 rounded-t-[32px] mt-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-black text-white flex items-center">
                      <span>ROFIK</span>
                      <span className="text-[#D9232D] ml-1.5">GODI</span>
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 tracking-wider uppercase">
                      CENTRE · LOCAL RIDE ESSENTIALS
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`tel:${WORKSHOP_INFO.phone}`}
                      className="w-8 h-8 rounded-full bg-gray-800 text-white hover:bg-[#D9232D] flex items-center justify-center transition-colors"
                      title="Call Us"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/919832145678`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <p className="text-[11.5px] text-gray-400 leading-relaxed">
                  Leading seat cover manufacturer for bikes, toto e-rickshaws, and scooters.
                  Handcrafted with Japanese stitching cords, anti-fatigue memory foam, and
                  weather-proof rexine.
                </p>

                <div className="border-t border-gray-800 pt-3 flex flex-wrap justify-between items-center text-[10.5px] text-gray-500 gap-2">
                  <span>© 2026 ROFIK GODI CENTRE</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openPageRoute('/privacy-policy')}
                      className="hover:text-white transition-colors underline-offset-2 hover:underline"
                    >
                      Privacy Policy
                    </button>
                    <span className="text-gray-700">·</span>
                    <button
                      type="button"
                      onClick={() => openPageRoute('/terms-and-conditions')}
                      className="hover:text-white transition-colors underline-offset-2 hover:underline"
                    >
                      Terms & Conditions
                    </button>
                  </div>
                  <span>100% Genuine Stitched</span>
                </div>
              </div>
            </footer>
          </main>
        )}
        </Suspense>

        {/* Bottom Tab Bar Navigation */}
        {!hidesBottomNavigation &&
          activeTab !== 'search' &&
          !['cart', 'wishlist', 'custom'].includes(activeTab) && (
            <BottomNav
              activeTab={activeTab as 'home' | 'shop' | 'custom' | 'wishlist' | 'account' | 'cart'}
              setActiveTab={(tab) => setActiveTab(tab as RouteTab)}
              cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
              wishlistCount={wishlist.length}
              onOpenCart={() => {
                setActiveTab('cart');
                setIsCartOpen(true);
              }}
              onOpenWishlist={openWishlistPage}
              onOpenCustomBuilder={openCustomBuilderPage}
              onOpenShop={() => {
                setActiveTab('shop');
              }}
              onOpenSearch={() => {
                setActiveTab('search');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenAccount={() => {
                setActiveTab('account');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          )}

        {/* Modals & Slide-overs */}
        <Suspense fallback={null}>
        {selectedProduct && <ProductDetailModal
          products={catalogProducts}
          product={selectedProduct}
          onClose={closeProductRoute}
          onAddToCart={handleDetailAddToCart}
          cartItems={cart}
          isWishlisted={selectedProduct ? wishlist.some((w) => w.id === selectedProduct.id) : false}
          onToggleWishlist={(p) => handleToggleWishlist(p)}
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          onOpenCart={handleOpenCart}
          onOpenSearch={() => {
            setSelectedProduct(null);
            setActiveTab('search');
            navigate('/search');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBuyNow={handleDetailBuyNow}
          onSelectProduct={openProductRoute}
          onQuickAdd={handleToggleDefaultCartItem}
          onNotifyMe={handleNotifyMe}
          isAuthenticated={!currentUser.isGuest}
          customerId={currentUser.isGuest ? undefined : currentUser.id}
          onRequestLogin={() => {
            setLoginModalReason('Sign in to review products you have purchased.');
            setIsLoginModalOpen(true);
          }}
        />}

        {(isCustomBuilderOpen || activeTab === 'custom') && <CustomSeatBuilder
          isOpen={isCustomBuilderOpen || activeTab === 'custom'}
          onClose={() => {
            setIsCustomBuilderOpen(false);
            setActiveTab('home');
          }}
          onAddCustomSeatToCart={(p, col, stitch, thick, emb) => {
            handleDetailAddToCart(p, col, stitch, thick, emb);
            setActiveTab('cart');
            setIsCartOpen(true);
          }}
        />}

        {(isCartOpen || activeTab === 'cart') && <CartDrawer
          isOpen={isCartOpen || activeTab === 'cart'}
          onClose={() => {
            setIsCartOpen(false);
            setActiveTab('home');
            setCartReorderNotice(null);
          }}
          items={cart}
          userId={currentUser.id}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveCartItem}
          onProceedToCheckout={handleProceedToCheckout}
          reorderNotice={cartReorderNotice}
          onDismissReorderNotice={() => setCartReorderNotice(null)}
        />}

        {isCheckoutOpen && <CheckoutModal
          isOpen={isCheckoutOpen}
          userId={currentUser.id}
          onOrderPlaced={refreshNotificationCount}
          onClose={() => {
            const returnPath = checkoutReturnPath;
            const returnState = checkoutReturnState;
            setIsCheckoutOpen(false);
            setCheckoutItems(null);
            setCheckoutReturnPath('/cart');
            setCheckoutReturnState(null);
            navigate(returnPath, { state: returnState });
          }}
          items={checkoutItems ?? cart}
          onUpdateQuantity={handleCheckoutQuantity}
          discount={checkoutDiscount}
          couponCode={checkoutCoupon}
          couponSubtotal={checkoutQuote?.subtotal}
          couponTotal={checkoutQuote?.total}
          onClearCart={checkoutItems === null ? clearCart : () => undefined}
        />}

        {(isWishlistOpen || activeTab === 'wishlist') && <WishlistModal
          isOpen={isWishlistOpen || activeTab === 'wishlist'}
          onClose={() => {
            setIsWishlistOpen(false);
            setActiveTab('home');
          }}
          wishlist={wishlist}
          onRemoveWishlist={(p) => handleToggleWishlist(p)}
          onSelectProduct={openProductRoute}
          onAddToCart={handleToggleDefaultCartItem}
          isInCart={isQuickAddInCart}
          onOpenCart={handleOpenCart}
        />}

        {isStoreInfoOpen && <StoreLocationModal isOpen={isStoreInfoOpen} onClose={() => navigateBackToPage('/home')} />}

        {/* 📜 Privacy Policy Modal / Slide-over */}
        {isPrivacyPolicyOpen && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            <PrivacyPolicyView
              onBack={() => navigateBackToPage('/home')}
              onOpenStoreInfo={() => openPageRoute('/store')}
            />
          </div>
        )}

        {/* ⚖️ Terms & Conditions Modal / Slide-over */}
        {isTermsConditionsOpen && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            <TermsConditionsView
              onBack={() => navigateBackToPage('/home')}
              onOpenStoreInfo={() => openPageRoute('/store')}
            />
          </div>
        )}

        {/* 🎛️ Filter & Sort Modal for Home Catalog */}
        {(isHomeFilterOpen || isHomeSortOpen) && <FilterSortModal
          isFilterOpen={isHomeFilterOpen}
          isSortOpen={isHomeSortOpen}
          onCloseFilter={() => setIsHomeFilterOpen(false)}
          onCloseSort={() => setIsHomeSortOpen(false)}
          currentSort={sortBy}
          onSelectSort={(newSort: SortOption) => setSortBy(newSort)}
          filters={homeFilters}
          onUpdateFilters={(newFilters: FilterState) => {
            setHomeFilters(newFilters);
            if (newFilters.category !== 'all') {
              setSelectedCategory(newFilters.category);
            }
          }}
          onResetFilters={() => {
            setHomeFilters(INITIAL_FILTERS);
            setSelectedCategory('all');
            setVehicleFilter(null);
          }}
          matchingCount={filteredProducts.length}
        />}
        </Suspense>

        {/* 🔐 Login Required Modal (Triggered on Guest Checkout / Account Access) */}
        {isLoginModalOpen && <Suspense fallback={null}><LoginRequiredModal
          isOpen={isLoginModalOpen}
          onClose={() => {
            setIsLoginModalOpen(false);
            setPendingCheckoutAfterLogin(false);
            pendingStockAlertProductRef.current = null;
            protectedRouteAfterAuth.current = null;
          }}
          reason={loginModalReason}
          onOpenAuth={(mode) => {
            const nextMode = mode || 'signup';
            setIsLoginModalOpen(false);
            setAuthInitialMode(nextMode);
            goToPhase(nextMode === 'signup' ? 'account-onboarding' : 'auth');
          }}
        /></Suspense>}
        {stockAlertFeedback && <div className="pointer-events-none fixed inset-x-3 top-3 z-[90] flex justify-center pt-[env(safe-area-inset-top)]">
          <div role={stockAlertFeedback.tone === 'error' ? 'alert' : 'status'} aria-live={stockAlertFeedback.tone === 'error' ? 'assertive' : 'polite'} className={`pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-bold shadow-xl ${stockAlertFeedback.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950'}`}>
            <p className="min-w-0 flex-1 leading-relaxed">{stockAlertFeedback.message}</p>
            <button type="button" aria-label="Dismiss restock alert message" onClick={() => {
              if (stockAlertFeedbackTimerRef.current !== null) window.clearTimeout(stockAlertFeedbackTimerRef.current);
              stockAlertFeedbackTimerRef.current = null;
              setStockAlertFeedback(null);
            }} className="min-h-11 shrink-0 rounded-xl px-3 text-[11px] font-extrabold hover:bg-black/5">Dismiss</button>
          </div>
        </div>}
        <Outlet />
      </div>
    </div>
    </I18nProvider>
  );
}
