import React, { useRef, useState } from 'react';
import { ShoppingBag, Search, X, User, Sparkles, Bell, Truck, Tag, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface HeaderProps {
  cartCount: number;
  wishlistCount?: number;
  onOpenCart: () => void;
  onOpenWishlist?: () => void;
  onOpenStoreInfo?: () => void;
  onOpenAccount?: () => void;
  onOpenSearch?: () => void;
  currentUser?: UserProfile;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  isMobileFrameMode?: boolean;
  setIsMobileFrameMode?: (val: boolean) => void;
  hideSearchInput?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  onOpenAccount,
  onOpenSearch,
  currentUser,
  searchQuery = '',
  setSearchQuery,
  hideSearchInput = false,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="w-full flex flex-col bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_6px_rgba(0,0,0,0.03)] sticky top-0 z-40 transition-all">
      {/* Top Main Bar */}
      <div className="px-4 pt-3 pb-2 flex justify-between items-center bg-white min-h-[52px]">
        {/* Left: User Avatar & Welcome greeting */}
        <div 
          onClick={onOpenAccount}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs group-hover:border-[#D9232D]/40 transition-all overflow-hidden relative">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="User" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-slate-600 group-hover:text-[#D9232D] transition-colors" />
            )}
            {currentUser?.isGuest && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-400 border border-white rounded-full" title="Guest Mode" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none flex items-center gap-1">
              Welcome {currentUser?.isGuest ? 'Guest' : ''}
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            </span>
            <h1 className="text-[15px] font-black tracking-tight flex items-center leading-tight mt-0.5 text-slate-900 group-hover:text-[#D9232D] transition-colors">
              <span>ROFIK</span>
              <span className="text-[#D9232D] ml-1">GODI</span>
            </h1>
          </div>
        </div>

        {/* Right: Actions (Search & Cart) - Location removed as requested */}
        <div className="flex items-center gap-2">
          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen((open) => !open)}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              className="relative w-9 h-9 rounded-full bg-white hover:bg-red-50 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-800 active:scale-95 transition-all"
              title="Notifications"
            >
              <Bell className="w-[18px] h-[18px] text-slate-900" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D9232D] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">3</span>
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-11 w-[290px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
                <div className="flex items-center justify-between px-1 pb-2">
                  <h2 className="text-sm font-black text-slate-900">Notifications</h2>
                  <span className="text-[10px] font-bold text-[#D9232D]">3 new</span>
                </div>
                <div className="space-y-1">
                  <div className="flex gap-2 rounded-xl bg-red-50 p-2.5"><Truck className="mt-0.5 h-4 w-4 text-[#D9232D]" /><div><p className="text-xs font-bold">Order shipped</p><p className="text-[10px] text-slate-500">Your order is on the way.</p></div></div>
                  <div className="flex gap-2 rounded-xl p-2.5"><Tag className="mt-0.5 h-4 w-4 text-[#D9232D]" /><div><p className="text-xs font-bold">Special offer</p><p className="text-[10px] text-slate-500">Flat 30% OFF on seat covers.</p></div></div>
                  <div className="flex gap-2 rounded-xl p-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /><div><p className="text-xs font-bold">Order confirmed</p><p className="text-[10px] text-slate-500">We will notify you soon.</p></div></div>
                </div>
                <button onClick={() => setNotificationsOpen(false)} className="mt-2 w-full rounded-xl bg-[#D9232D] py-2 text-xs font-bold text-white">View all notifications</button>
              </div>
            )}
          </div>

          {/* Cart Button with Count Badge */}
          <button
            onClick={onOpenCart}
            aria-label="Cart"
            className="relative w-9 h-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-800 active:scale-95 transition-all"
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
        <div className="px-4 pb-2.5 bg-white">
          <div className="relative flex items-center">
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
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-[#D9232D] rounded-xl pl-9 pr-8 py-2 text-[12.5px] font-medium text-slate-900 placeholder:text-gray-400 focus:outline-hidden transition-all shadow-2xs cursor-pointer"
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
                  className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-slate-200/60 transition-all"
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
