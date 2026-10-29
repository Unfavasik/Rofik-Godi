import React, { useEffect, useRef, useState } from 'react';
import {
  Heart,
  Home,
  ShoppingBag,
  User,
  type LucideIcon,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { useI18n } from '../lib/i18n';

const BRAND_RED = '#D9232D';
const SLOT_COUNT = 4;
const NOTCH_WIDTH = 96;
const NOTCH_DEPTH = 34;

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

const tabIndex: Record<'home' | 'shop' | 'wishlist' | 'account', number> = {
  home: 0,
  shop: 1,
  wishlist: 2,
  account: 3,
};

const getNotchPath = (center: number, width: number, height: number, visible: boolean) => {
  if (!visible || width <= 0 || height <= 0) {
    return `M 0 0 H ${width} V ${height} H 0 Z`;
  }

  const halfWidth = NOTCH_WIDTH / 2;
  const left = Math.max(24, center - halfWidth);
  const right = Math.min(width - 24, center + halfWidth);
  const leftControl = Math.max(0, left - 24);
  const rightControl = Math.min(width, right + 24);

  return [
    `M 0 0 H ${leftControl}`,
    `C ${left - 10} 0 ${left - 18} 2 ${left} 12`,
    `C ${left + 14} 20 ${center - 24} ${NOTCH_DEPTH} ${center} ${NOTCH_DEPTH}`,
    `C ${center + 24} ${NOTCH_DEPTH} ${right - 14} 20 ${right} 12`,
    `C ${right + 18} 2 ${right + 10} 0 ${rightControl} 0`,
    `H ${width} V ${height} H 0 Z`,
  ].join(' ');
};

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
  const shouldReduceMotion = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const [barSize, setBarSize] = useState({ width: 0, height: 0 });
  const [slotWidth, setSlotWidth] = useState(0);
  const [slotsLeft, setSlotsLeft] = useState(0);

  const activeIndex = activeTab in tabIndex ? tabIndex[activeTab as keyof typeof tabIndex] : -1;
  const notchTarget = useMotionValue(0);
  const notchX = useSpring(notchTarget, {
    stiffness: 260,
    damping: 24,
    mass: 0.9,
  });
  const notchVelocity = useVelocity(notchX);
  const bubbleScaleX = useTransform(notchVelocity, [-900, 0, 900], [1.12, 1, 1.12]);
  const notchPath = useTransform(notchX, (x) =>
    getNotchPath(x, barSize.width, barSize.height, activeIndex >= 0),
  );

  useEffect(() => {
    const nav = navRef.current;
    const slots = slotsRef.current;
    if (!nav || !slots) return;

    const measure = () => {
      const navRect = nav.getBoundingClientRect();
      const slotsRect = slots.getBoundingClientRect();
      setBarSize({ width: navRect.width, height: navRect.height });
      setSlotWidth(slotsRect.width / SLOT_COUNT);
      setSlotsLeft(slotsRect.left - navRect.left);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    observer.observe(slots);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = activeIndex >= 0 ? slotsLeft + slotWidth * (activeIndex + 0.5) : 0;
    notchTarget.set(target);
  }, [activeIndex, notchTarget, slotWidth, slotsLeft]);

  const tabs: Array<{ id: 'home' | 'shop' | 'wishlist' | 'account'; label: string; icon: LucideIcon }> = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'shop', label: t('nav.shop'), icon: ShoppingBag },
    { id: 'wishlist', label: t('nav.saved'), icon: Heart },
    { id: 'account', label: t('nav.account'), icon: User },
  ];

  const handleTabClick = (id: (typeof tabs)[number]['id']) => {
    setActiveTab(id);
    if (id === 'home') onScrollToTop();
    if (id === 'shop') onOpenShop();
    if (id === 'wishlist') onOpenWishlist();
    if (id === 'account') onOpenAccount();
  };

  const ActiveIcon = activeIndex >= 0 ? tabs[activeIndex].icon : null;

  return (
    <nav
      ref={navRef}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-7xl overflow-visible px-3 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6"
      data-purpose="mobile-navbar"
    >
      <motion.svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_-4px_25px_rgba(0,0,0,0.06)]"
        preserveAspectRatio="none"
        viewBox={`0 0 ${barSize.width || 1} ${barSize.height || 1}`}
      >
        <motion.path d={notchPath} fill="white" />
      </motion.svg>

      {ActiveIcon && (
        <motion.div
          className="pointer-events-none absolute left-0 top-[-20px] z-20 flex h-14 w-14 items-center justify-center rounded-full border-[3px] bg-white shadow-[0_5px_18px_rgba(217,35,45,0.16)] will-change-transform"
          style={{
            x: notchX,
            translateX: '-50%',
            scaleX: shouldReduceMotion ? 1 : bubbleScaleX,
            borderColor: BRAND_RED,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, mass: 0.65 }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18, mass: 0.55 }}
            >
              <ActiveIcon className="h-6 w-6" color={BRAND_RED} fill={`${BRAND_RED}1A`} strokeWidth={2.4} />
            </motion.div>
          </AnimatePresence>
          {activeTab === 'wishlist' && wishlistCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-gray-900 text-[8.5px] font-bold text-white"
            >
              {wishlistCount}
            </motion.span>
          )}
        </motion.div>
      )}

      <div ref={slotsRef} className="relative z-10 flex items-center justify-around">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          const isValidActive = activeIndex >= 0;
          return (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className="group relative flex min-w-0 flex-1 flex-col items-center py-1 transition-transform active:scale-95"
            >
              <motion.div
                className="relative flex h-6 items-center justify-center will-change-transform"
                initial={false}
                animate={{
                  scale: isActive && isValidActive ? 0.6 : 1,
                  opacity: isActive && isValidActive ? 0 : 1,
                }}
                transition={{ duration: shouldReduceMotion ? 0.12 : 0.2, ease: 'easeOut' }}
              >
                <Icon
                  className={`h-5 w-5 transition-colors ${isActive ? 'text-[#D9232D]' : 'text-gray-400 group-hover:text-gray-600'}`}
                  strokeWidth={2}
                />
                {id === 'wishlist' && wishlistCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-2 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-gray-900 text-[8.5px] font-bold text-white"
                  >
                    {wishlistCount}
                  </motion.span>
                )}
              </motion.div>
              <motion.span
                className={`mt-1 text-[10.5px] ${isActive && isValidActive ? 'font-bold text-gray-900' : 'font-semibold text-gray-500'}`}
                animate={{
                  opacity: isActive ? 1 : 0.9,
                  y: isActive && isValidActive ? -4 : 0,
                  color: isActive && isValidActive ? '#111827' : '#6B7280',
                }}
                transition={{ duration: shouldReduceMotion ? 0.12 : 0.22, ease: 'easeOut' }}
              >
                {label}
              </motion.span>
            </button>
          );
        })}
      </div>
      <div className="relative z-10 mx-auto mt-2.5 h-1 w-32 rounded-full bg-gray-300" />
    </nav>
  );
};
