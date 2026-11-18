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
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-7xl bg-white/95 px-3 pt-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] backdrop-blur-md border-t border-gray-100/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] sm:px-6"
      data-purpose="mobile-navbar"
    >
      <div className="flex justify-around items-center gap-1">
        {/* Home */}
        <button
          onClick={() => {
            setActiveTab('home');
            onScrollToTop();
          }}
          className="flex min-h-10 min-w-[52px] flex-col items-center justify-center group px-1.5 py-0.5 active:scale-95 transition-transform"
        >
          <Home className={`w-[18px] h-[18px] transition-colors ${activeTab === 'home' ? 'text-[#D9232D]' : 'text-gray-400 group-hover:text-gray-600'}`} />
          <span className={`text-[10px] mt-0.5 ${activeTab === 'home' ? 'font-bold text-[#D9232D]' : 'font-semibold text-gray-500'}`}>
            {t('nav.home')}
          </span>
        </button>

        {/* Shop */}
        <button
          onClick={() => {
            setActiveTab('shop');
            onOpenShop();
          }}
          className="flex min-h-10 min-w-[52px] flex-col items-center justify-center group px-1.5 py-0.5 active:scale-95 transition-transform"
        >
          <ShoppingBag className={`w-[18px] h-[18px] transition-colors ${activeTab === 'shop' ? 'text-[#D9232D]' : 'text-gray-400 group-hover:text-gray-600'}`} />
          <span className={`text-[10px] mt-0.5 ${activeTab === 'shop' ? 'font-bold text-[#D9232D]' : 'font-semibold text-gray-500'}`}>
            {t('nav.shop')}
          </span>
        </button>

        {/* Saved / Wishlist */}
        <button
          onClick={() => {
            setActiveTab('wishlist');
            onOpenWishlist();
          }}
          className="flex min-h-10 min-w-[52px] flex-col items-center justify-center relative group px-1.5 py-0.5 active:scale-95 transition-transform"
        >
          <div className="relative">
            <Heart className={`w-[18px] h-[18px] transition-colors ${activeTab === 'wishlist' ? 'text-[#D9232D]' : 'text-gray-400 group-hover:text-gray-600'}`} />
            {wishlistCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-gray-900 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white"
              >
                {wishlistCount}
              </motion.span>
            )}
          </div>
          <span className={`text-[10px] mt-0.5 ${activeTab === 'wishlist' ? 'font-bold text-[#D9232D]' : 'font-semibold text-gray-500'}`}>
            {t('nav.saved')}
          </span>
        </button>

        {/* Account Screen */}
        <button
          onClick={() => {
            setActiveTab('account');
            onOpenAccount();
          }}
          className="flex min-h-10 min-w-[52px] flex-col items-center justify-center group px-1.5 py-0.5 active:scale-95 transition-transform"
        >
          <User className={`w-[18px] h-[18px] transition-colors ${activeTab === 'account' ? 'text-[#D9232D]' : 'text-gray-400 group-hover:text-gray-600'}`} />
          <span className={`text-[10px] mt-0.5 ${activeTab === 'account' ? 'font-bold text-[#D9232D]' : 'font-semibold text-gray-500'}`}>
            {t('nav.account')}
          </span>
        </button>
      </div>
    </nav>
  );
};
