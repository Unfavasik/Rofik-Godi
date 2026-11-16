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
    <header className="w-full flex flex-col bg-[#6B352A] text-[#FFFCF4] border-b border-[#53271E] shadow-[0_4px_18px_rgba(43,22,17,0.14)] sticky top-0 z-40 transition-all">
      {/* Top Main Bar */}
      <div className="flex min-w-0 items-center justify-between gap-2 bg-[#6B352A] px-3 pt-3 pb-2 sm:px-4">
        {/* Left: User Avatar & Welcome greeting */}
        <button
          type="button"
          onClick={onOpenAccount}
          aria-label={`Open account profile for ${currentUser?.name || 'Rider'}`}
          className="flex min-h-11 min-w-0 max-w-[calc(100%-6.75rem)] items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 shrink-0 rounded-full bg-[#FFF8D6] border border-[#FFF1A6]/60 flex items-center justify-center text-[#6B352A] shadow-2xs group-hover:border-[#FFF1A6] transition-all overflow-hidden relative">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={`${currentUser.name || 'Rider'} profile photo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span aria-hidden="true" className="text-xs font-black text-[#6B352A]">
                {getInitials(currentUser?.name || '')}
              </span>
            )}
            {currentUser?.isGuest && (
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#FFF1A6] border border-[#6B352A] rounded-full"
                title="Guest Mode"
              />
            )}
          </div>
          <div className="min-w-0 flex flex-col text-left">
            <span className="text-[10px] font-bold text-[#FFF1A6] uppercase tracking-wider leading-none flex items-center gap-1">
              {greeting}
              <Sparkles className="w-2.5 h-2.5 text-[#FFF1A6]" />
            </span>
            <h1 className="truncate text-[15px] font-black tracking-tight flex items-center leading-tight mt-0.5 text-[#FFFCF4] group-hover:text-[#FFF1A6] transition-colors">
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
              className="relative w-11 h-11 rounded-full bg-[#53271E]/85 hover:bg-[#421E16] border border-[#FFFCF4]/20 shadow-2xs flex items-center justify-center text-[#FFFCF4] active:scale-95 transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-[18px] h-[18px] text-[#FFFCF4]" />
              {notificationCount > 0 && (
                <span
                  aria-label={`${notificationCount} unread notifications`}
                  className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-[#FFF1A6] text-[#6B352A] text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#6B352A]"
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
            className="relative w-11 h-11 rounded-full bg-[#53271E]/85 hover:bg-[#421E16] border border-[#FFFCF4]/20 shadow-2xs flex items-center justify-center text-[#FFFCF4] active:scale-95 transition-all cursor-pointer"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 text-[#FFFCF4]" />
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6115] text-[#1F0E0A] text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#6B352A] shadow-xs"
              >
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Home Search Trigger with Smooth Vertical-Roll Product Prompt */}
      {setSearchQuery && !hideSearchInput && (
        <div className="px-3 pb-3 bg-[#6B352A] sm:px-4">
          <div className="relative flex min-w-0 items-center">
            <button
              type="button"
              onClick={() => onOpenSearch?.()}
              aria-label={
                hasSearchQuery
                  ? `Search products, current query ${searchQuery}`
                  : `Search products, try ${activePrompt}`
              }
              className={`min-h-11 w-full bg-[#FFFCF4] hover:bg-[#FFFDF8] border border-[#E8D8C4] hover:border-[#FFF1A6] focus-visible:border-[#FFF1A6] focus-visible:ring-2 focus-visible:ring-[#FFF1A6]/40 rounded-xl pl-3.5 ${
                hasSearchQuery ? 'pr-22' : 'pr-12'
              } py-2 flex items-center gap-2 text-left transition-all shadow-xs cursor-pointer focus-visible:outline-hidden`}
            >
              <Search className="w-4 h-4 text-[#6B352A]/75 shrink-0" />
              {hasSearchQuery ? (
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#2B1611]">
                  {searchQuery}
                </span>
              ) : (
                <div className="min-w-0 flex-1 flex items-center gap-1.5 text-[13px] leading-5">
                  <span className="text-[#7A5B52] font-medium shrink-0">Search</span>
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
                        className="block truncate font-semibold text-[#6B352A]"
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
                className="absolute right-10 flex h-9 w-9 items-center justify-center text-[#7A5B52] hover:text-[#6B352A] rounded-full hover:bg-[#FFF1A6]/50 transition-all cursor-pointer"
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
                  ? 'voice-mic-pulse bg-[#6B352A] text-[#FFFCF4] shadow-xs'
                  : 'text-[#6B352A] hover:text-[#53271E] hover:bg-[#FFF1A6]/70'
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
