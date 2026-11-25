import React from 'react';
import { Home, ShoppingBag, Heart, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { VignetteBarBackdrop } from './VignetteBarBackdrop';

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
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 isolate w-full overflow-hidden bg-[#090808] px-3 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-white/10 shadow-[0_-10px_30px_-14px_rgba(9,8,8,0.65)] sm:px-6"
      data-purpose="mobile-navbar"
    >
      <VignetteBarBackdrop variant="bottom" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl justify-around items-center gap-1">
        {/* Home */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            onScrollToTop();
          }}
          className={`relative flex min-h-11 min-w-[60px] flex-col items-center justify-center group rounded-2xl px-3 pt-1.5 pb-1 active:scale-95 transition-all cursor-pointer ${
            activeTab === 'home' ? 'bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]' : 'hover:bg-white/6'
          }`}
        >
          {activeTab === 'home' && (
            <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-[#FF4D58]" />
          )}
          <Home className={`w-[18px] h-[18px] transition-colors ${activeTab === 'home' ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`} />
          <span className={`text-[10.5px] mt-0.5 transition-colors ${activeTab === 'home' ? 'font-bold text-white' : 'font-medium text-white/65 group-hover:text-white/90'}`}>
            {t('nav.home')}
          </span>
        </button>

        {/* Shop */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('shop');
            onOpenShop();
          }}
          className={`relative flex min-h-11 min-w-[60px] flex-col items-center justify-center group rounded-2xl px-3 pt-1.5 pb-1 active:scale-95 transition-all cursor-pointer ${
            activeTab === 'shop' ? 'bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]' : 'hover:bg-white/6'
          }`}
        >
          {activeTab === 'shop' && (
            <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-[#FF4D58]" />
          )}
          <ShoppingBag className={`w-[18px] h-[18px] transition-colors ${activeTab === 'shop' ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`} />
          <span className={`text-[10.5px] mt-0.5 transition-colors ${activeTab === 'shop' ? 'font-bold text-white' : 'font-medium text-white/65 group-hover:text-white/90'}`}>
            {t('nav.shop')}
          </span>
        </button>

        {/* Saved / Wishlist */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('wishlist');
            onOpenWishlist();
          }}
          className={`relative flex min-h-11 min-w-[60px] flex-col items-center justify-center group rounded-2xl px-3 pt-1.5 pb-1 active:scale-95 transition-all cursor-pointer ${
            activeTab === 'wishlist' ? 'bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]' : 'hover:bg-white/6'
          }`}
        >
          {activeTab === 'wishlist' && (
            <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-[#FF4D58]" />
          )}
          <div className="relative">
            <Heart className={`w-[18px] h-[18px] transition-colors ${activeTab === 'wishlist' ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`} />
            {wishlistCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-2 min-w-3.5 h-3.5 px-0.5 bg-[#D9232D] text-white text-[8.5px] font-bold rounded-full flex items-center justify-center border border-[#14100E] tabular-nums"
              >
                {wishlistCount}
              </motion.span>
            )}
          </div>
          <span className={`text-[10.5px] mt-0.5 transition-colors ${activeTab === 'wishlist' ? 'font-bold text-white' : 'font-medium text-white/65 group-hover:text-white/90'}`}>
            {t('nav.saved')}
          </span>
        </button>

        {/* Account Screen */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('account');
            onOpenAccount();
          }}
          className={`relative flex min-h-11 min-w-[60px] flex-col items-center justify-center group rounded-2xl px-3 pt-1.5 pb-1 active:scale-95 transition-all cursor-pointer ${
            activeTab === 'account' ? 'bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]' : 'hover:bg-white/6'
          }`}
        >
          {activeTab === 'account' && (
            <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-[#FF4D58]" />
          )}
          <User className={`w-[18px] h-[18px] transition-colors ${activeTab === 'account' ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`} />
          <span className={`text-[10.5px] mt-0.5 transition-colors ${activeTab === 'account' ? 'font-bold text-white' : 'font-medium text-white/65 group-hover:text-white/90'}`}>
            {t('nav.account')}
          </span>
        </button>
      </div>
    </nav>
  );
};
