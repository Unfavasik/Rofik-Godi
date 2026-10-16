import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Phone, MessageCircle, Star, Globe, Bell } from 'lucide-react';
import { PrivacyPolicyView } from './PrivacyPolicyView';
import { TermsConditionsView } from './TermsConditionsView';
import { loadCustomerCouponOffers, type CustomerCouponOffer } from '../lib/supabaseCoupons';
import { CouponDetailsView } from './CouponDetailsView';
import { WORKSHOP_INFO } from '../data/products';
import { CustomerSupportRequestForm } from './CustomerSupportRequestForm';

interface SettingsViewProps {
  onBack: () => void;
  onLogout?: () => void | Promise<void>;
  onOpenOrders?: () => void;
  onOpenSupportRequests?: (requestId?: string) => void;
  currentUserId?: string;
  onOpenWishlist?: () => void;
  onOpenStoreInfo?: () => void;
  onOpenShop?: () => void;
  onOpenPrivacyPage?: () => void;
  onOpenTermsPage?: () => void;
  isAuthenticated: boolean;
  onOpenLogin?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  onLogout,
  onOpenOrders,
  onOpenSupportRequests,
  currentUserId,
  onOpenStoreInfo,
  onOpenShop,
  onOpenPrivacyPage,
  onOpenTermsPage,
  isAuthenticated,
  onOpenLogin,
}) => {
  const [activeModal, setActiveModal] = useState<
    | 'notifications'
    | 'coupons'
    | 'reviews'
    | 'privacy'
    | 'terms'
    | 'about'
    | 'app-settings'
    | 'help'
    | 'contact'
    | 'logout'
    | null
  >(null);

  // States for sub-modals
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [selectedCouponOffer, setSelectedCouponOffer] = useState<CustomerCouponOffer | null>(null);
  const [couponOffers, setCouponOffers] = useState<CustomerCouponOffer[]>([]);
  const [couponOffersLoading, setCouponOffersLoading] = useState(false);
  const [couponOffersError, setCouponOffersError] = useState('');
  const [notificationState, setNotificationState] = useState({
    offers: true,
    orderUpdates: true,
    workshopAlerts: true,
    whatsappUpdates: true,
  });
  const [language, setLanguage] = useState<'en' | 'bn' | 'hi'>('en');
  const [userRating, setUserRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [logoutConfirmed, setLogoutConfirmed] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    if (activeModal !== 'coupons') return;
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
  }, [activeModal]);

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
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

  return (
    <div className="w-full flex-1 bg-[#F7F8FA] min-h-full flex flex-col animate-fade-in font-sans">
      {/* BEGIN: NavigationHeader */}
      {/* Top back button, Settings title, and subtitle description */}
      <section className="px-5 pt-3 pb-3" data-purpose="page-header">
        <div className="flex items-center space-x-3 mb-1">
          <button
            onClick={onBack}
            aria-label="Go Back"
            className="p-1 -ml-1 text-gray-900 hover:opacity-75 transition-opacity active:scale-95"
            type="button"
          >
            <svg className="w-6 h-6 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-[25px] font-bold text-gray-900 tracking-tight">Settings</h1>
        </div>
        <p className="text-[13.5px] text-[#64748B] font-normal pl-0.5">
          Manage your account and app preferences
        </p>
      </section>
      {/* END: NavigationHeader */}

      {/* BEGIN: SettingsMenuList */}
      {/* Vertical list of setting option cards matching exact colors and contents from screenshot */}
      <nav aria-label="Settings navigation" className="flex-1 px-4 space-y-2.5 mt-1 pb-10">
        {/* Item 1: Notifications */}
        <button
          onClick={() => setActiveModal('notifications')}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FEECEC] flex items-center justify-center flex-shrink-0">
              {/* Red Bell Icon */}
              <svg className="w-5 h-5 text-[#EF4444]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 5 13v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2a1 1 0 0 0-.293-.707L18 11.586V8a6 6 0 0 0-6-6zm0 19a3 3 0 0 1-2.83-2h5.66A3 3 0 0 1 12 21z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">Notifications</h2>
              <p className="text-[12px] text-gray-500 font-normal">Offers & updates</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 2: Coupons & Offers */}
        <button
          onClick={() => { setSelectedCouponOffer(null); setActiveModal('coupons'); }}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FEECEC] flex items-center justify-center flex-shrink-0">
              {/* Red Discount Coupon Icon */}
              <svg className="w-5 h-5 text-[#EF4444]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a1.5 1.5 0 0 0 0-3V6zm5.5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-5.2 2.7a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06l-5 5a.75.75 0 0 1-1.06 0z"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">Coupons & Offers</h2>
              <p className="text-[12px] text-gray-500 font-normal">Save more</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 3: Order History */}
        <button
          onClick={() => {
            if (onOpenOrders) onOpenOrders();
            else setActiveModal('help');
          }}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F0EEFF] flex items-center justify-center flex-shrink-0">
              {/* Purple Clock/History Icon */}
              <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">Order History</h2>
              <p className="text-[12px] text-gray-500 font-normal">Past purchases</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 4: Reviews */}
        <button
          onClick={() => setActiveModal('reviews')}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FFF6E5] flex items-center justify-center flex-shrink-0">
              {/* Amber/Yellow Star Icon */}
              <svg className="w-5 h-5 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">Reviews</h2>
              <p className="text-[12px] text-gray-500 font-normal">Rate our products</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 5: Privacy Policy */}
        <button
          onClick={() => onOpenPrivacyPage ? onOpenPrivacyPage() : setActiveModal('privacy')}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#E8F8F0] flex items-center justify-center flex-shrink-0">
              {/* Green Shield Protection Icon */}
              <svg className="w-5 h-5 text-[#10B981]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M12 2.25c-4.28 0-8 2.053-8 2.053s.25 9.07 8 17.447c7.75-8.377 8-17.447 8-17.447s-3.72-2.053-8-2.053zm3.707 7.957a.75.75 0 0 0-1.06-1.06L10.75 13.043l-1.397-1.396a.75.75 0 1 0-1.06 1.06l1.927 1.927a.75.75 0 0 0 1.06 0l4.427-4.427z"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">Privacy Policy</h2>
              <p className="text-[12px] text-gray-500 font-normal">Your data & security</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 6: Terms & Conditions */}
        <button
          onClick={() => onOpenTermsPage ? onOpenTermsPage() : setActiveModal('terms')}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EBF5FF] flex items-center justify-center flex-shrink-0">
              {/* Light Blue Document Icon */}
              <svg className="w-5 h-5 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875H18a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 18 22.125H6a2.25 2.25 0 0 1-2.25-2.25V3.75A2.25 2.25 0 0 1 5.625 1.5zm3.75 12a.75.75 0 0 0 0 1.5h6.75a.75.75 0 0 0 0-1.5H9.375zm0 3.75a.75.75 0 0 0 0 1.5h6.75a.75.75 0 0 0 0-1.5H9.375zm0-7.5a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3z"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">Terms & Conditions</h2>
              <p className="text-[12px] text-gray-500 font-normal">App usage rules</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 7: About Us */}
        <button
          onClick={() => setActiveModal('about')}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EBF5FF] flex items-center justify-center flex-shrink-0">
              {/* Light Blue Info Icon */}
              <svg className="w-5 h-5 text-[#3B82F6]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022zM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">About Us</h2>
              <p className="text-[12px] text-gray-500 font-normal">Our story</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 8: App Settings */}
        <button
          onClick={() => setActiveModal('app-settings')}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F4ECFF] flex items-center justify-center flex-shrink-0">
              {/* Purple Palette/Preferences Icon */}
              <svg className="w-5 h-5 text-[#8B5CF6]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 3.328 1.666 6.27 4.21 8.04.425.297.982.164 1.25-.297a7.518 7.518 0 0 1 1.236-1.512c.563-.526 1.4-.78 2.146-.628.706.143 1.428.217 2.158.217 4.97 0 9-4.03 9-9 0-3.66-2.186-6.81-5.326-8.223A9.704 9.704 0 0 0 12 2.25zM6.75 11.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm3.75-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm4.5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm3.75 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">App Settings</h2>
              <p className="text-[12px] text-gray-500 font-normal">Theme, language & preferences</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 9: Help & FAQ */}
        <button
          onClick={() => setActiveModal('help')}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FEECEC] flex items-center justify-center flex-shrink-0">
              {/* Red Help Question Icon */}
              <svg className="w-5 h-5 text-[#EF4444]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9.5" />
                <path d="M9.879 9.879a3 3 0 114.242 2.828c-.566.377-.871.868-.871 1.543V15m0 3h.01" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">Help & FAQ</h2>
              <p className="text-[12px] text-gray-500 font-normal">Common questions</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 10: Contact Us */}
        <button
          onClick={() => setActiveModal('contact')}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-gray-50 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#EBF5FF] flex items-center justify-center flex-shrink-0">
              {/* Blue Phone Icon */}
              <svg className="w-5 h-5 text-[#2563EB]" fill="currentColor" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">Contact Us</h2>
              <p className="text-[12px] text-gray-500 font-normal">Get in touch</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Item 11: Logout */}
        <button
          onClick={() => {
            setLogoutConfirmed(false);
            setLogoutError('');
            setActiveModal('logout');
          }}
          className="w-full flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] border border-gray-100/75 hover:bg-red-50/40 active:scale-[0.99] transition-all duration-150 text-left"
          type="button"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FEECEC] flex items-center justify-center flex-shrink-0">
              {/* Red Logout Icon */}
              <svg className="w-5 h-5 text-[#EF4444]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-[14.5px] font-bold text-gray-900 leading-snug">Logout</h2>
              <p className="text-[12px] text-gray-500 font-normal">Sign out from your account</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </nav>
      {/* END: SettingsMenuList */}

      {/* --- SUB MODALS FOR INTERACTION --- */}

      {/* 1. Notifications Modal */}
      <AnimatePresence>
        {activeModal === 'notifications' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-[420px] bg-white rounded-[28px] shadow-2xl p-5 z-10 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#FEECEC] flex items-center justify-center text-[#EF4444]">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Notification Preferences</h3>
                    <p className="text-xs text-gray-500">Choose what you want to receive</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'offers', label: 'Festival Discounts & Coupons', desc: 'Alerts about seasonal flash sales & discounts' },
                  { key: 'orderUpdates', label: 'Order Status & Tracking', desc: 'Realtime updates when stitching starts or completes' },
                  { key: 'workshopAlerts', label: 'Local Workshop Queue', desc: 'Live waiting time updates for on-spot fitting' },
                  { key: 'whatsappUpdates', label: 'WhatsApp Instant Delivery', desc: 'Receive invoice & bill directly on WhatsApp' },
                ].map((item) => (
                  <div key={item.key} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                    <div className="pr-2">
                      <div className="text-[13px] font-bold text-gray-900">{item.label}</div>
                      <div className="text-[11px] text-gray-500">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationState[item.key as keyof typeof notificationState]}
                      onChange={(e) => setNotificationState({ ...notificationState, [item.key]: e.target.checked })}
                      className="w-5 h-5 rounded text-[#D9232D] focus:ring-[#D9232D] cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 bg-[#D9232D] text-white text-xs font-bold rounded-2xl shadow-sm hover:bg-red-700 transition-colors"
              >
                Save Preferences
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Coupons & Offers Modal */}
      <AnimatePresence>
        {activeModal === 'coupons' && (
          selectedCouponOffer ? (
            <CouponDetailsView
              offer={selectedCouponOffer}
              onBack={() => setSelectedCouponOffer(null)}
              onShopNow={() => {
                setSelectedCouponOffer(null);
                setActiveModal(null);
                onOpenShop?.();
              }}
            />
          ) : (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedCouponOffer(null); setActiveModal(null); }} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
              <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-[420px] bg-white rounded-[28px] shadow-2xl p-5 z-10 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Coupons & Special Offers</h3>
                    <p className="text-xs text-gray-500">Tap an offer for details or copy its code</p>
                  </div>
                  <button onClick={() => { setSelectedCouponOffer(null); setActiveModal(null); }} aria-label="Close coupons" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-[60vh] space-y-2.5 overflow-y-auto">
                  {couponOffersLoading ? <p className="py-8 text-center text-xs font-semibold text-gray-400">Loading active offers…</p>
                    : couponOffersError ? <p role="status" className="rounded-xl bg-amber-50 p-4 text-center text-xs font-semibold text-amber-800">{couponOffersError}</p>
                    : couponOffers.length === 0 ? <p className="py-8 text-center text-xs font-semibold text-gray-400">No active coupon offers right now. Please check back later.</p>
                    : couponOffers.map((offer) => (
                      <div key={offer.code} className="rounded-2xl border border-red-200/70 bg-gradient-to-r from-red-50 to-orange-50 p-3">
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
                </div>
              </motion.div>
            </div>
          )
        )}
      </AnimatePresence>

      {/* 3. Reviews Modal */}
      <AnimatePresence>
        {activeModal === 'reviews' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-[420px] bg-white rounded-[28px] shadow-2xl p-5 z-10 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Rate & Review</h3>
                  <p className="text-xs text-gray-500">Help other riders with your feedback</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reviewSubmitted ? (
                <div className="py-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Thank you for your review!</h4>
                  <p className="text-xs text-gray-500">Your feedback helps Rofik Godi Centre improve quality.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setUserRating(s)}
                        className="p-1 transition-transform active:scale-125"
                      >
                        <Star className={`w-7 h-7 ${s <= userRating ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={3}
                    placeholder="Tell us about the stitching quality, comfort or on-spot fitting experience..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#D9232D]"
                  />

                  <button
                    onClick={() => setReviewSubmitted(true)}
                    className="w-full py-3 bg-[#D9232D] text-white text-xs font-bold rounded-2xl shadow-sm hover:bg-red-700 transition-colors"
                  >
                    Submit Review
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Privacy Policy View */}
      <AnimatePresence>
        {activeModal === 'privacy' && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#F8FAFC]"
          >
            <PrivacyPolicyView
              onBack={() => setActiveModal(null)}
              onOpenStoreInfo={onOpenStoreInfo}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Terms & Conditions View */}
      <AnimatePresence>
        {activeModal === 'terms' && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#F7F9FC]"
          >
            <TermsConditionsView
              onBack={() => setActiveModal(null)}
              onOpenStoreInfo={onOpenStoreInfo}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. About Us Modal */}
      <AnimatePresence>
        {activeModal === 'about' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-[420px] bg-white rounded-[28px] shadow-2xl p-5 z-10 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">About Rofik Godi Centre</h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-gray-600 leading-relaxed">
                <div className="bg-[#FEECEC] p-3 rounded-2xl text-[#D9232D] font-bold text-center">
                  Crafting Premium Ride Comfort Since 2012
                </div>
                <p>
                  <strong>ROFIK GODI CENTRE</strong> is Murshidabad's premier workshop for handcrafted motorcycle, scooter, and Toto e-rickshaw seat modifications.
                </p>
                <p>
                  Every seat cover is reinforced with high-tensile Japanese thread, triple-layer rexine, and high-density anti-fatigue memory foam tailored specifically for Indian road conditions.
                </p>
                <div className="pt-2 border-t border-gray-100 flex justify-between text-[11px] text-gray-500 font-medium">
                  <span>📍 {WORKSHOP_INFO.address}</span>
                  <span>☎ {WORKSHOP_INFO.phone}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. App Settings Modal */}
      <AnimatePresence>
        {activeModal === 'app-settings' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-[420px] bg-white rounded-[28px] shadow-2xl p-5 z-10 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">App Preferences</h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Language / ভাষা</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'en', label: 'English' },
                      { id: 'bn', label: 'বাংলা' },
                      { id: 'hi', label: 'हिन्दी' },
                    ].map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLanguage(l.id as 'en' | 'bn' | 'hi')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          language === l.id ? 'border-[#D9232D] bg-[#FEECEC] text-[#D9232D]' : 'border-gray-200 text-gray-700'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl flex justify-between items-center text-xs text-gray-700 font-semibold">
                  <span>Haptic Tap Feedback</span>
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Enabled</span>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 bg-[#D9232D] text-white text-xs font-bold rounded-2xl shadow-sm"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Help & FAQ Modal */}
      <AnimatePresence>
        {activeModal === 'help' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative w-full max-w-[420px] max-h-[80vh] bg-white rounded-[28px] shadow-2xl p-5 z-10 flex flex-col space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">Frequently Asked Questions</h3>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2.5 text-xs text-gray-700 flex-1 pr-1">
                <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                  <h4 className="font-bold text-gray-900">Q: How does on-spot fitting work?</h4>
                  <p className="text-gray-500">A: On-site fitting availability and timing can vary. Please contact the workshop before travelling for a specific fitting request.</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                  <h4 className="font-bold text-gray-900">Q: Are the seat covers water-proof?</h4>
                  <p className="text-gray-500">A: Water resistance and materials vary by product. Check the product details before ordering or contact the workshop if you need help.</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                  <h4 className="font-bold text-gray-900">Q: Can I customize piping and stitch patterns?</h4>
                  <p className="text-gray-500">A: Yes, use the "Custom Fit" 3D studio in the app to pick your exact colors and foam cushion thickness.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. Contact Us Modal */}
      <AnimatePresence>
        {activeModal === 'contact' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="relative z-10 max-h-[92vh] w-full max-w-[480px] space-y-4 overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Contact Workshop Team</h3>
                  <p className="text-xs text-gray-500">{WORKSHOP_INFO.workingHours}</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <CustomerSupportRequestForm
                isAuthenticated={isAuthenticated}
                expectedUserId={currentUserId}
                onOpenLogin={onOpenLogin}
                onOpenSupportRequest={(requestId) => onOpenSupportRequests?.(requestId)}
              />
              {onOpenSupportRequests && (
                <button
                  type="button"
                  onClick={() => onOpenSupportRequests()}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  View my support requests
                </button>
              )}

              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <span className="h-px flex-1 bg-slate-100" />
                Or contact us directly
                <span className="h-px flex-1 bg-slate-100" />
              </div>

              <div className="space-y-2.5">
                <a
                  href={`tel:${WORKSHOP_INFO.phone.replace(/\s/g, '')}`}
                  className="flex items-center justify-between p-3.5 bg-[#EBF5FF] text-[#2563EB] rounded-2xl font-bold text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-5 h-5" />
                    <span>Call +91 98321 45678</span>
                  </div>
                  <span>Dial →</span>
                </a>

                <a
                  href="https://wa.me/919832145678"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 bg-[#E8F8F0] text-[#10B981] rounded-2xl font-bold text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-5 h-5" />
                    <span>WhatsApp Direct Support</span>
                  </div>
                  <span>Chat →</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. Logout Modal */}
      <AnimatePresence>
        {activeModal === 'logout' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
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
                  onClick={() => setActiveModal(null)}
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
