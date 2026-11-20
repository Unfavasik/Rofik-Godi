import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Globe, Bell, Tag, Truck, MessageCircle, Package, Heart, ShieldCheck, Share2, Search, ChevronDown, ShoppingBag, MapPin, CreditCard, Wrench, HelpCircle, Clock3, Phone, CheckCircle2, Trash2, Sparkles, ExternalLink, Layers3, Award } from 'lucide-react';
import { PrivacyPolicyView } from './PrivacyPolicyView';
import { TermsConditionsView } from './TermsConditionsView';
import { PersonalDataView } from './PersonalDataView';
import { loadCustomerCouponOffers, type CustomerCouponOffer } from '../lib/supabaseCoupons';
import { CouponDetailsView } from './CouponDetailsView';
import { WORKSHOP_INFO } from '../data/products';
import { readCustomerAppPreferences, saveCustomerAppPreferences, type CustomerNotificationPreferences, type PreferredLanguage } from '../lib/customerPreferences';
import { translate, useI18n } from '../lib/i18n';
import type { SettingsSectionRoute } from '../lib/appRoutes';
import { AccountDeletionView } from './AccountDeletionView';
import { SettingsCouponsSkeleton, SettingsPageSkeleton } from './AccountPageSkeleton';
import { readSwrCache, writeSwrCache } from '../lib/swrCache';

interface SettingsViewProps {
  onBack: () => void;
  onLogout?: () => void | Promise<void>;
  onOpenOrders?: () => void;
  onOpenSupportRequests?: (requestId?: string) => void;
  onOpenContactSupport?: () => void;
  currentUserId?: string;
  onOpenWishlist?: () => void;
  onOpenStoreInfo?: () => void;
  onOpenShop?: () => void;
  onOpenPrivacyPage?: () => void;
  onOpenTermsPage?: () => void;
  onOpenPersonalData?: () => void;
  /** Active settings sub-section, driven by the router (/settings/notifications, /settings/app, ...). */
  activeSection?: SettingsSectionRoute | null;
  /** Navigate to a settings sub-section route. Falls back to local state when omitted. */
  onOpenSection?: (section: SettingsSectionRoute) => void;
  /** Return from a sub-section to the /settings hub. */
  onCloseSection?: () => void;
  isAuthenticated: boolean;
  isLoading?: boolean;
  pwaInstallCard?: React.ReactNode;
}

