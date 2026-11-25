import React from 'react';
import { Home, ShoppingBag, Heart, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../lib/i18n';

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
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-7xl bg-white/96 px-3 pt-0 pb-[max(0.45rem,env(safe-area-inset-bottom))] backdrop-blur-md border-t border-slate-200/80 shadow-[0_-2px_12px_rgba(15,23,42,0.04)] sm:px-6"
      data-purpose="mobile-navbar"
    >
      <div className="flex justify-around items-center gap-1">
        {/* Home */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('home');
            onScrollToTop();
          }}
          className="relative flex min-h-11 min-w-[56px] flex-col items-center justify-center group px-2 pt-1.5 pb-0.5 active:scale-95 transition-transform cursor-pointer"
        >
          {activeTab === 'home' && (
            <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-[#D9232D]" />
          )}
          <Home className={`w-[18px] h-[18px] transition-colors ${activeTab === 'home' ? 'text-[#D9232D]' : 'text-slate-400 group-hover:text-slate-700'}`} />
          <span className={`text-[10.5px] mt-0.5 transition-colors ${activeTab === 'home' ? 'font-bold text-[#D9232D]' : 'font-medium text-slate-500 group-hover:text-slate-800'}`}>
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
          className="relative flex min-h-11 min-w-[56px] flex-col items-center justify-center group px-2 pt-1.5 pb-0.5 active:scale-95 transition-transform cursor-pointer"
        >
          {activeTab === 'shop' && (
            <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-[#D9232D]" />
          )}
          <ShoppingBag className={`w-[18px] h-[18px] transition-colors ${activeTab === 'shop' ? 'text-[#D9232D]' : 'text-slate-400 group-hover:text-slate-700'}`} />
          <span className={`text-[10.5px] mt-0.5 transition-colors ${activeTab === 'shop' ? 'font-bold text-[#D9232D]' : 'font-medium text-slate-500 group-hover:text-slate-800'}`}>
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
          className="relative flex min-h-11 min-w-[56px] flex-col items-center justify-center group px-2 pt-1.5 pb-0.5 active:scale-95 transition-transform cursor-pointer"
        >
          {activeTab === 'wishlist' && (
            <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-[#D9232D]" />
          )}
          <div className="relative">
            <Heart className={`w-[18px] h-[18px] transition-colors ${activeTab === 'wishlist' ? 'text-[#D9232D]' : 'text-slate-400 group-hover:text-slate-700'}`} />
            {wishlistCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-2 min-w-3.5 h-3.5 px-0.5 bg-slate-900 text-white text-[8.5px] font-bold rounded-full flex items-center justify-center border border-white tabular-nums"
              >
                {wishlistCount}
              </motion.span>
            )}
          </div>
          <span className={`text-[10.5px] mt-0.5 transition-colors ${activeTab === 'wishlist' ? 'font-bold text-[#D9232D]' : 'font-medium text-slate-500 group-hover:text-slate-800'}`}>
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
          className="relative flex min-h-11 min-w-[56px] flex-col items-center justify-center group px-2 pt-1.5 pb-0.5 active:scale-95 transition-transform cursor-pointer"
        >
          {activeTab === 'account' && (
            <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-7 rounded-full bg-[#D9232D]" />
          )}
          <User className={`w-[18px] h-[18px] transition-colors ${activeTab === 'account' ? 'text-[#D9232D]' : 'text-slate-400 group-hover:text-slate-700'}`} />
          <span className={`text-[10.5px] mt-0.5 transition-colors ${activeTab === 'account' ? 'font-bold text-[#D9232D]' : 'font-medium text-slate-500 group-hover:text-slate-800'}`}>
            {t('nav.account')}
          </span>
        </button>
      </div>
    </nav>
  );
};
