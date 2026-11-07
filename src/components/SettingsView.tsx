import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Globe, Bell, Tag, Truck, MessageCircle, Package, Heart, ShieldCheck, Share2, Search, ChevronDown, ShoppingBag, MapPin, CreditCard, Wrench, HelpCircle, Clock3, Phone, CheckCircle2, Trash2 } from 'lucide-react';
import { PrivacyPolicyView } from './PrivacyPolicyView';
import { TermsConditionsView } from './TermsConditionsView';
import { loadCustomerCouponOffers, type CustomerCouponOffer } from '../lib/supabaseCoupons';
import { CouponDetailsView } from './CouponDetailsView';
import { WORKSHOP_INFO } from '../data/products';
import { readCustomerAppPreferences, saveCustomerAppPreferences, type CustomerNotificationPreferences, type PreferredLanguage } from '../lib/customerPreferences';
import { translate, useI18n } from '../lib/i18n';
import type { SettingsSectionRoute } from '../lib/appRoutes';
import { AccountDeletionView } from './AccountDeletionView';

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
  pwaInstallCard?: React.ReactNode;
}

const ChevronRight = () => (
  <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BackArrow = () => (
  <svg className="w-6 h-6 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface SettingsRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  danger?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon, iconBg, title, subtitle, onClick, danger }) => (
  <button
    onClick={onClick}
    type="button"
    className={`w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left ${
      danger ? 'hover:bg-red-50/40' : ''
    }`}
  >
    <div className="flex items-center space-x-3.5">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">{title}</h2>
        <p className="text-[12px] text-gray-500 font-normal">{subtitle}</p>
      </div>
    </div>
    <ChevronRight />
  </button>
);

const SettingsGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2.5">
    <h2 className="px-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</h2>
    {children}
  </div>
);

interface SectionPageProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: React.ReactNode;
}