const ChevronRight = () => (
  <svg className="w-4 h-4 text-slate-400 stroke-[2.5] transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-[#D9232D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BackArrow = () => (
  <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface SettingsRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  badge?: string;
  onClick: () => void;
  danger?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon, iconBg, title, subtitle, badge, onClick, danger }) => (
  <button
    onClick={onClick}
    type="button"
    className={`group/row w-full flex items-center justify-between p-2.5 sm:p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-[0_6px_18px_-12px_rgba(15,23,42,0.06)] border border-slate-200/80 hover:border-rose-200/80 hover:bg-white active:scale-[0.99] transition-all duration-150 text-left ${
      danger ? 'hover:bg-rose-50/40 hover:border-rose-200' : ''
    }`}
  >
    <div className="flex items-center space-x-3 min-w-0 pr-2">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-inset ring-black/[0.04] transition-transform group-hover/row:scale-105 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h2 className={`text-[13px] font-extrabold leading-snug truncate ${danger ? 'text-[#D9232D]' : 'text-slate-900'}`}>{title}</h2>
          {badge && (
            <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[9.5px] font-extrabold text-[#D9232D] ring-1 ring-inset ring-rose-200/70">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{subtitle}</p>
      </div>
    </div>
    <ChevronRight />
  </button>
);

const SettingsGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 px-1 pt-0.5">
      <span className="h-1.5 w-1.5 rounded-full bg-[#D9232D]" />
      <h2 className="text-[10.5px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</h2>
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

interface SectionPageProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  onBack: () => void;
  children: React.ReactNode;
}

/** Full-screen shell for routed settings sub-sections, matching the app's Classic Glass page header pattern. */
const SectionPage: React.FC<SectionPageProps> = ({ title, subtitle, eyebrow = 'Settings', onBack, children }) => (
  <div className="w-full max-w-full flex-1 overflow-x-hidden bg-gradient-to-b from-[#F8FAFC] via-[#F5F7FB] to-[#FFF6F7] min-h-full flex flex-col animate-fade-in font-sans">
    <section className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/88 px-4 py-2.5 backdrop-blur-xl shadow-[0_6px_24px_-18px_rgba(15,23,42,0.14)] sm:px-6" data-purpose="page-header">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to settings"
          className="h-11 w-11 rounded-xl border border-slate-200/80 bg-white/90 hover:border-rose-200 hover:bg-rose-50 hover:text-[#D9232D] text-slate-800 flex items-center justify-center shadow-[0_2px_8px_-4px_rgba(15,23,42,0.1)] transition-all active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
          type="button"
        >
          <BackArrow />
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span className="font-bold text-[#D9232D]">Settings</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{eyebrow}</span>
          </p>
          <h1 className="mt-0.5 text-[18px] sm:text-[19px] font-black text-slate-950 tracking-tight leading-tight truncate">{title}</h1>
          <p className="text-[11.5px] text-slate-500 font-medium truncate">{subtitle}</p>
        </div>
      </div>
    </section>
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-4 space-y-3.5 sm:px-6">{children}</div>
  </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  onLogout,
  onOpenOrders,
  onOpenWishlist,
  onOpenContactSupport,
  currentUserId,
  onOpenStoreInfo,
  onOpenShop,
  onOpenPrivacyPage,
  onOpenTermsPage,
  onOpenPersonalData,
  activeSection = null,
  onOpenSection,
  onCloseSection,
  isAuthenticated,
  isLoading = false,
  pwaInstallCard,
}) => {
  const { t } = useI18n();
  const [localSection, setLocalSection] = useState<SettingsSectionRoute | null>(null);
  const section = activeSection ?? localSection;
  const savedHubScrollYRef = useRef<number | null>(null);
  const previousSectionRef = useRef<SettingsSectionRoute | null>(section);

  const openSection = (next: SettingsSectionRoute) => {
    if (!section && typeof window !== 'undefined') {
      savedHubScrollYRef.current = window.scrollY;
    }
    if (onOpenSection) onOpenSection(next);
    else setLocalSection(next);
  };
  const closeSection = () => {
    if (onCloseSection) onCloseSection();
    else setLocalSection(null);
  };

  const [activeDialog, setActiveDialog] = useState<'logout' | 'privacy' | 'terms' | 'personal-data' | null>(null);

  // States for sub-pages
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [selectedCouponOffer, setSelectedCouponOffer] = useState<CustomerCouponOffer | null>(null);
  const [couponOffers, setCouponOffers] = useState<CustomerCouponOffer[]>(
    () => readSwrCache<CustomerCouponOffer[]>('public:customer-coupons') ?? [],
  );
  const [couponOffersLoading, setCouponOffersLoading] = useState(
    () => readSwrCache('public:customer-coupons') === undefined,
  );
  const [couponOffersError, setCouponOffersError] = useState('');
  const preferenceOwnerId = currentUserId || 'guest-user';
  const [notificationState, setNotificationState] = useState<CustomerNotificationPreferences>(() => readCustomerAppPreferences(preferenceOwnerId).notifications);
  const [language, setLanguage] = useState<PreferredLanguage>(() => readCustomerAppPreferences(preferenceOwnerId).language);
  const [hapticFeedback, setHapticFeedback] = useState(() => readCustomerAppPreferences(preferenceOwnerId).hapticFeedback);
  const [settingsNotice, setSettingsNotice] = useState('');
  const [logoutConfirmed, setLogoutConfirmed] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [copyError, setCopyError] = useState('');
  const [faqQuery, setFaqQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    const preferences = readCustomerAppPreferences(preferenceOwnerId);
    setNotificationState(preferences.notifications);
    setLanguage(preferences.language);
    setHapticFeedback(preferences.hapticFeedback);
  }, [preferenceOwnerId]);

  // Start sub-section pages at the top, and restore the exact Settings hub scroll position when returning.
  useLayoutEffect(() => {
    const prev = previousSectionRef.current;
    previousSectionRef.current = section;
    if (typeof window === 'undefined') return;
    if (section && !prev) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }
    if (!section && prev && savedHubScrollYRef.current !== null) {
      const targetY = savedHubScrollYRef.current;
      window.scrollTo({ top: targetY, left: 0, behavior: 'auto' });
      const frame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, left: 0, behavior: 'auto' });
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [section]);

  useEffect(() => {
    if (section !== 'coupons') return;
    let active = true;
    const cached = readSwrCache<CustomerCouponOffer[]>('public:customer-coupons');
    if (cached !== undefined) {
      setCouponOffers(cached);
      setCouponOffersLoading(false);
    } else {
      setCouponOffersLoading(true);
    }
    setCouponOffersError('');
    void loadCustomerCouponOffers().then(({ data, error }) => {
      if (!active) return;
      setCouponOffers(data);
      setCouponOffersError(error);
      if (!error) writeSwrCache('public:customer-coupons', data);
    }).catch(() => {
      if (active && cached === undefined) setCouponOffersError('Offers are temporarily unavailable. Please try again later.');
    }).finally(() => {
      if (active) setCouponOffersLoading(false);
    });
    return () => { active = false; };
  }, [section]);

  if (isLoading) {
    return <SettingsPageSkeleton />;
  }

  const handleCopyCoupon = async (code: string) => {
    setCopyError('');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = document.createElement('textarea');
        input.value = code;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      setCopiedCoupon(code);
      window.setTimeout(() => setCopiedCoupon((current) => current === code ? null : current), 2000);
    } catch {
      setCopiedCoupon(null);
      setCopyError('Could not copy the coupon code. Select the code and copy it manually.');
    }
  };

  const saveNotifications = () => {
    const saved = saveCustomerAppPreferences(preferenceOwnerId, { notifications: notificationState });
    setNotificationState(saved.notifications);
    setSettingsNotice('Notification preferences saved on this device. They control which categories appear in your in-app inbox.');
  };

  const saveAppPreferences = () => {
    const saved = saveCustomerAppPreferences(preferenceOwnerId, { language, hapticFeedback });
    setLanguage(saved.language);
    setHapticFeedback(saved.hapticFeedback);
    setSettingsNotice(translate(saved.language, saved.language === 'hi' ? 'settings.hindiHint' : 'settings.banglaHint'));
  };

  const handleShareApp = async () => {
    const shareUrl = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Rofik Godi Centre', text: 'Premium seat covers for bikes and totos', url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setSettingsNotice('App link copied. Share it with your friends!');
    } catch {
      // User closed the share sheet or the clipboard is unavailable; nothing to show.
    }
  };

  const couponBenefit = (offer: CustomerCouponOffer) => offer.discount_type === 'PERCENTAGE'
    ? `${offer.discount_value}% off${offer.max_discount ? ` · up to ₹${offer.max_discount}` : ''}`
    : `₹${offer.discount_value} off`;
  const couponDetails = (offer: CustomerCouponOffer) => {
    const parts = [offer.description?.trim() || ''];
    if (offer.minimum_order_value > 0) parts.push(`Minimum order ₹${offer.minimum_order_value}`);
    if (offer.apply_to === 'SELECTED_PRODUCTS' && offer.product_names.length) parts.push(`Selected products: ${offer.product_names.join(', ')}`);
    else if (offer.apply_to === 'SELECTED_CATEGORIES' && offer.category_keys.length) parts.push(`Categories: ${offer.category_keys.join(', ')}`);
    else if (offer.apply_to === 'ALL_PRODUCTS') parts.push('Valid on all products');
    if (offer.eligibility === 'FIRST_ORDER') parts.push('First order only');
    if (offer.eligibility === 'EXISTING_CUSTOMERS') parts.push('Returning customers');
    return parts.filter(Boolean).join(' · ');
  };

  const enabledNotificationsCount = Object.values(notificationState).filter(Boolean).length;
  const languageLabel = language === 'bn' ? 'বাংলা' : language === 'hi' ? 'हिन्दी' : 'English';

  /* ------------------------------ Section pages ------------------------------ */

  if (section === 'notifications') {
    return (
      <SectionPage title={t('settings.notifications')} subtitle="Choose what appears in your in-app inbox" eyebrow="Inbox & Alerts" onBack={closeSection}>
        {settingsNotice && <p role="status" className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-[11px] font-bold leading-relaxed text-emerald-800">{settingsNotice}</p>}
        <div className="space-y-2">
          {[
            { key: 'offers', label: 'Festival Discounts & Coupons', desc: 'Alerts about seasonal flash sales & discounts', icon: <Tag className="h-4 w-4 fill-current text-[#E51E2B]" />, tone: 'bg-red-50' },
            { key: 'orderUpdates', label: 'Order Status & Tracking', desc: 'Realtime updates when stitching starts or completes', icon: <Truck className="h-4 w-4 text-[#E51E2B]" />, tone: 'bg-rose-50' },
            { key: 'workshopAlerts', label: 'Support & Workshop Replies', desc: 'Responses to your support requests', icon: <MessageCircle className="h-4 w-4 text-[#E51E2B]" />, tone: 'bg-rose-50' },
            { key: 'systemUpdates', label: 'Product & Account Updates', desc: 'New products, profile and service notices', icon: <Package className="h-4 w-4 text-purple-600" />, tone: 'bg-purple-50' },
          ].map((item) => {
            const checked = notificationState[item.key as keyof typeof notificationState];
            return (
              <div key={item.key} className="flex justify-between items-center p-3 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/80 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.06)] transition hover:border-rose-200/80">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/[0.04] ${item.tone}`}>{item.icon}</div>
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <div className="text-[12.5px] font-extrabold text-slate-900 truncate">{item.label}</div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase ${checked ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70' : 'bg-slate-100 text-slate-500'}`}>
                        {checked ? 'Active' : 'Muted'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label={item.label}
                  aria-checked={checked}
                  onClick={() => setNotificationState({ ...notificationState, [item.key]: !checked })}
                  className={`relative ml-2.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#E51E2B]' : 'bg-slate-200'}`}
                >
                  <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[10.5px] leading-relaxed text-slate-500 px-1">These preferences filter your in-app inbox, unread badge, and push notifications. WhatsApp delivery is not affected.</p>

        <button
          onClick={saveNotifications}
          className="w-full min-h-11 py-2.5 bg-gradient-to-r from-[#D9232D] to-[#B91822] text-white text-xs font-black rounded-xl shadow-md shadow-red-600/20 hover:brightness-105 active:scale-[0.99] transition-all"
        >
          Save Preferences
        </button>
      </SectionPage>
    );
  }

  if (section === 'app') {
    return (
      <SectionPage title={t('settings.appPreferences')} subtitle={t('settings.appSettingsHint')} eyebrow="Language & Haptics" onBack={closeSection}>
        {settingsNotice && <p role="status" className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-[11px] font-bold leading-relaxed text-emerald-800">{settingsNotice}</p>}

        <div className="p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.06)] space-y-2.5">
          <label className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Globe className="w-3.5 h-3.5" />
            </span>
            <span>{t('settings.language')}</span>
          </label>
          <div className="flex flex-wrap gap-2 sm:grid sm:grid-cols-3">
            {[
              { id: 'en', label: 'English' },
              { id: 'bn', label: 'বাংলা' },
              { id: 'hi', label: 'हिन्दी' },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id as PreferredLanguage)}
                className={`min-h-10 min-w-[88px] flex-1 py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 ${
                  language === l.id
                    ? 'border-[#D9232D] bg-gradient-to-br from-[#FFF1F2] to-[#FFE4E6] text-[#D9232D] shadow-2xs'
                    : 'border-slate-200/80 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{l.label}</span>
                {language === l.id && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>
          <p className="text-[10.5px] leading-relaxed text-slate-500">{language === 'hi' ? t('settings.hindiHint') : t('settings.banglaHint')}</p>
        </div>

        <label className="flex items-center justify-between p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.06)] text-xs font-extrabold text-slate-800 cursor-pointer">
          <span className="pr-3">
            <span className="block text-[12.5px]">{t('settings.haptic')}</span>
            <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{t('settings.hapticHint')}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={t('settings.haptic')}
            checked={hapticFeedback}
            onChange={(event) => setHapticFeedback(event.target.checked)}
            className="h-5 w-5 cursor-pointer rounded accent-[#D9232D] text-[#D9232D] focus:ring-[#D9232D]"
          />
        </label>

        <button
          onClick={saveAppPreferences}
          className="w-full min-h-11 py-2.5 bg-gradient-to-r from-[#D9232D] to-[#B91822] text-white text-xs font-black rounded-xl shadow-md shadow-red-600/20 hover:brightness-105 active:scale-[0.99] transition-all"
        >
          {t('settings.savePreferences')}
        </button>
      </SectionPage>
    );
  }

  if (section === 'delete-account') {
    return (
      <AccountDeletionView
        onBack={closeSection}
        isAuthenticated={isAuthenticated}
        onOpenContactSupport={onOpenContactSupport}
        onOpenNotificationSettings={() => openSection('notifications')}
        onOpenPrivacyPage={onOpenPrivacyPage}
        onOpenOrders={onOpenOrders}
      />
    );
  }

  if (section === 'coupons') {
    if (selectedCouponOffer) {
      return (
        <CouponDetailsView
          offer={selectedCouponOffer}
          onBack={() => setSelectedCouponOffer(null)}
          onShopNow={() => {
            setSelectedCouponOffer(null);
            closeSection();
            onOpenShop?.();
          }}
        />
      );
    }
    return (
      <SectionPage title={t('settings.coupons')} subtitle="Tap an offer for details or copy its code" eyebrow="Exclusive Rewards" onBack={closeSection}>
        {couponOffersLoading ? <SettingsCouponsSkeleton />
          : couponOffersError ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800">{couponOffersError}</p>
          : couponOffers.length === 0 ? <div className="rounded-2xl border border-slate-200/80 bg-white/95 py-8 px-4 text-center shadow-2xs"><div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#D9232D]"><Tag className="h-4.5 w-4.5" /></div><p className="text-xs font-bold text-slate-600">No active coupon offers right now. Please check back later.</p></div>
          : couponOffers.map((offer) => (
            <div key={offer.code} className="relative overflow-hidden rounded-xl border border-rose-200/80 bg-gradient-to-r from-[#FFF5F5] via-white to-[#FFF7ED] p-3 shadow-[0_8px_20px_-14px_rgba(217,35,45,0.12)] transition hover:border-rose-300">
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
                <button type="button" onClick={() => setSelectedCouponOffer(offer)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] focus-visible:ring-offset-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md border border-dashed border-rose-300 bg-rose-50/80 px-2 py-0.5 font-mono text-[13px] font-black tracking-wider text-[#D9232D]">{offer.code}</span>
                    <span className="rounded-full bg-[#D9232D] px-2 py-0.5 text-[9.5px] font-extrabold text-white shadow-2xs">{couponBenefit(offer)}</span>
                  </div>
                  <p className="mt-1 break-words text-[11px] font-medium text-slate-600">{couponDetails(offer)}</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-400">Valid until {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(offer.expires_at))}</p>
                </button>
                <button type="button" onClick={() => handleCopyCoupon(offer.code)} className={`min-h-10 shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all active:scale-95 ${copiedCoupon === offer.code ? 'bg-emerald-600 text-white shadow-xs' : 'border border-slate-200 bg-white text-slate-900 shadow-2xs hover:border-[#D9232D] hover:text-[#D9232D]'}`}>
                  {copiedCoupon === offer.code ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        {copyError && <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">{copyError}</p>}
      </SectionPage>
    );
  }

  if (section === 'reviews') {
    return (
      <SectionPage title={t('settings.reviews')} subtitle="Help other riders with your feedback" eyebrow="Verified Reviews" onBack={closeSection}>
        <div className="space-y-3 py-5 text-center bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.07)] p-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 ring-1 ring-inset ring-amber-200/70">
            <Star className="h-6 w-6 fill-current" />
          </div>
          <h2 className="text-[15px] font-black text-slate-900">Verified product reviews</h2>
          <p className="text-xs leading-relaxed text-slate-500 max-w-[300px] mx-auto">Reviews are tied to products in a completed order. Open your order history to choose a purchased product and submit a verified review.</p>
          <button
            type="button"
            onClick={() => onOpenOrders?.()}
            className="w-full min-h-11 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] py-2.5 text-xs font-black text-white shadow-md shadow-red-600/20 transition-all hover:brightness-105"
          >
            {isAuthenticated ? 'Open order history' : 'Sign in to review a purchase'}
          </button>
        </div>
      </SectionPage>
    );
  }

  if (section === 'about') {
    const workshopYears = Math.max(18, new Date().getFullYear() - 2007);
    const telHref = `tel:${WORKSHOP_INFO.phone.replace(/[^+\d]/g, '')}`;
    const whatsappHref = `https://wa.me/${WORKSHOP_INFO.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hello Rofik Godi Centre, I would like to ask about seat covers and fitment.')}`;

    const craftPillars = [
      {
        icon: Layers3,
        title: 'Automotive-Grade Rexine',
        detail: 'Weather-resistant materials selected to hold grip and color through heat and monsoon rain.',
      },
      {
        icon: Award,
        title: 'High-Tensile Precision Stitching',
        detail: 'Reinforced seams and neat piping built for daily commuting and commercial Toto routes.',
      },
      {
        icon: ShieldCheck,
        title: 'Comfort-Tuned Foam & On-Spot Fitment',
        detail: 'Density options tailored to your seat shape with complimentary workshop installation.',
      },
    ];

    return (
      <SectionPage title={t('settings.about')} subtitle="The craft and people behind your ride comfort" eyebrow="Our Workshop" onBack={closeSection}>
        {/* Editorial Workshop Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-[#141D33] shadow-[0_18px_40px_-22px_rgba(15,23,42,0.5)]">
          <img
            src="/images/rofik-godi-store.webp"
            alt="Rofik Godi Centre workshop in Berhampore"
            className="h-48 w-full object-cover opacity-80 sm:h-56"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/95 via-[#0F172A]/45 to-transparent" />
          <div className="absolute inset-x-4 bottom-4 flex items-end gap-3.5 text-white sm:inset-x-5 sm:bottom-5">
            <img
              src="/images/rofik-center-splash.webp"
              alt="Rofik Godi Centre emblem"
              className="h-14 w-14 shrink-0 rounded-2xl border border-white/25 object-cover shadow-lg sm:h-16 sm:w-16"
            />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-rose-200/95">
                <span>Est. 2007</span>
                <span aria-hidden="true">·</span>
                <span>Berhampore, Murshidabad</span>
              </p>
              <h2 className="mt-0.5 text-[21px] font-black leading-tight tracking-tight [text-wrap:balance] sm:text-2xl">
                {WORKSHOP_INFO.name}
              </h2>
              <p className="mt-1 text-[12px] leading-snug text-slate-200/90 sm:text-[12.5px]">
                Custom bike, scooter &amp; Toto seat tailoring crafted for everyday Indian roads.
              </p>
            </div>
          </div>
        </section>

        {/* Quiet Quantitative Proof Bar */}
        <section
          aria-label="Workshop highlights"
          className="grid grid-cols-3 divide-x divide-slate-200/80 rounded-2xl border border-slate-200/80 bg-white/95 py-3.5 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.14)] backdrop-blur-md"
        >
          <div className="px-3 text-center">
            <p className="text-[19px] font-black tracking-tight text-[#D9232D] tabular-nums sm:text-xl">4.8 / 5</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Rider rating</p>
          </div>
          <div className="px-3 text-center">
            <p className="text-[19px] font-black tracking-tight text-slate-950 tabular-nums sm:text-xl">{workshopYears}+ yrs</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Craft since 2007</p>
          </div>
          <div className="px-3 text-center">
            <p className="text-[19px] font-black tracking-tight text-slate-950 tabular-nums sm:text-xl">{WORKSHOP_INFO.services.length}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Core services</p>
          </div>
        </section>

        {/* Story & Craft Standards */}
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.14)] backdrop-blur-md sm:p-5">
          <div className="space-y-2">
            <h2 className="text-[15px] font-black tracking-tight text-slate-950 sm:text-[16px]">
              Local craftsmanship, built for everyday riding
            </h2>
            <p className="text-[13px] leading-[1.65] text-slate-600 sm:text-[13.5px]">
              At <strong className="font-bold text-slate-900">{WORKSHOP_INFO.name}</strong>, we design and stitch durable, comfortable seat covers and custom seat upgrades for motorcycles, scooters, and Toto e-rickshaws across Murshidabad.
            </p>
            <p className="text-[13px] leading-[1.65] text-slate-600 sm:text-[13.5px]">
              From a quick same-day fitment to custom piping, foam reinforcement, and personalized machine embroidery, every cover is cut and finished hands-on at our Berhampore workshop.
            </p>
          </div>

          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-1">
            {craftPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="flex items-start gap-3 py-3 last:pb-0.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#D9232D] ring-1 ring-inset ring-rose-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-extrabold text-slate-900">{pillar.title}</h3>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{pillar.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Numbered Workshop Services */}
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.14)] backdrop-blur-md sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#D9232D] ring-1 ring-inset ring-rose-100">
              <Wrench className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-black text-slate-950">What we do at the workshop</h2>
              <p className="text-[11.5px] font-medium text-slate-500">Tailoring and on-spot installation for your vehicle</p>
            </div>
          </div>
          <ol className="mt-3.5 divide-y divide-slate-100 border-t border-slate-100">
            {WORKSHOP_INFO.services.map((service, index) => (
              <li key={service} className="flex items-start gap-3 py-2.5 last:pb-0.5">
                <span className="mt-0.5 text-[11.5px] font-black text-[#D9232D] tabular-nums">
                  {String(index + 1).padStart(2, '0')}.
                </span>
                <span className="text-[13px] font-semibold leading-snug text-slate-700">{service}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Visit & Contact Workshop */}
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.14)] backdrop-blur-md sm:p-5">
          <h2 className="text-[15px] font-black text-slate-950">Visit the workshop</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">Drop in for free on-spot seat fitment or custom order pickup</p>

          <div className="mt-3.5 space-y-2.5 text-[12.5px] font-medium text-slate-600">
            <p className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D9232D]" />
              <span className="leading-relaxed">{WORKSHOP_INFO.address}</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Clock3 className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="tabular-nums">{WORKSHOP_INFO.workingHours}</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="tabular-nums">{WORKSHOP_INFO.phone} · {WORKSHOP_INFO.phoneAlt}</span>
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3.5">
            <a
              href={telHref}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-bold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 whitespace-nowrap"
            >
              <Phone className="h-3.5 w-3.5 text-[#D9232D]" />
              <span>Call Workshop</span>
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1F9D55] px-3.5 text-[12px] font-extrabold text-white transition-colors hover:bg-[#178245] whitespace-nowrap"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
              <ExternalLink className="h-3 w-3 opacity-80" />
            </a>
          </div>

          {onOpenStoreInfo && (
            <button
              type="button"
              onClick={() => onOpenStoreInfo()}
              className="banner-cta-shine group/cta mt-2.5 flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] py-2.5 text-[13px] font-extrabold text-white shadow-[0_10px_20px_-12px_rgba(217,35,45,0.6)] transition-all hover:brightness-105 active:scale-[0.99]"
            >
              <MapPin className="h-4 w-4 transition-transform duration-200 group-hover/cta:scale-110" />
              <span>Open store map</span>
            </button>
          )}
        </section>

        {/* Policies & Transparency Quick Links */}
        <section
          aria-label="Workshop policies and legal links"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          <button
            type="button"
            onClick={() => (onOpenPrivacyPage ? onOpenPrivacyPage() : setActiveDialog('privacy'))}
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 text-left text-[12px] font-extrabold text-slate-800 transition-colors hover:border-rose-200 hover:text-[#D9232D]"
          >
            <span>Privacy Policy</span>
            <ChevronRight />
          </button>
          <button
            type="button"
            onClick={() => (onOpenTermsPage ? onOpenTermsPage() : setActiveDialog('terms'))}
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 text-left text-[12px] font-extrabold text-slate-800 transition-colors hover:border-rose-200 hover:text-[#D9232D]"
          >
            <span>Terms &amp; Conditions</span>
            <ChevronRight />
          </button>
          <button
            type="button"
            onClick={() => (onOpenPersonalData ? onOpenPersonalData() : setActiveDialog('personal-data'))}
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 text-left text-[12px] font-extrabold text-slate-800 transition-colors hover:border-rose-200 hover:text-[#D9232D]"
          >
            <span>Personal Data</span>
            <ChevronRight />
          </button>
        </section>
      </SectionPage>
    );
  }

  if (section === 'help') {
    const faqGroups = [
      {
        label: 'Orders & pickup',
        icon: ShoppingBag,
        tone: 'bg-rose-50 text-[#D9232D]',
        items: [
          { q: 'How do I place an order?', a: 'Choose a product, select your vehicle fitment, add any available customization, then add it to your cart and complete checkout.' },
          { q: 'Where can I see my order status?', a: 'Open Account → Order history. Select an order to see its status timeline, payment details, pickup information and invoice.' },
          { q: 'How does store pickup work?', a: 'We prepare your order for pickup at Rofik Godi Centre. Keep your order ID ready and show it to the workshop team when you arrive.' },
        ],
      },
      {
        label: 'Products & fitment',
        icon: Wrench,
        tone: 'bg-violet-50 text-violet-600',
        items: [
          { q: 'How does on-spot fitting work?', a: 'Free on-spot seat fitment is available at our workshop. Contact the team before travelling so we can confirm timing and availability.' },
          { q: 'How do I find the right vehicle model?', a: 'Use Vehicle Fitment Finder on the shop or home page. Select your vehicle category, company and model before choosing a cover.' },
          { q: 'Can I customize piping, stitching or foam?', a: 'Yes. Open Custom Fit to choose colors, piping, stitch patterns and foam options. Custom requests may affect preparation time.' },
          { q: 'Are the covers waterproof?', a: 'Materials and water resistance vary by product. Check the product details for the specific cover, or contact us before ordering.' },
        ],
      },
      {
        label: 'Payment & after-sales',
        icon: CreditCard,
        tone: 'bg-blue-50 text-blue-600',
        items: [
          { q: 'Which payment methods are supported?', a: 'Available payment options are shown during checkout. Your order page also shows the payment method and payment status.' },
          { q: 'Can I change or cancel an order?', a: 'Open the order details as soon as possible. Cancellation or changes depend on the preparation status; contact support for help.' },
          { q: 'How do returns or exchanges work?', a: 'Contact the workshop with your order ID and a description of the issue. We will review product fitment, condition and eligibility before arranging the next step.' },
        ],
      },
      {
        label: 'Store & app',
        icon: MapPin,
        tone: 'bg-emerald-50 text-emerald-600',
        items: [
          { q: 'Where is Rofik Godi Centre?', a: `${WORKSHOP_INFO.address}. We are open ${WORKSHOP_INFO.workingHours}.`, action: 'store' },
          { q: 'How does the store map work?', a: 'Open Store map to see the workshop, check drive, bike or walking time from your location, and start turn-by-turn directions.' },
          { q: 'Why does the app need my location for directions?', a: 'Location is used only to calculate your route, live speed and estimated arrival. You can deny permission and still open the destination in Google Maps.' },
        ],
      },
    ];
    const normalizedQuery = faqQuery.trim().toLowerCase();
    const visibleGroups = faqGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !normalizedQuery || `${item.q} ${item.a}`.toLowerCase().includes(normalizedQuery)),
    })).filter((group) => group.items.length > 0);

    return (
      <SectionPage title={t('settings.help')} subtitle="Answers for shopping, pickup, fitment and support" eyebrow="Help & FAQ" onBack={closeSection}>
        <div className="rounded-2xl bg-gradient-to-br from-[#17223B] to-[#293A63] p-3.5 text-white shadow-[0_8px_20px_rgba(23,34,59,0.18)]">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10"><HelpCircle className="h-5 w-5" /></div>
            <div><p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-blue-200">Rofik Godi Centre</p><h2 className="mt-0.5 text-[15px] font-black">How can we help?</h2><p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">Search answers about your order, vehicle fitment or workshop visit.</p></div>
          </div>
          <label className="mt-3 flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-slate-400 shadow-sm">
            <Search className="h-4 w-4 shrink-0" />
            <input value={faqQuery} onChange={(event) => setFaqQuery(event.target.value)} placeholder="Search help topics" aria-label="Search help topics" className="min-w-0 flex-1 bg-transparent text-base sm:text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400" />
          </label>
        </div>

        {visibleGroups.length ? visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <section key={group.label} className="space-y-1.5">
              <div className="flex items-center gap-2 px-1 pt-1.5"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${group.tone}`}><GroupIcon className="h-3.5 w-3.5" /></span><h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{group.label}</h2></div>
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.06)]">
                {group.items.map((faq, index) => {
                  const faqKey = `${group.label}:${faq.q}`;
                  const isOpen = openFaq === faqKey;
                  return (
                    <div key={faq.q} className={index ? 'border-t border-slate-100' : ''}>
                      <button type="button" onClick={() => setOpenFaq(isOpen ? null : faqKey)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50">
                        <span className="text-[12.5px] font-bold leading-snug text-slate-900">{faq.q}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && <div className="px-3.5 pb-3 text-[11.5px] leading-relaxed text-slate-600"><p>{faq.a}</p>{faq.action === 'store' && onOpenStoreInfo && <button type="button" onClick={onOpenStoreInfo} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">Open store map <MapPin className="h-3 w-3" /></button>}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center"><Search className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-xs font-bold text-slate-700">No matching help topics</p><button type="button" onClick={() => setFaqQuery('')} className="mt-2 text-[11px] font-bold text-[#D9232D] underline">Clear search</button></div>}

        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3.5 text-center"><p className="text-xs font-bold text-slate-800">Still need help?</p><p className="mt-0.5 text-[11px] text-slate-500">Our workshop team can help with a specific order or fitment.</p>{onOpenContactSupport && <button type="button" onClick={() => onOpenContactSupport()} className="banner-cta-shine mt-2.5 rounded-xl bg-[#D9232D] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-red-600/20 transition-all hover:bg-red-700 hover:shadow-md active:scale-[0.98]">Contact support</button>}</div>
      </SectionPage>
    );
  }

  /* -------------------------------- Settings hub ------------------------------- */

  return (
    <div className="w-full max-w-full flex-1 overflow-x-hidden bg-gradient-to-br from-[#F8FAFC] via-[#F4F6FB] to-[#FFF5F6] min-h-full flex flex-col animate-fade-in font-sans">
      {/* BEGIN: NavigationHeader */}
      <section className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 px-3.5 py-2.5 backdrop-blur-md shadow-[0_4px_20px_-10px_rgba(15,23,42,0.05)]" data-purpose="page-header">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              aria-label={t('common.back')}
              className="h-10 w-10 rounded-xl bg-slate-100/90 hover:bg-rose-50 hover:text-[#D9232D] text-slate-800 flex items-center justify-center transition-all active:scale-95 shrink-0"
              type="button"
            >
              <BackArrow />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#D9232D] ring-1 ring-inset ring-rose-100">
                  <Sparkles className="h-2.5 w-2.5" /> Rider Controls
                </span>
              </div>
              <h1 className="mt-0.5 text-[19px] sm:text-[20px] font-black text-slate-900 tracking-tight leading-tight truncate">{t('settings.title')}</h1>
              <p className="text-[11.5px] text-slate-500 font-medium truncate">
                {t('settings.subtitle')}
              </p>
            </div>
          </div>
          <div className="hidden xs:flex flex-col items-end gap-1 shrink-0">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700">
              {languageLabel}
            </span>
          </div>
        </div>
      </section>
      {/* END: NavigationHeader */}

      {pwaInstallCard && <div className="mx-auto w-full max-w-3xl px-3.5 pt-2.5">{pwaInstallCard}</div>}

      {/* BEGIN: SettingsMenuList */}
      <nav aria-label={t('settings.title')} className="mx-auto w-full max-w-3xl flex-1 px-3.5 space-y-4 mt-2.5 pb-8">
        <SettingsGroup label="Preferences">
          <SettingsRow
            onClick={() => openSection('notifications')}
            iconBg="bg-[#FEECEC]"
            icon={<Bell className="w-5 h-5 text-[#EF4444]" />}
            title={t('settings.notifications')}
            subtitle={t('settings.offersUpdates')}
            badge={`${enabledNotificationsCount}/4 on`}
          />
          <SettingsRow
            onClick={() => openSection('app')}
            iconBg="bg-[#F4ECFF]"
            icon={
              <svg className="w-5 h-5 text-[#8B5CF6]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 3.328 1.666 6.27 4.21 8.04.425.297.982.164 1.25-.297a7.518 7.518 0 0 1 1.236-1.512c.563-.526 1.4-.78 2.146-.628.706.143 1.428.217 2.158.217 4.97 0 9-4.03 9-9 0-3.66-2.186-6.81-5.326-8.223A9.704 9.704 0 0 0 12 2.25zM6.75 11.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm3.75-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm4.5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm3.75 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
                  fillRule="evenodd"
                />
              </svg>
            }
            title={t('settings.appSettings')}
            subtitle={t('settings.appSettingsHint')}
            badge={languageLabel}
          />
          <SettingsRow
            onClick={() => void handleShareApp()}
            iconBg="bg-[#EAF2FE]"
            icon={<Share2 className="w-5 h-5 text-[#2563EB]" />}
            title="Invite friends"
            subtitle="Share the app with other riders"
          />
        </SettingsGroup>

        <SettingsGroup label="Offers & activity">
          <SettingsRow
            onClick={() => { setSelectedCouponOffer(null); openSection('coupons'); }}
            iconBg="bg-[#FEECEC]"
            icon={
              <svg className="w-5 h-5 text-[#EF4444]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a1.5 1.5 0 0 0 0-3V6zm5.5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-5.2 2.7a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06l-5 5a.75.75 0 0 1-1.06 0z"
                  fillRule="evenodd"
                />
              </svg>
            }
            title={t('settings.coupons')}
            subtitle={t('settings.saveMore')}
          />
          {onOpenWishlist && (
            <SettingsRow
              onClick={onOpenWishlist}
              iconBg="bg-[#FDECEC]"
              icon={<Heart className="w-5 h-5 text-[#E51E2B]" />}
              title="Wishlist"
              subtitle="Saved seat covers & favorites"
            />
          )}
          <SettingsRow
            onClick={() => {
              if (onOpenOrders) onOpenOrders();
              else openSection('help');
            }}
            iconBg="bg-[#F0EEFF]"
            icon={
              <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title={t('settings.orderHistory')}
            subtitle={t('settings.pastPurchases')}
          />
          <SettingsRow
            onClick={() => openSection('reviews')}
            iconBg="bg-[#FFF6E5]"
            icon={
              <svg className="w-5 h-5 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            }
            title={t('settings.reviews')}
            subtitle={t('settings.reviewPurchases')}
          />
        </SettingsGroup>

        <SettingsGroup label="Workshop & support">
          <SettingsRow
            onClick={() => onOpenContactSupport?.()}
            iconBg="bg-[#EBF5FF]"
            icon={
              <svg className="w-5 h-5 text-[#2563EB]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                  fillRule="evenodd"
                />
              </svg>
            }
            title="Contact Support"
            subtitle="Message the workshop team"
          />
          {onOpenStoreInfo && (
            <SettingsRow
              onClick={onOpenStoreInfo}
              iconBg="bg-[#E8F8F0]"
              icon={
                <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 9l1.5-5.25h15L21 9M3 9v10.5A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5V9M3 9h18M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="Store & Workshop"
              subtitle="Timings, location and store details"
            />
          )}
        </SettingsGroup>

        <SettingsGroup label="Legal & about">
          <SettingsRow
            onClick={() => onOpenPrivacyPage ? onOpenPrivacyPage() : setActiveDialog('privacy')}
            iconBg="bg-[#E8F8F0]"
            icon={
              <svg className="w-5 h-5 text-[#10B981]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M12 2.25c-4.28 0-8 2.053-8 2.053s.25 9.07 8 17.447c7.75-8.377 8-17.447 8-17.447s-3.72-2.053-8-2.053zm3.707 7.957a.75.75 0 0 0-1.06-1.06L10.75 13.043l-1.397-1.396a.75.75 0 1 0-1.06 1.06l1.927 1.927a.75.75 0 0 0 1.06 0l4.427-4.427z"
                  fillRule="evenodd"
                />
              </svg>
            }
            title={t('settings.privacy')}
            subtitle={t('settings.dataSecurity')}
          />
          <SettingsRow
            onClick={() => onOpenTermsPage ? onOpenTermsPage() : setActiveDialog('terms')}
            iconBg="bg-[#EBF5FF]"
            icon={
              <svg className="w-5 h-5 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875H18a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 18 22.125H6a2.25 2.25 0 0 1-2.25-2.25V3.75A2.25 2.25 0 0 1 5.625 1.5zm3.75 12a.75.75 0 0 0 0 1.5h6.75a.75.75 0 0 0 0-1.5H9.375zm0 3.75a.75.75 0 0 0 0 1.5h6.75a.75.75 0 0 0 0-1.5H9.375zm0-7.5a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3z"
                  fillRule="evenodd"
                />
              </svg>
            }
            title={t('settings.terms')}
            subtitle={t('settings.appRules')}
          />
          <SettingsRow
            onClick={() => (onOpenPersonalData ? onOpenPersonalData() : setActiveDialog('personal-data'))}
            iconBg="bg-[#F4ECFF]"
            icon={<ShieldCheck className="w-5 h-5 text-[#7C3AED]" />}
            title="Personal Data"
            subtitle="How your data is processed"
          />
          <SettingsRow
            onClick={() => openSection('about')}
            iconBg="bg-[#EBF5FF]"
            icon={
              <svg className="w-5 h-5 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022zM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"
                  fillRule="evenodd"
                />
              </svg>
            }
            title={t('settings.about')}
            subtitle={t('settings.ourStory')}
          />
          <SettingsRow
            onClick={() => openSection('help')}
            iconBg="bg-[#FEECEC]"
            icon={
              <svg className="w-5 h-5 text-[#EF4444]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M9.879 9.879a3 3 0 114.242 2.828c-.566.377-.871.868-.871 1.543V15m0 3h.01" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title={t('settings.help')}
            subtitle="Common questions"
          />
        </SettingsGroup>

        <SettingsGroup label="Session">
          <SettingsRow
            danger
            onClick={() => openSection('delete-account')}
            iconBg="bg-[#FFF1F2]"
            icon={<Trash2 className="w-5 h-5 text-[#D9232D]" />}
            title="Delete account"
            subtitle="Schedule deletion with a 7-day grace period"
          />
          <SettingsRow
            danger
            onClick={() => {
              setLogoutConfirmed(false);
              setLogoutError('');
              setActiveDialog('logout');
            }}
            iconBg="bg-[#FEECEC]"
            icon={
              <svg className="w-5 h-5 text-[#EF4444]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Logout"
            subtitle="Sign out from your account"
          />
        </SettingsGroup>
      </nav>
      {/* END: SettingsMenuList */}

      <p className="pb-5 text-center text-[10px] font-medium text-gray-400">Rofik Godi Centre • App version 1.0.0</p>

      {settingsNotice && <p role="status" className="mx-auto w-full max-w-3xl px-3.5 mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-emerald-800">{settingsNotice}</p>}

      {/* --- DIALOGS (logout confirmation + offline privacy/terms fallback) --- */}

      <AnimatePresence>
        {activeDialog === 'privacy' && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#F8FAFC]"
          >
            <PrivacyPolicyView
              onBack={() => setActiveDialog(null)}
              onOpenStoreInfo={onOpenStoreInfo}
              onOpenTerms={() => (onOpenTermsPage ? onOpenTermsPage() : setActiveDialog('terms'))}
              onOpenPersonalData={onOpenPersonalData}
              onOpenDeleteAccount={() => {
                setActiveDialog(null);
                openSection('delete-account');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDialog === 'terms' && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#F8FAFC]"
          >
            <TermsConditionsView
              onBack={() => setActiveDialog(null)}
              onOpenStoreInfo={onOpenStoreInfo}
              onOpenPrivacy={() => (onOpenPrivacyPage ? onOpenPrivacyPage() : setActiveDialog('privacy'))}
              onOpenDeleteAccount={() => {
                setActiveDialog(null);
                openSection('delete-account');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDialog === 'personal-data' && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#F8FAFC]"
          >
            <PersonalDataView
              onBack={() => setActiveDialog(null)}
              onOpenStoreInfo={onOpenStoreInfo}
              onOpenPrivacy={() => (onOpenPrivacyPage ? onOpenPrivacyPage() : setActiveDialog('privacy'))}
              onOpenTerms={() => (onOpenTermsPage ? onOpenTermsPage() : setActiveDialog('terms'))}
              onOpenDeleteAccount={() => {
                setActiveDialog(null);
                openSection('delete-account');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDialog === 'logout' && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveDialog(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative z-10 w-full max-w-full sm:max-w-[360px] overflow-x-hidden rounded-t-2xl sm:rounded-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl space-y-3.5 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#FEECEC] text-[#EF4444] mx-auto flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div>
                <h3 className="text-[15px] font-bold text-gray-900">Sign out of account?</h3>
                <p className="text-xs text-gray-500 mt-1">You'll need to sign in again to access your account.</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => setActiveDialog(null)}
                  className="min-h-11 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  disabled={logoutConfirmed}
                  onClick={async () => {
                    if (!onLogout) {
                      setLogoutError('Logout is unavailable right now. Please try again.');
                      return;
                    }
                    setLogoutConfirmed(true);
                    setLogoutError('');
                    try {
                      await onLogout();
                    } catch {
                      setLogoutConfirmed(false);
                      setLogoutError('Could not sign out. Please try again.');
                    }
                  }}
                  className="min-h-11 py-2.5 bg-[#EF4444] text-white text-xs font-bold rounded-xl"
                >
                  {logoutConfirmed ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
              {logoutError && <p role="alert" className="text-xs font-semibold text-red-600">{logoutError}</p>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
