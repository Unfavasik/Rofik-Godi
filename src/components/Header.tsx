import React, { useRef } from 'react';
import { ShoppingBag, Search, X, Sparkles, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { getInitials } from '../lib/profileValidation';

interface HeaderProps {
  cartCount: number;
  notificationCount?: number;
  wishlistCount?: number;
  onOpenCart: () => void;
  onOpenWishlist?: () => void;
  onOpenStoreInfo?: () => void;
  onOpenAccount?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  currentUser?: UserProfile;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  isMobileFrameMode?: boolean;
  setIsMobileFrameMode?: (val: boolean) => void;
  hideSearchInput?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  notificationCount = 0,
  onOpenCart,
  onOpenAccount,
  onOpenSearch,
  onOpenNotifications,
  currentUser,
  searchQuery = '',
  setSearchQuery,
  hideSearchInput = false,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className="w-full flex flex-col bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_6px_rgba(0,0,0,0.03)] sticky top-0 z-40 transition-all">
      {/* Top Main Bar */}
      <div className="flex min-w-0 items-center justify-between gap-2 bg-white px-3 pt-3 pb-2 sm:px-4">
        {/* Left: User Avatar & Welcome greeting */}
        <button
          type="button"
          onClick={onOpenAccount}
          aria-label={`Open account profile for ${currentUser?.name || 'Rider'}`}
          className="flex min-h-11 min-w-0 max-w-[calc(100%-6.75rem)] items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs group-hover:border-[#D9232D]/40 transition-all overflow-hidden relative">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt={`${currentUser.name || 'Rider'} profile photo`} className="w-full h-full object-cover" />
            ) : (
              <span aria-hidden="true" className="text-xs font-black text-[#D9232D]">{getInitials(currentUser?.name || '')}</span>
            )}
            {currentUser?.isGuest && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-400 border border-white rounded-full" title="Guest Mode" />
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none flex items-center gap-1">
              {greeting}
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            </span>
            <h1 className="truncate text-[15px] font-black tracking-tight flex items-center leading-tight mt-0.5 text-slate-900 group-hover:text-[#D9232D] transition-colors">
              {currentUser?.isGuest ? 'Guest' : currentUser?.name?.trim() || 'Rider'}
            </h1>
          </div>
        </button>

        {/* Right: Actions (Search & Cart) - Location removed as requested */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={onOpenNotifications}
              aria-label="Notifications"
              className="relative w-11 h-11 rounded-full bg-white hover:bg-red-50 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-800 active:scale-95 transition-all"
              title="Notifications"
            >
              <Bell className="w-[18px] h-[18px] text-slate-900" />
              {notificationCount > 0 && <span aria-label={`${notificationCount} unread notifications`} className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-[#D9232D] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{notificationCount > 9 ? '9+' : notificationCount}</span>}
            </button>

          </div>

          {/* Cart Button with Count Badge */}
          <button
            onClick={onOpenCart}
            aria-label="Cart"
            className="relative w-11 h-11 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-800 active:scale-95 transition-all"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 text-slate-900" />
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-[#D9232D] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs"
              >
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* Instant Search Bar */}
      {setSearchQuery && !hideSearchInput && (
        <div className="px-3 pb-2.5 bg-white sm:px-4">
          <div className="relative flex min-w-0 items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (onOpenSearch) onOpenSearch();
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bike, toto seat covers, gel cushions..."
              className="min-h-11 w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-[#D9232D] rounded-xl pl-9 pr-11 py-2 text-base sm:text-[13px] font-medium text-slate-900 placeholder:text-gray-400 focus:outline-hidden transition-all shadow-2xs cursor-pointer"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-1 flex h-9 w-9 items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-slate-200/60 transition-all"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </header>
  );
};
