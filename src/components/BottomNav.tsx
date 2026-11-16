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
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-7xl bg-[#FFFCF4]/95 px-3 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-md border-t border-[#E8D8C4] shadow-[0_-4px_25px_rgba(107,53,42,0.08)] sm:px-6"
      data-purpose="mobile-navbar"
    >
      <div className="flex justify-around items-center gap-1">
        {/* Home */}
        <button
          onClick={() => {
            setActiveTab('home');
            onScrollToTop();
          }}
          className="flex min-h-11 min-w-[52px] flex-col items-center justify-center group px-1.5 py-1 active:scale-95 transition-transform"
        >
          <Home className={`w-5 h-5 transition-colors ${activeTab === 'home' ? 'text-[#6B352A]' : 'text-[#8C6F66] group-hover:text-[#6B352A]'}`} />
          <span className={`text-[10.5px] mt-1 ${activeTab === 'home' ? 'font-bold text-[#6B352A]' : 'font-semibold text-[#7A5B52]'}`}>
            {t('nav.home')}
          </span>
        </button>

        {/* Shop */}
        <button
          onClick={() => {
            setActiveTab('shop');
            onOpenShop();
          }}
          className="flex min-h-11 min-w-[52px] flex-col items-center justify-center group px-1.5 py-1 active:scale-95 transition-transform"
        >
          <ShoppingBag className={`w-5 h-5 transition-colors ${activeTab === 'shop' ? 'text-[#6B352A]' : 'text-[#8C6F66] group-hover:text-[#6B352A]'}`} />
          <span className={`text-[10.5px] mt-1 ${activeTab === 'shop' ? 'font-bold text-[#6B352A]' : 'font-semibold text-[#7A5B52]'}`}>
            {t('nav.shop')}
          </span>
        </button>

        {/* Saved / Wishlist */}
        <button
          onClick={() => {
            setActiveTab('wishlist');
            onOpenWishlist();
          }}
          className="flex min-h-11 min-w-[52px] flex-col items-center justify-center relative group px-1.5 py-1 active:scale-95 transition-transform"
        >
          <div className="relative">
            <Heart className={`w-5 h-5 transition-colors ${activeTab === 'wishlist' ? 'text-[#6B352A]' : 'text-[#8C6F66] group-hover:text-[#6B352A]'}`} />
            {wishlistCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-[#6B352A] text-[#FFFCF4] text-[8.5px] font-bold rounded-full flex items-center justify-center border border-[#FFFCF4]"
              >
                {wishlistCount}
              </motion.span>
            )}
          </div>
          <span className={`text-[10.5px] mt-1 ${activeTab === 'wishlist' ? 'font-bold text-[#6B352A]' : 'font-semibold text-[#7A5B52]'}`}>
            {t('nav.saved')}
          </span>
        </button>

        {/* Account Screen */}
        <button
          onClick={() => {
            setActiveTab('account');
            onOpenAccount();
          }}
          className="flex min-h-11 min-w-[52px] flex-col items-center justify-center group px-1.5 py-1 active:scale-95 transition-transform"
        >
          <User className={`w-5 h-5 transition-colors ${activeTab === 'account' ? 'text-[#6B352A]' : 'text-[#8C6F66] group-hover:text-[#6B352A]'}`} />
          <span className={`text-[10.5px] mt-1 ${activeTab === 'account' ? 'font-bold text-[#6B352A]' : 'font-semibold text-[#7A5B52]'}`}>
            {t('nav.account')}
          </span>
        </button>
      </div>
    </nav>
  );
};