/** Full-screen shell for routed settings sub-sections, matching the app's page header pattern. */
const SectionPage: React.FC<SectionPageProps> = ({ title, subtitle, onBack, children }) => (
  <div className="w-full flex-1 bg-[#F7F8FA] min-h-full flex flex-col animate-fade-in font-sans">
    <section className="px-5 pt-3 pb-3" data-purpose="page-header">
      <div className="flex items-center space-x-3 mb-1">
        <button
          onClick={onBack}
          aria-label="Back to settings"
          className="p-1 -ml-1 text-gray-900 hover:opacity-75 transition-opacity active:scale-95"
          type="button"
        >
          <BackArrow />
        </button>
        <h1 className="text-[25px] font-bold text-gray-900 tracking-tight">{title}</h1>
      </div>
      <p className="text-[13.5px] text-[#64748B] font-normal pl-0.5">{subtitle}</p>
    </section>
    <div className="flex-1 px-4 pb-10 pt-1 space-y-3">{children}</div>
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
  pwaInstallCard,
}) => {
  const { t } = useI18n();
  const [localSection, setLocalSection] = useState<SettingsSectionRoute | null>(null);
  const section = activeSection ?? localSection;
  const openSection = (next: SettingsSectionRoute) => {
    if (onOpenSection) onOpenSection(next);
    else setLocalSection(next);
  };
  const closeSection = () => {
    if (onCloseSection) onCloseSection();
    else setLocalSection(null);
  };

  const [activeDialog, setActiveDialog] = useState<'logout' | 'privacy' | 'terms' | null>(null);

  // States for sub-pages
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [selectedCouponOffer, setSelectedCouponOffer] = useState<CustomerCouponOffer | null>(null);
  const [couponOffers, setCouponOffers] = useState<CustomerCouponOffer[]>([]);
  const [couponOffersLoading, setCouponOffersLoading] = useState(false);
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

  // Section pages replace the hub, so always land at the top of the page.
  useEffect(() => {
    if (section) window.scrollTo({ top: 0 });
  }, [section]);

  useEffect(() => {
    if (section !== 'coupons') return;
    let active = true;
    setCouponOffersLoading(true);
    setCouponOffersError('');
    void loadCustomerCouponOffers().then(({ data, error }) => {
      if (!active) return;
      setCouponOffers(data);
      setCouponOffersError(error);
    }).catch(() => {
      if (active) setCouponOffersError('Offers are temporarily unavailable. Please try again later.');
    }).finally(() => {
      if (active) setCouponOffersLoading(false);
    });
    return () => { active = false; };
  }, [section]);

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

  /* ------------------------------ Section pages ------------------------------ */

  if (section === 'notifications') {
    return (
      <SectionPage title={t('settings.notifications')} subtitle="Choose what appears in your in-app inbox" onBack={closeSection}>
        {settingsNotice && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-emerald-800">{settingsNotice}</p>}
        <div className="space-y-3">
          {[
            { key: 'offers', label: 'Festival Discounts & Coupons', desc: 'Alerts about seasonal flash sales & discounts', icon: <Tag className="h-5 w-5 fill-current text-[#E51E2B]" />, tone: 'bg-red-50' },
            { key: 'orderUpdates', label: 'Order Status & Tracking', desc: 'Realtime updates when stitching starts or completes', icon: <Truck className="h-5 w-5 text-[#E51E2B]" />, tone: 'bg-rose-50' },
            { key: 'workshopAlerts', label: 'Support & Workshop Replies', desc: 'Responses to your support requests', icon: <MessageCircle className="h-5 w-5 text-[#E51E2B]" />, tone: 'bg-rose-50' },
            { key: 'systemUpdates', label: 'Product & Account Updates', desc: 'New products, profile and service notices', icon: <Package className="h-5 w-5 text-purple-600" />, tone: 'bg-purple-50' },
          ].map((item) => (
            <div key={item.key} className="flex justify-between items-center p-3.5 bg-white rounded-2xl border border-gray-100/75 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)]">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>{item.icon}</div>
                <div className="min-w-0 pr-2">
                  <div className="text-[13px] font-bold text-gray-900">{item.label}</div>
                  <div className="text-[11px] text-gray-500">{item.desc}</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-label={item.label}
                aria-checked={notificationState[item.key as keyof typeof notificationState]}
                onClick={() => setNotificationState({ ...notificationState, [item.key]: !notificationState[item.key as keyof typeof notificationState] })}
                className={`relative ml-3 h-6 w-12 shrink-0 rounded-full transition-colors ${notificationState[item.key as keyof typeof notificationState] ? 'bg-[#E51E2B]' : 'bg-gray-200'}`}
              >
                <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${notificationState[item.key as keyof typeof notificationState] ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        <p className="text-[10px] leading-relaxed text-gray-500 px-1">These preferences filter your in-app inbox, unread badge, and push notifications. WhatsApp delivery is not affected.</p>

        <button
          onClick={saveNotifications}
          className="w-full py-3 bg-[#D9232D] text-white text-xs font-bold rounded-2xl shadow-sm hover:bg-red-700 transition-colors"
        >
          Save Preferences
        </button>
      </SectionPage>
    );
  }

  if (section === 'app') {
    return (
      <SectionPage title={t('settings.appPreferences')} subtitle={t('settings.appSettingsHint')} onBack={closeSection}>
        {settingsNotice && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-emerald-800">{settingsNotice}</p>}

        <div className="p-4 bg-white rounded-2xl border border-gray-100/75 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)] space-y-3">
          <label className="text-xs font-bold text-gray-700 block flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('settings.language')}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'en', label: 'English' },
              { id: 'bn', label: 'বাংলা' },
              { id: 'hi', label: 'हिन्दी' },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id as PreferredLanguage)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                  language === l.id ? 'border-[#D9232D] bg-[#FEECEC] text-[#D9232D]' : 'border-gray-200 text-gray-700'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-gray-500">{language === 'hi' ? t('settings.hindiHint') : t('settings.banglaHint')}</p>
        </div>

        <label className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-100/75 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)] text-xs font-semibold text-gray-700">
          <span>
            <span className="block">{t('settings.haptic')}</span>
            <span className="mt-0.5 block text-[10px] font-normal text-gray-500">{t('settings.hapticHint')}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={t('settings.haptic')}
            checked={hapticFeedback}
            onChange={(event) => setHapticFeedback(event.target.checked)}
            className="h-5 w-5 cursor-pointer rounded text-[#D9232D] focus:ring-[#D9232D]"
          />
        </label>

        <button
          onClick={saveAppPreferences}
          className="w-full py-3 bg-[#D9232D] text-white text-xs font-bold rounded-2xl shadow-sm hover:bg-red-700 transition-colors"
        >
          {t('settings.savePreferences')}
        </button>
      </SectionPage>
    );
  }

  if (section === 'delete-account') {
    return <AccountDeletionView onBack={closeSection} isAuthenticated={isAuthenticated} />;
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
      <SectionPage title={t('settings.coupons')} subtitle="Tap an offer for details or copy its code" onBack={closeSection}>
        {couponOffersLoading ? <p className="py-10 text-center text-xs font-semibold text-gray-400">Loading active offers…</p>
          : couponOffersError ? <p role="status" className="rounded-xl bg-amber-50 p-4 text-center text-xs font-semibold text-amber-800">{couponOffersError}</p>
          : couponOffers.length === 0 ? <p className="py-10 text-center text-xs font-semibold text-gray-400">No active coupon offers right now. Please check back later.</p>
          : couponOffers.map((offer) => (
            <div key={offer.code} className="rounded-2xl border border-red-200/70 bg-gradient-to-r from-red-50 to-orange-50 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setSelectedCouponOffer(offer)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] focus-visible:ring-offset-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-black tracking-wide text-[#D9232D]">{offer.code}</span>
                    <span className="rounded bg-[#D9232D] px-1.5 py-0.5 text-[9px] font-extrabold text-white">{couponBenefit(offer)}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-gray-600">{couponDetails(offer)}</p>
                  <p className="mt-1 text-[10px] font-semibold text-gray-400">Valid until {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(offer.expires_at))}</p>
                </button>
                <button type="button" onClick={() => handleCopyCoupon(offer.code)} className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${copiedCoupon === offer.code ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-900 shadow-xs'}`}>
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
      <SectionPage title={t('settings.reviews')} subtitle="Help other riders with your feedback" onBack={closeSection}>
        <div className="space-y-3 py-6 text-center bg-white rounded-2xl border border-gray-100/75 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)] p-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <Star className="h-6 w-6 fill-current" />
          </div>
          <h2 className="text-sm font-bold text-gray-900">Verified product reviews</h2>
          <p className="text-xs leading-relaxed text-gray-500 max-w-[300px] mx-auto">Reviews are tied to products in a completed order. Open your order history to choose a purchased product and submit a verified review.</p>
          <button
            type="button"
            onClick={() => onOpenOrders?.()}
            className="w-full rounded-2xl bg-[#D9232D] py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            {isAuthenticated ? 'Open order history' : 'Sign in to review a purchase'}
          </button>
        </div>
      </SectionPage>
    );
  }

  if (section === 'about') {
    return (
      <SectionPage title={t('settings.about')} subtitle="The people and craft behind your ride comfort" onBack={closeSection}>
        <section className="relative overflow-hidden rounded-[26px] bg-[#17223B] shadow-[0_10px_26px_rgba(23,34,59,0.2)]">
          <img src="/images/rofik-godi-store.webp" alt="Rofik Godi Centre workshop" className="h-40 w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17223B] via-[#17223B]/35 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 text-white">
            <img src="/images/rofik-center-splash.webp" alt="Rofik Godi Centre logo" className="h-14 w-14 rounded-2xl border border-white/30 object-cover shadow-lg" />
            <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-200">Since 2007</p><h2 className="mt-1 text-xl font-black tracking-tight">Rofik Godi Centre</h2></div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)]">
          <p className="text-[13px] leading-[1.7] text-slate-600"><strong className="text-slate-900">Local craftsmanship, made for Indian roads.</strong> We create comfortable, durable seat covers and custom seat solutions for motorcycles, scooters and Toto e-rickshaws across Murshidabad.</p>
          <p className="mt-3 text-[13px] leading-[1.7] text-slate-600">From a quick fitment to a fully customized finish, our workshop combines practical materials, careful stitching and hands-on service so every ride feels better.</p>
        </section>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm"><p className="text-lg font-black text-[#D9232D]">4.8</p><p className="mt-0.5 text-[9px] font-bold text-slate-400">CUSTOMER RATING</p></div>
          <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm"><p className="text-lg font-black text-[#D9232D]">12+</p><p className="mt-0.5 text-[9px] font-bold text-slate-400">YEARS OF CRAFT</p></div>
          <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm"><p className="text-lg font-black text-[#D9232D]">4</p><p className="mt-0.5 text-[9px] font-bold text-slate-400">CORE SERVICES</p></div>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#D9232D]"><Wrench className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-slate-900">What we do</h2><p className="text-[10px] text-slate-500">Workshop services for your vehicle</p></div></div>
          <div className="mt-3 space-y-2">{WORKSHOP_INFO.services.map((service) => <div key={service} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-medium leading-snug text-slate-600"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{service}</div>)}</div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><div><h2 className="text-sm font-black text-slate-900">Built for everyday riding</h2><p className="mt-1 text-[11px] leading-relaxed text-slate-600">We use durable rexine, high-tensile thread and comfort-focused foam options selected for local weather and road conditions.</p></div></div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-slate-900">Visit the workshop</h2>
          <div className="mt-3 space-y-2 text-[11px] font-medium text-slate-600"><p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D9232D]" />{WORKSHOP_INFO.address}</p><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0 text-blue-600" />{WORKSHOP_INFO.workingHours}</p><p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-emerald-600" />{WORKSHOP_INFO.phone} · {WORKSHOP_INFO.phoneAlt}</p></div>
          {onOpenStoreInfo && <button type="button" onClick={() => onOpenStoreInfo()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9232D] py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700"><MapPin className="h-4 w-4" />Open store map</button>}
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
      <SectionPage title={t('settings.help')} subtitle="Answers for shopping, pickup, fitment and support" onBack={closeSection}>
        <div className="rounded-[26px] bg-gradient-to-br from-[#17223B] to-[#293A63] p-4 text-white shadow-[0_10px_24px_rgba(23,34,59,0.18)]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><HelpCircle className="h-6 w-6" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">Rofik Godi Centre</p><h2 className="mt-1 text-base font-black">How can we help?</h2><p className="mt-1 text-[11px] leading-relaxed text-slate-300">Search answers about your order, vehicle fitment or workshop visit.</p></div>
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-slate-400 shadow-sm">
            <Search className="h-4 w-4 shrink-0" />
            <input value={faqQuery} onChange={(event) => setFaqQuery(event.target.value)} placeholder="Search help topics" aria-label="Search help topics" className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400" />
          </label>
        </div>

        {visibleGroups.length ? visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <section key={group.label} className="space-y-2">
              <div className="flex items-center gap-2 px-1 pt-2"><span className={`flex h-8 w-8 items-center justify-center rounded-xl ${group.tone}`}><GroupIcon className="h-4 w-4" /></span><h2 className="text-[12px] font-black uppercase tracking-[0.12em] text-slate-500">{group.label}</h2></div>
              <div className="overflow-hidden rounded-2xl border border-gray-100/80 bg-white shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)]">
                {group.items.map((faq, index) => {
                  const faqKey = `${group.label}:${faq.q}`;
                  const isOpen = openFaq === faqKey;
                  return (
                    <div key={faq.q} className={index ? 'border-t border-slate-100' : ''}>
                      <button type="button" onClick={() => setOpenFaq(isOpen ? null : faqKey)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-3 px-3.5 py-3.5 text-left transition-colors hover:bg-slate-50">
                        <span className="text-[13px] font-bold leading-snug text-slate-900">{faq.q}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && <div className="px-3.5 pb-3.5 text-[11.5px] leading-relaxed text-slate-600"><p>{faq.a}</p>{faq.action === 'store' && onOpenStoreInfo && <button type="button" onClick={onOpenStoreInfo} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">Open store map <MapPin className="h-3 w-3" /></button>}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Search className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-xs font-bold text-slate-700">No matching help topics</p><button type="button" onClick={() => setFaqQuery('')} className="mt-2 text-[11px] font-bold text-[#D9232D] underline">Clear search</button></div>}

        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-center"><p className="text-xs font-bold text-slate-800">Still need help?</p><p className="mt-1 text-[11px] text-slate-500">Our workshop team can help with a specific order or fitment.</p>{onOpenContactSupport && <button type="button" onClick={() => onOpenContactSupport()} className="mt-3 rounded-xl bg-[#D9232D] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700">Contact support</button>}</div>
      </SectionPage>
    );
  }

  /* -------------------------------- Settings hub ------------------------------- */

  return (
    <div className="w-full flex-1 bg-[#F7F8FA] min-h-full flex flex-col animate-fade-in font-sans">
      {/* BEGIN: NavigationHeader */}
      {/* Top back button, Settings title, and subtitle description */}
      <section className="px-5 pt-3 pb-3" data-purpose="page-header">
        <div className="flex items-center space-x-3 mb-1">
          <button
            onClick={onBack}
            aria-label={t('common.back')}
            className="p-1 -ml-1 text-gray-900 hover:opacity-75 transition-opacity active:scale-95"
            type="button"
          >
            <BackArrow />
          </button>
          <h1 className="text-[25px] font-bold text-gray-900 tracking-tight">{t('settings.title')}</h1>
        </div>
        <p className="text-[13.5px] text-[#64748B] font-normal pl-0.5">
          {t('settings.subtitle')}
        </p>
      </section>
      {/* END: NavigationHeader */}

      {pwaInstallCard && <div className="px-4 pt-1">{pwaInstallCard}</div>}

      {/* BEGIN: SettingsMenuList */}
      {/* Settings hub organised into labelled groups; every entry is a routed page. */}
      <nav aria-label={t('settings.title')} className="flex-1 px-4 space-y-5 mt-1 pb-10">
        <SettingsGroup label="Preferences">
          <SettingsRow
            onClick={() => openSection('notifications')}
            iconBg="bg-[#FEECEC]"
            icon={<Bell className="w-5 h-5 text-[#EF4444]" />}
            title={t('settings.notifications')}
            subtitle={t('settings.offersUpdates')}
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
          {onOpenPersonalData && (
            <SettingsRow
              onClick={onOpenPersonalData}
              iconBg="bg-[#F4ECFF]"
              icon={<ShieldCheck className="w-5 h-5 text-[#7C3AED]" />}
              title="Personal Data"
              subtitle="How your data is processed"
            />
          )}
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

      <p className="pb-6 text-center text-[10px] font-medium text-gray-400">Rofik Godi Centre • App version 1.0.0</p>

      {settingsNotice && <p role="status" className="mx-5 mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-emerald-800">{settingsNotice}</p>}

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
            className="fixed inset-0 z-50 overflow-y-auto bg-[#F7F9FC]"
          >
            <TermsConditionsView
              onBack={() => setActiveDialog(null)}
              onOpenStoreInfo={onOpenStoreInfo}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDialog === 'logout' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveDialog(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-[380px] bg-white rounded-[28px] shadow-2xl p-5 z-10 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FEECEC] text-[#EF4444] mx-auto flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Sign out of account?</h3>
                <p className="text-xs text-gray-500 mt-1">You'll need to sign in again to access your account.</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={() => setActiveDialog(null)}
                  className="py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl"
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
                  className="py-2.5 bg-[#EF4444] text-white text-xs font-bold rounded-xl"
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
