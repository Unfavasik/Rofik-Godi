import React, { useEffect, useRef, useState } from 'react';
import { Home, ShoppingBag, Heart, User } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { VignetteBarBackdrop } from './VignetteBarBackdrop';
import { computeNextDockScrollState, type DockScrollState } from '../lib/dockScrollVisibility';

interface BottomNavProps {
  activeTab: 'home' | 'shop' | 'search' | 'custom' | 'wishlist' | 'account' | 'cart';
  setActiveTab: (tab: 'home' | 'shop' | 'search' | 'custom' | 'wishlist' | 'account' | 'cart') => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenCustomBuilder?: () => void;
  onOpenShop: () => void;
  onOpenSearch?: () => void;
  onOpenAccount: () => void;
  onScrollToTop: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  wishlistCount,
  onOpenWishlist,
  onOpenShop,
  onOpenAccount,
  onScrollToTop,
}) => {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const [isDockHidden, setIsDockHidden] = useState(false);
  const scrollStateRef = useRef<DockScrollState>({
    isHidden: false,
    anchorY: typeof window !== 'undefined' ? Math.max(0, window.scrollY) : 0,
  });

  // Always reveal the dock when switching tabs
  useEffect(() => {
    const currentY = typeof window !== 'undefined' ? Math.max(0, window.scrollY) : 0;
    scrollStateRef.current = { isHidden: false, anchorY: currentY };
    setIsDockHidden(false);
  }, [activeTab]);

  // Smooth scroll-linked hide (scrolling down / swiping up) & reveal (scrolling up / swiping down)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const next = computeNextDockScrollState(scrollStateRef.current, window.scrollY);
        scrollStateRef.current = next;
        setIsDockHidden((prev) => (prev === next.isHidden ? prev : next.isHidden));
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const items = [
    {
      id: 'home' as const,
      label: t('nav.home'),
      icon: Home,
      onClick: () => {
        setActiveTab('home');
        onScrollToTop();
      },
      badge: 0,
    },
    {
      id: 'shop' as const,
      label: t('nav.shop'),
      icon: ShoppingBag,
      onClick: () => {
        setActiveTab('shop');
        onOpenShop();
      },
      badge: 0,
    },
    {
      id: 'wishlist' as const,
      label: t('nav.saved'),
      icon: Heart,
      onClick: () => {
        setActiveTab('wishlist');
        onOpenWishlist();
      },
      badge: wishlistCount,
    },
    {
      id: 'account' as const,
      label: t('nav.account'),
      icon: User,
      onClick: () => {
        setActiveTab('account');
        onOpenAccount();
      },
      badge: 0,
    },
  ];

  const springTransition = prefersReducedMotion
    ? { duration: 0.14 }
    : { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.75 };

  const dockVisibilityTransition = prefersReducedMotion
    ? { duration: 0.16 }
    : { type: 'spring' as const, stiffness: 360, damping: 32, mass: 0.8 };

  return (
    <nav
      aria-label="Primary navigation"
      aria-hidden={isDockHidden}
      data-dock-hidden={isDockHidden ? 'true' : 'false'}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-purpose="mobile-navbar"
    >
      <motion.div
        initial={prefersReducedMotion ? false : { y: 18, opacity: 0 }}
        animate={
          isDockHidden
            ? { y: 112, opacity: 0, scale: 0.96 }
            : { y: 0, opacity: 1, scale: 1 }
        }
        transition={dockVisibilityTransition}
        className={`${
          isDockHidden ? 'pointer-events-none' : 'pointer-events-auto'
        } relative isolate w-full max-w-[368px] sm:max-w-[404px] overflow-hidden rounded-[28px] border border-white/20 bg-[#121010]/78 p-1.5 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-black/25 shadow-[0_18px_40px_-10px_rgba(9,8,8,0.62),0_4px_14px_-4px_rgba(9,8,8,0.38),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(255,255,255,0.06)] will-change-transform`}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70">
          <VignetteBarBackdrop variant="bottom" />
        </span>

        {/* Subtle iOS top specular glass sheen */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-5 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />

        <div className="relative z-10 grid grid-cols-4 items-center gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                tabIndex={isDockHidden ? -1 : 0}
                aria-current={isActive ? 'page' : undefined}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                onClick={item.onClick}
                className="group relative flex min-h-[48px] flex-col items-center justify-center rounded-[22px] px-2 py-1.5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {isActive && (
                  <motion.span
                    layoutId="ios-dock-active-pill"
                    transition={springTransition}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[22px] border border-white/22 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_6px_16px_-6px_rgba(0,0,0,0.4)]"
                  />
                )}

                <motion.div
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : { scale: isActive ? 1.08 : 1, y: isActive ? -0.5 : 0 }
                  }
                  transition={springTransition}
                  className="relative z-10 flex items-center justify-center"
                >
                  <Icon
                    strokeWidth={isActive ? 2.25 : 1.85}
                    className={`h-[19px] w-[19px] transition-colors duration-200 ${
                      isActive
                        ? 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.28)]'
                        : 'text-white/62 group-hover:text-white/90'
                    }`}
                  />
                  {item.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springTransition}
                      className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#14100E] bg-[#FF3B47] px-1 text-[9px] font-bold text-white tabular-nums shadow-sm"
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </motion.div>

                <span
                  className={`relative z-10 mt-0.5 text-[10px] tracking-[0.01em] transition-colors duration-200 ${
                    isActive
                      ? 'font-bold text-white'
                      : 'font-medium text-white/62 group-hover:text-white/90'
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
};

