import React from 'react';
import { Home, ShoppingBag, Heart, User } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { VignetteBarBackdrop } from './VignetteBarBackdrop';

interface BottomNavProps {
  activeTab: 'home' | 'shop' | 'search' | 'custom' | 'wishlist' | 'account' | 'cart';
  setActiveTab: (tab: 'home' | 'shop' | 'search' | 'custom' | 'wishlist' | 'account' | 'cart') => void;
  isHidden?: boolean;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenCustomBuilder?: () => void;
  onOpenShop: () => void;
  onOpenSearch?: () => void;
  onOpenAccount: () => void;
  onScrollToTop: () => void;
  accountUpdateDot?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  isHidden = false,
  wishlistCount,
  onOpenWishlist,
  onOpenShop,
  onOpenAccount,
  onScrollToTop,
  accountUpdateDot = false,
}) => {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();

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
      dot: accountUpdateDot,
    },
  ];

  const springTransition = prefersReducedMotion
    ? { duration: 0.14 }
    : { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.75 };

  const slideUpEntranceTransition = prefersReducedMotion
    ? { duration: 0.16 }
    : { type: 'spring' as const, stiffness: 360, damping: 30, mass: 0.78 };

  return (
    <nav
      aria-label="Primary navigation"
      aria-hidden={isHidden}
      data-dock-hidden={isHidden ? 'true' : 'false'}
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-300 ease-out will-change-transform ${
        isHidden ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
      data-purpose="mobile-navbar"
    >
      <motion.div
        initial={prefersReducedMotion ? false : { y: 24, opacity: 0 }}
        animate={
          isHidden
            ? { y: 16, opacity: 0.9, scale: 0.97 }
            : { y: 0, opacity: 1, scale: 1 }
        }
        transition={slideUpEntranceTransition}
        className={`${
          isHidden ? 'pointer-events-none' : 'pointer-events-auto'
        } relative isolate w-full max-w-[368px] sm:max-w-[404px] overflow-hidden rounded-[28px] border border-white/15 border-t border-t-white/30 bg-[#0B0A0C]/82 p-1.5 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-black/40 shadow-[0_20px_44px_-10px_rgba(0,0,0,0.68),0_6px_18px_-4px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(255,255,255,0.06)] will-change-transform`}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-65">
          <VignetteBarBackdrop variant="bottom" />
        </span>

        {/* Subtle iOS top specular glass sheen for dark-background separation */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-5 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
        />

        <div className="relative z-10 grid grid-cols-4 items-center gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                tabIndex={isHidden ? -1 : 0}
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
                    className="absolute inset-0 rounded-[22px] border border-white/24 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_6px_16px_-6px_rgba(0,0,0,0.42)]"
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
                        : 'text-white/68 group-hover:text-white/95'
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
                  {'dot' in item && item.dot && item.badge === 0 && (
                    <motion.span
                      data-testid="bottom-nav-account-update-dot"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springTransition}
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-1.5 h-2.5 w-2.5 rounded-full border border-[#14100E] bg-[#FF3B47] shadow-[0_0_0_2px_rgba(255,59,71,0.22)]"
                    />
                  )}
                </motion.div>

                <span
                  className={`relative z-10 mt-0.5 text-[10px] tracking-[0.01em] transition-colors duration-200 ${
                    isActive
                      ? 'font-bold text-white'
                      : 'font-medium text-white/68 group-hover:text-white/95'
                  }`}
                >
                  {item.label}
                </span>
                {'dot' in item && item.dot && (
                  <span className="sr-only">, update available</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
};

