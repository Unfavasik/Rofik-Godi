import React, { useEffect, useState } from 'react';
import { ShoppingBag, Search, X, Sparkles, Bell, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { getInitials } from '../lib/profileValidation';
import type { PreferredLanguage } from '../lib/customerPreferences';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { saveRecentSearchTerm } from '../lib/voiceSearch';
import { VoiceSearchBanner } from './VoiceSearchBanner';
import { VoiceSearchHint } from './VoiceSearchHint';

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
  searchPromptTerms?: string[];
  language?: PreferredLanguage;
  isMobileFrameMode?: boolean;
  setIsMobileFrameMode?: (val: boolean) => void;
  hideSearchInput?: boolean;
}

const DEFAULT_PROMPT_TERMS = [
  'Bike Seat Cover',
  'Scooty Seat Cover',
  'Toto Seat Cover',
  'Gel Seat Cushion',
];

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
  searchPromptTerms = DEFAULT_PROMPT_TERMS,
  language = 'en',
  hideSearchInput = false,
}) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const promptTerms = searchPromptTerms.length > 0 ? searchPromptTerms : DEFAULT_PROMPT_TERMS;
  const [promptIndex, setPromptIndex] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const voiceSearch = useVoiceSearch({
    language,
    onResult: (transcript) => {
      saveRecentSearchTerm(transcript);
      setSearchQuery?.(transcript);
      onOpenSearch?.();
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setIsReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (promptTerms.length <= 1 || searchQuery.trim() || isReducedMotion) return;
    const timer = window.setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % promptTerms.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [promptTerms.length, searchQuery, isReducedMotion]);

  const activePrompt = promptTerms[promptIndex % promptTerms.length] ?? DEFAULT_PROMPT_TERMS[0]!;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const voiceHintId = 'home-voice-search-hint';
  const showVoiceHint = !voiceSearch.isListening && !voiceSearch.error && !voiceSearch.isHintDismissed;

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
              <img
                src={currentUser.avatar}
                alt={`${currentUser.name || 'Rider'} profile photo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span aria-hidden="true" className="text-xs font-black text-[#D9232D]">
                {getInitials(currentUser?.name || '')}
              </span>
            )}
            {currentUser?.isGuest && (
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-400 border border-white rounded-full"
                title="Guest Mode"
              />
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

        {/* Right: Actions (Notifications & Cart) */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label="Notifications"
              className="relative w-11 h-11 rounded-full bg-white hover:bg-red-50 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-800 active:scale-95 transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-[18px] h-[18px] text-slate-900" />
              {notificationCount > 0 && (
                <span
                  aria-label={`${notificationCount} unread notifications`}
                  className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-[#D9232D] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white"
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Cart"
            className="relative w-11 h-11 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-800 active:scale-95 transition-all cursor-pointer"
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

      {/* Interactive Home Search Trigger with Smooth Vertical-Roll Product Prompt */}
      {setSearchQuery && !hideSearchInput && (
        <div className="px-3 pb-2.5 bg-white sm:px-4">
          <div className="relative flex min-w-0 items-center">
            <button
              type="button"
              onClick={() => onOpenSearch?.()}
              aria-label={
                hasSearchQuery
                  ? `Search products, current query ${searchQuery}`
                  : `Search products, try ${activePrompt}`
              }
              className={`min-h-11 w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 focus-visible:border-[#D9232D] focus-visible:ring-2 focus-visible:ring-[#D9232D]/15 rounded-xl pl-3.5 ${
                hasSearchQuery ? 'pr-22' : 'pr-12'
              } py-2 flex items-center gap-2 text-left transition-all shadow-2xs cursor-pointer focus-visible:outline-hidden`}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              {hasSearchQuery ? (
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900">
                  {searchQuery}
                </span>
              ) : (
                <div className="min-w-0 flex-1 flex items-center gap-1.5 text-[13px] leading-5">
                  <span className="text-slate-500 font-medium shrink-0">Search</span>
                  <div
                    aria-live="off"
                    className="relative h-5 min-w-0 flex-1 overflow-hidden"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={activePrompt}
                        initial={isReducedMotion ? { opacity: 1 } : { y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={isReducedMotion ? { opacity: 0 } : { y: -12, opacity: 0 }}
                        transition={{ duration: isReducedMotion ? 0.01 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="block truncate font-semibold text-slate-700"
                      >
                        &ldquo;{activePrompt}&rdquo;
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </button>

            {hasSearchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                aria-label="Clear search"
                title="Clear search"
                className="absolute right-10 flex h-9 w-9 items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/70 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                voiceSearch.toggleListening();
              }}
              aria-label={voiceSearch.isListening ? 'Stop voice search' : 'Start voice search'}
              aria-pressed={voiceSearch.isListening}
              aria-describedby={showVoiceHint ? voiceHintId : undefined}
              title={
                voiceSearch.isListening
                  ? 'Stop voice search'
                  : voiceSearch.isSupported
                    ? 'Search by voice'
                    : 'Voice search unavailable in this browser'
              }
              className={`absolute right-1 flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                voiceSearch.isListening
                  ? 'voice-mic-pulse bg-[#D9232D] text-white shadow-xs'
                  : 'text-slate-500 hover:text-[#D9232D] hover:bg-rose-50'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <VoiceSearchHint
            id={voiceHintId}
            visible={showVoiceHint}
            onDismiss={voiceSearch.dismissHint}
          />

          <VoiceSearchBanner
            isListening={voiceSearch.isListening}
            interimTranscript={voiceSearch.interimTranscript}
            error={voiceSearch.error}
            onStop={voiceSearch.stopListening}
            onDismissError={voiceSearch.clearError}
          />
        </div>
      )}
    </header>
  );
};
