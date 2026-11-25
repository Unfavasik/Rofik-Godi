import React, { useEffect, useState } from 'react';
import { ShoppingBag, Search, X, Bell, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { getInitials } from '../lib/profileValidation';
import type { PreferredLanguage } from '../lib/customerPreferences';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { saveRecentSearchTerm } from '../lib/voiceSearch';
import { VoiceSearchBanner } from './VoiceSearchBanner';
import { VoiceSearchHint } from './VoiceSearchHint';
import { CartBadge } from './CartBadge';
import topbarVignetteBg from '../assets/images/topbar_vignette_blur_bg_1795611325931.jpg';

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
    <header className="relative isolate w-full flex flex-col overflow-hidden bg-[#090808] shadow-[0_10px_28px_-14px_rgba(9,8,8,0.45)] sticky top-0 z-40 transition-all">
      {/* Heavily Blurred Atmospheric Background Image + Radial & Edge Vignette */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#090808]">
        <img
          src={topbarVignetteBg}
          alt=""
          referrerPolicy="no-referrer"
          decoding="async"
          className="h-full w-full object-cover object-[50%_26%] scale-[1.45] blur-[32px] brightness-[0.9] saturate-[1.2] select-none"
        />
        {/* Radial Vignette Overlay (soft warm glow at top-center, deep charcoal-espresso vignette on corners & edges) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_90%_at_50%_15%,rgba(34,26,20,0.12)_0%,rgba(16,13,11,0.58)_62%,rgba(9,8,8,0.92)_100%)]" />
        {/* Soft Vertical Depth Scrim fading cleanly to #090808 at bottom edge */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/22 via-black/18 via-58% to-[#090808]" />
      </div>

      {/* Top Main Bar */}
      <div className="relative z-10 flex min-w-0 items-center justify-between gap-2 px-3.5 pt-3 pb-2 sm:px-5">
        {/* Left: User Avatar & Welcome greeting */}
        <button
          type="button"
          onClick={onOpenAccount}
          aria-label={`Open account profile for ${currentUser?.name || 'Rider'}`}
          className="flex min-h-10 min-w-0 max-w-[calc(100%-6rem)] items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 shrink-0 rounded-full bg-white/95 border border-white/45 shadow-[0_2px_10px_rgba(0,0,0,0.3)] flex items-center justify-center text-slate-900 group-hover:border-white transition-colors overflow-hidden relative">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={`${currentUser.name || 'Rider'} profile photo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span aria-hidden="true" className="text-[11px] font-extrabold text-[#D9232D]">
                {getInitials(currentUser?.name || '')}
              </span>
            )}
          </div>
          <div className="min-w-0 flex flex-col text-left">
            <span className="text-[11px] font-medium text-white/70 leading-none tracking-[0.01em]">
              {greeting}
            </span>
            <h1 className="truncate text-[14.5px] font-bold tracking-tight flex items-center leading-tight mt-0.5 text-white group-hover:text-rose-200 transition-colors">
              {currentUser?.isGuest ? 'Guest' : currentUser?.name?.trim() || 'Rider'}
            </h1>
          </div>
        </button>

        {/* Right: Frosted Glass Actions (Notifications & Cart) */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label="Notifications"
              className="relative w-9.5 h-9.5 rounded-full bg-white/14 hover:bg-white/22 border border-white/18 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-white" />
              {notificationCount > 0 && (
                <span
                  aria-label={`${notificationCount} unread notifications`}
                  className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-[#D9232D] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#181412] tabular-nums"
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
            className="relative w-9.5 h-9.5 rounded-full bg-white/14 hover:bg-white/22 border border-white/18 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
            <CartBadge
              count={cartCount}
              className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#D9232D] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#181412] shadow-xs tabular-nums"
            />
          </button>
        </div>
      </div>

      {/* Interactive Home Search Trigger with Smooth Vertical-Roll Product Prompt */}
      {setSearchQuery && !hideSearchInput && (
        <div className="relative z-10 px-3.5 pb-3 sm:px-5">
          <div className="relative flex min-w-0 items-center">
            <button
              type="button"
              onClick={() => onOpenSearch?.()}
              aria-label={
                hasSearchQuery
                  ? `Search products, current query ${searchQuery}`
                  : `Search products, try ${activePrompt}`
              }
              className={`min-h-10 w-full bg-white/14 hover:bg-white/20 border border-white/20 hover:border-white/30 focus-visible:border-white/60 focus-visible:ring-2 focus-visible:ring-white/25 backdrop-blur-md rounded-full pl-3.5 ${
                hasSearchQuery ? 'pr-20' : 'pr-11'
              } py-1.5 flex items-center gap-2 text-left transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] cursor-pointer focus-visible:outline-hidden`}
            >
              <Search className="w-3.5 h-3.5 text-white/75 shrink-0" />
              {hasSearchQuery ? (
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-white">
                  {searchQuery}
                </span>
              ) : (
                <div className="min-w-0 flex-1 flex items-center gap-1.5 text-[12.5px] leading-5">
                  <span className="text-white/70 font-medium shrink-0">Search</span>
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
                        className="block truncate font-semibold text-white"
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
                className="absolute right-9.5 flex h-8 w-8 items-center justify-center text-white/75 hover:text-white rounded-full hover:bg-white/15 transition-all cursor-pointer"
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
              className={`absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer ${
                voiceSearch.isListening
                  ? 'voice-mic-pulse bg-[#D9232D] text-white shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/15'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>

          <VoiceSearchHint
            id={voiceHintId}
            visible={showVoiceHint}
            onDismiss={voiceSearch.dismissHint}
            tone="dark"
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
