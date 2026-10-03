import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Heart,
  MapPin,
  Settings,
  MessageCircle,
  Phone,
  Clock,
  ChevronRight,
  User,
  X,
  CheckCircle2,
  Truck,
  RotateCcw,
  Sparkles,
  Globe,
  Bell,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { CustomerOrderRecord, Product, UserProfile } from '../types';
import { listMyOrders } from '../lib/supabaseOrders';
import { listMyProductReviews, type ProductReviewRecord } from '../lib/supabaseReviews';
import { ReviewComposer } from './ReviewComposer';
import { SettingsView } from './SettingsView';
import { PrivacyPolicyView } from './PrivacyPolicyView';
import { TermsConditionsView } from './TermsConditionsView';
import { WORKSHOP_INFO } from '../data/products';
import { getMyProfile, saveMyProfile } from '../lib/supabaseCustomer';

interface AccountViewProps {
  currentUser?: UserProfile;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onContinueShopping?: () => void;
  onBackToHome?: () => void;
  onOpenWishlist: () => void;
  wishlistCount?: number;
  onOpenProduct?: (p: Product) => void;
  onOpenStoreInfo?: () => void;
  onOpenCustomBuilder?: () => void;
  onOpenShop?: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  onContinueShopping,
  onBackToHome,
  onOpenWishlist,
  wishlistCount = 0,
  onOpenStoreInfo,
  onOpenCustomBuilder,
  onOpenShop,
}) => {
  const handleGoHome = () => {
    if (onBackToHome) onBackToHome();
    else if (onContinueShopping) onContinueShopping();
  };
  const [activeModal, setActiveModal] = useState<'orders' | 'pickupStore' | 'settings' | 'profile' | 'privacy' | 'terms' | null>(null);

  const isGuest = currentUser?.isGuest ?? false;

  const [customerOrders, setCustomerOrders] = useState<CustomerOrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [myReviews, setMyReviews] = useState<ProductReviewRecord[]>([]);
  const [reviewComposer, setReviewComposer] = useState<{ productId: string; orderId: string; orderNumber: string; productTitle: string; review?: ProductReviewRecord } | null>(null);
  useEffect(() => {
    let active = true;
    if (activeModal !== 'orders') return () => { active = false; };
    if (!currentUser || currentUser.isGuest) {
      setCustomerOrders([]);
      setOrdersLoading(false);
      return () => { active = false; };
    }
    setOrdersLoading(true);
    void Promise.all([listMyOrders(currentUser.id), listMyProductReviews(currentUser.id)]).then(([orders, reviews]) => {
      if (active) {
        setCustomerOrders(orders);
        setMyReviews(reviews);
      }
    }).finally(() => {
      if (active) setOrdersLoading(false);
    });
    return () => { active = false; };
  }, [activeModal, currentUser?.id, currentUser?.isGuest]);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileVehicle, setProfileVehicle] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  useEffect(() => {
    let active = true;
    if (!currentUser || currentUser.isGuest) {
      setProfileName('');
      setProfilePhone('');
      setProfileVehicle('');
      return () => { active = false; };
    }
    setProfileName(currentUser.name || '');
    setProfilePhone(currentUser.phone || '');
    setProfileVehicle(currentUser.vehicle || '');
    void getMyProfile().then((profile) => {
      if (!active || !profile) return;
      setProfileName(profile.full_name || currentUser.name || '');
      setProfilePhone(profile.phone || currentUser.phone || '');
      setProfileVehicle(profile.vehicle_model || currentUser.vehicle || '');
    });
    return () => { active = false; };
  }, [currentUser?.id]);

  const handleSaveProfile = async () => {
    if (!currentUser || currentUser.isGuest) return;
    setProfileSaving(true);
    setProfileMessage('');
    const { error } = await saveMyProfile({ full_name: profileName.trim(), phone: profilePhone.trim(), vehicle_model: profileVehicle.trim() });
    setProfileSaving(false);
    setProfileMessage(error ? 'Unable to save profile. Please try again.' : 'Profile saved.');
  };

  const handleProtectedAction = (modalType: 'orders' | 'pickupStore' | 'settings' | 'profile' | 'privacy' | 'terms') => {
    if (isGuest && (modalType === 'orders' || modalType === 'pickupStore' || modalType === 'profile')) {
      if (onOpenLogin) onOpenLogin();
      else setActiveModal(modalType);
    } else {
      setActiveModal(modalType);
    }
  };


  const [language, setLanguage] = useState<'en' | 'bn' | 'hi'>('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  if (activeModal === 'settings') {
    return (
      <SettingsView
        onBack={() => setActiveModal(null)}
        onOpenOrders={() => setActiveModal('orders')}
        onOpenWishlist={onOpenWishlist}
        onOpenStoreInfo={onOpenStoreInfo}
      />
    );
  }

  if (activeModal === 'privacy') {
    return (
      <PrivacyPolicyView
        onBack={() => setActiveModal(null)}
        onOpenStoreInfo={onOpenStoreInfo}
      />
    );
  }

  if (activeModal === 'terms') {
    return (
      <TermsConditionsView
        onBack={() => setActiveModal(null)}
        onOpenStoreInfo={onOpenStoreInfo}
      />
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4 pb-12 animate-fade-in text-slate-800">
      {/* Account Page Title & Avatar */}
      <section className="px-5 pt-3 pb-2 flex justify-between items-start" data-purpose="account-header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">Account</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 tracking-tight">
            {isGuest ? 'Guest User · Sign in for pickup orders' : 'Pickup orders, help and store information'}
          </p>
        </div>
        {/* User Avatar / Profile Icon Button */}
        <button
          onClick={() => handleProtectedAction('profile')}
          aria-label="Profile Details"
          className="w-10 h-10 rounded-full bg-[#FCE6E1] flex items-center justify-center transition-transform active:scale-95 text-slate-700 shadow-xs hover:bg-[#FCD8CF]"
        >
          <User className="w-5 h-5 text-slate-700" />
        </button>
      </section>

      {/* Guest Mode Banner */}
      {isGuest && (
        <div className="mx-4 p-4 rounded-2xl bg-gradient-to-r from-red-50 via-[#FDF2F0] to-rose-50 border border-red-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9232D] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[14px] font-extrabold text-gray-950 leading-tight">
                Unlock Account Features
              </h4>
              <p className="text-[11.5px] text-gray-600 font-medium mt-0.5">
                Login to track orders, save your profile, wishlist &amp; earn rewards.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-4 py-2 bg-[#D9232D] hover:bg-[#C01B24] active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center space-x-1.5 flex-shrink-0"
          >
            <span>Login / Signup</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <main className="px-4 space-y-4">
        {/* BEGIN: HeroBanner (Matching exact prompt HTML) */}
        <section
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1C21] via-[#151418] to-[#0A0A0C] p-5 text-white shadow-lg border border-neutral-800/60 select-none"
          data-purpose="promo-banner"
        >
          {/* Glow / Background warm illumination */}
          <div className="absolute -right-8 top-10 w-64 h-64 bg-amber-700/20 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute right-0 bottom-0 w-52 h-44 bg-gradient-to-t from-orange-950/40 to-transparent pointer-events-none" />

          {/* Banner Top Row */}
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] tracking-[0.18em] uppercase font-bold text-orange-200/90 font-mono">
              ROFIK GODI CENTRE
            </span>
            {/* Royal Crown Silhouette */}
            <svg className="w-5 h-5 text-amber-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 18h18v-2H3v2zm1.5-4h15l1-7-4.5 3.5L12 4 7.5 10.5 3 7l1.5 7z" />
            </svg>
          </div>

          {/* Main Banner Heading and Seat Graphic Container */}
          <div className="relative grid grid-cols-12 gap-2 z-10">
            <div className="col-span-7 flex flex-col justify-between pr-1">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">
                  Your ride <br />deserves <span className="text-[#E5624E]">better.</span>
                </h2>
                <p className="text-[11px] text-zinc-300 font-normal leading-relaxed mt-2 pr-1 opacity-90">
                  Premium seat covers for bike &amp; toto. Simple, durable and made for local journeys.
                </p>
              </div>

              {/* Call to action button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="inline-flex items-center justify-between bg-[#FEE5DF] hover:bg-[#FCD7CE] text-zinc-900 rounded-full pl-3.5 pr-1.5 py-1.5 transition-all shadow-sm group active:scale-95"
                >
                  <span className="text-xs font-semibold text-slate-900 tracking-tight mr-2">Continue shopping</span>
                  <span className="w-6 h-6 rounded-full bg-[#E55845] flex items-center justify-center text-white transition-transform group-hover:translate-x-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            {/* Banner Right Seat Cover Illustration & Badges */}
            <div className="col-span-5 relative flex flex-col items-end justify-between">
              {/* Simulated Seat Graphic using detailed SVG */}
              <div className="w-full h-32 relative flex items-center justify-center">
                <svg className="w-full h-full drop-shadow-2xl overflow-visible" viewBox="0 0 160 170">
                  <defs>
                    <linearGradient id="leatherGradAccount" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#363435" />
                      <stop offset="45%" stopColor="#242124" />
                      <stop offset="90%" stopColor="#141215" />
                    </linearGradient>
                    <linearGradient id="tanLeatherAccount" x1="0%" x2="100%" y1="100%" y2="0%">
                      <stop offset="0%" stopColor="#7B3A23" />
                      <stop offset="50%" stopColor="#B25531" />
                      <stop offset="100%" stopColor="#D26E43" />
                    </linearGradient>
                    <linearGradient id="stitchHighlightAccount" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#E5624E" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#FFA88B" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                  {/* Main Seat Backing */}
                  <path
                    d="M 40,25 C 70,12 110,14 135,38 C 152,56 158,95 145,130 C 132,165 95,172 65,160 C 42,150 25,125 22,95 C 18,65 24,35 40,25 Z"
                    fill="url(#leatherGradAccount)"
                    stroke="#4A4545"
                    strokeWidth="1.5"
                  />
                  {/* Tan/Cognac Bolster side patch */}
                  <path
                    d="M 105,28 C 125,40 148,68 143,105 C 138,125 125,142 110,148 C 118,128 120,95 110,65 C 104,48 95,35 105,28 Z"
                    fill="url(#tanLeatherAccount)"
                    stroke="#E5624E"
                    strokeWidth="1"
                  />
                  {/* Quilted / Ribbed Stitch lines */}
                  <path d="M 38,62 C 60,67 85,68 112,56" fill="none" stroke="url(#stitchHighlightAccount)" strokeDasharray="3,2" strokeWidth="2" />
                  <path d="M 34,80 C 60,86 85,86 114,72" fill="none" stroke="url(#stitchHighlightAccount)" strokeDasharray="3,2" strokeWidth="2" />
                  <path d="M 34,98 C 60,105 84,103 115,88" fill="none" stroke="url(#stitchHighlightAccount)" strokeDasharray="3,2" strokeWidth="2" />
                  <path d="M 38,116 C 62,122 84,118 114,104" fill="none" stroke="url(#stitchHighlightAccount)" strokeDasharray="3,2" strokeWidth="2" />
                  {/* Glow reflection */}
                  <ellipse cx="60" cy="50" fill="#FFFFFF" opacity="0.08" rx="35" ry="15" transform="rotate(-20 60 50)" />
                </svg>
              </div>

              {/* Mini Quality Badges stacked */}
              <div className="flex flex-col items-end space-y-1.5 w-full mt-1">
                <div className="flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm text-[9px] text-zinc-200">
                  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a4 4 0 00-4 4c0 2.21 4 7 4 7s4-4.79 4-7a4 4 0 00-4-4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                  <span className="font-medium">Comfort</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm text-[9px] text-zinc-200">
                  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                  </svg>
                  <span className="font-medium">Durable</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm text-[9px] text-zinc-200">
                  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <span className="font-medium">Local Choice</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* END: HeroBanner */}

        {/* BEGIN: QuickActionsGrid */}
        <section className="grid grid-cols-4 gap-2.5 pt-0.5" data-purpose="quick-navigation-grid">
          {/* 1. My Orders (Soft Pink) */}
          <button
            type="button"
            onClick={() => handleProtectedAction('orders')}
            className="bg-[#FDECE9] hover:bg-[#FCD8CF] rounded-2xl p-2.5 flex flex-col justify-between aspect-[1/1.08] relative group active:scale-95 transition-transform shadow-xs text-left"
          >
            <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#E55845]">
              <Package className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight leading-none">My Orders</h3>
              <p className="text-[10px] text-slate-500 font-normal mt-1 leading-none">View &amp; track</p>
            </div>
            <svg className="w-3 h-3 text-slate-700 absolute bottom-3 right-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 2. Wishlist (Soft Blue) */}
          <button
            type="button"
            onClick={onOpenWishlist}
            className="bg-[#EBF3FC] hover:bg-[#D9EAFB] rounded-2xl p-2.5 flex flex-col justify-between aspect-[1/1.08] relative group active:scale-95 transition-transform shadow-xs text-left"
          >
            <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#3B82F6]">
              <Heart className="w-4 h-4 fill-[#2E7CF6] text-[#2E7CF6]" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight leading-none">Wishlist</h3>
              <p className="text-[10px] text-slate-500 font-normal mt-1 leading-none">
                {wishlistCount > 0 ? `${wishlistCount} saved` : 'Saved items'}
              </p>
            </div>
            <svg className="w-3 h-3 text-slate-700 absolute bottom-3 right-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 3. Pickup Store (Soft Green) */}
          <button
            type="button"
            onClick={() => handleProtectedAction('pickupStore')}
            className="bg-[#ECF8F1] hover:bg-[#DCF2E4] rounded-2xl p-2.5 flex flex-col justify-between aspect-[1/1.08] relative group active:scale-95 transition-transform shadow-xs text-left"
          >
            <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#16A34A]">
              <MapPin className="w-4 h-4 text-[#16A34A] fill-[#16A34A]" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight leading-none">Pickup Store</h3>
              <p className="text-[10px] text-slate-500 font-normal mt-1 leading-none">View details</p>
            </div>
            <svg className="w-3 h-3 text-slate-700 absolute bottom-3 right-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 4. Settings (Soft Purple) */}
          <button
            type="button"
            onClick={() => setActiveModal('settings')}
            className="bg-[#F3EEFD] hover:bg-[#EAE1FB] rounded-2xl p-2.5 flex flex-col justify-between aspect-[1/1.08] relative group active:scale-95 transition-transform shadow-xs text-left"
          >
            <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#7C3AED]">
              <Settings className="w-4 h-4 text-[#7C3AED] fill-[#7C3AED]" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight leading-none">Settings</h3>
              <p className="text-[10px] text-slate-500 font-normal mt-1 leading-none">Preferences</p>
            </div>
            <svg className="w-3 h-3 text-slate-700 absolute bottom-3 right-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </section>
        {/* END: QuickActionsGrid */}

        {/* BEGIN: NeedHelpSection */}
        <section className="pt-2" data-purpose="help-section">
          <div className="flex justify-between items-center px-1 mb-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Need help?</h2>
            <a
              href="https://wa.me/919832145678?text=Hello%20Rofik%20Godi%20Support,%20I%20need%20help%20with%20my%20seat%20cover."
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center"
            >
              Get support
              <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          {/* WhatsApp Support Card */}
          <div className="bg-white rounded-2xl p-3.5 flex items-center justify-between border border-emerald-100/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#25D366] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <MessageCircle className="w-6 h-6 fill-white text-[#25D366]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Chat on WhatsApp</h3>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">Quick answers from our local team</p>
              </div>
            </div>
            <a
              href="https://wa.me/919832145678?text=Hello%20Rofik%20Godi,%20I%20have%20a%20question%20about%20seat%20covers."
              target="_blank"
              rel="noreferrer"
              className="bg-[#1EB754] hover:bg-[#16A34A] text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center space-x-1 transition-colors flex-shrink-0"
            >
              <span>Chat now</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </section>
        {/* END: NeedHelpSection */}

        {/* BEGIN: VisitOurStoreSection */}
        <section
          className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] relative overflow-hidden"
          data-purpose="store-locator-card"
        >
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Left details column */}
            <div className="col-span-7 space-y-2">
              {/* Pin Badge & Name */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#FEE5DF] flex items-center justify-center text-[#E55845] flex-shrink-0">
                  <MapPin className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Visit our store</h3>
                  <p className="text-[11px] text-slate-600 font-medium leading-none mt-0.5">Rofik Godi Centre</p>
                </div>
              </div>
              {/* Description */}
              <p className="text-[11px] text-slate-500 font-normal leading-tight">
                Local automotive accessories &amp; fitting service
              </p>
              {/* Timing and Location Specs */}
              <div className="space-y-1 pt-1 text-[11px] text-slate-600 font-medium">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
                  <span className="truncate">Open daily · 9:00 AM – 8:00 PM</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
                  <span className="truncate">Kadbeltala, Murshidabad</span>
                </div>
              </div>
              {/* Get directions pill button */}
              <div className="pt-2">
                <a
                  href="https://maps.google.com/?q=Kadbeltala,+Murshidabad"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 bg-[#FEE5DF] hover:bg-[#FCD8CF] text-[#C83F2D] text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
                >
                  <span>Get directions</span>
                  <svg className="w-3 h-3 text-[#C83F2D]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right 3D Isometric Map / Store Preview Graphic */}
            <div className="col-span-5 h-full min-h-[140px] rounded-2xl overflow-hidden relative shadow-inner bg-[#E7F0FA] flex items-center justify-center p-2">
              <svg className="w-full h-full" fill="none" viewBox="0 0 140 140">
                {/* Map terrain base */}
                <rect fill="#E8F4E8" height="140" rx="16" width="140" />
                {/* Road network */}
                <path d="M-10 60 L150 110" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="18" />
                <path d="M-10 60 L150 110" stroke="#D1E2F0" strokeLinecap="round" strokeWidth="12" />
                <path d="M90 -10 L40 150" stroke="#FFFFFF" strokeWidth="14" />
                <path d="M90 -10 L40 150" stroke="#D1E2F0" strokeWidth="8" />
                {/* Subtle green zones */}
                <circle cx="20" cy="25" fill="#D3EDD8" r="14" />
                <circle cx="125" cy="40" fill="#D3EDD8" r="18" />
                <circle cx="120" cy="120" fill="#D3EDD8" r="16" />
                {/* 3D Mini Storefront */}
                <g transform="translate(42, 45)">
                  {/* Base / Shadow */}
                  <ellipse cx="28" cy="42" fill="#000000" opacity="0.12" rx="22" ry="7" />
                  {/* Store Body */}
                  <rect fill="#E2E8F0" height="24" rx="2" stroke="#94A3B8" strokeWidth="1" width="36" x="10" y="16" />
                  {/* Window & Door */}
                  <rect fill="#7DD3FC" height="12" rx="1" width="12" x="14" y="24" />
                  <rect fill="#64748B" height="18" rx="1" width="12" x="30" y="22" />
                  <rect fill="#94A3B8" height="16" width="8" x="32" y="24" />
                  {/* Striped Store Awning */}
                  <path d="M 6,16 L 10,7 L 46,7 L 50,16 Z" fill="#EF4444" />
                  <path d="M 14,16 L 16.5,7 L 22.5,7 L 20,16 Z" fill="#FFFFFF" />
                  <path d="M 28,16 L 29.5,7 L 35.5,7 L 34,16 Z" fill="#FFFFFF" />
                  <path d="M 42,16 L 42.5,7 L 48.5,7 L 48,16 Z" fill="#FFFFFF" />
                  <path
                    d="M 6,16 Q 10,19 14,16 Q 18,19 22,16 Q 26,19 30,16 Q 34,19 38,16 Q 42,19 46,16 Q 50,19 54,16"
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="2"
                  />
                </g>
                {/* Map Pin on Store Location */}
                <g transform="translate(90, 80)">
                  <ellipse cx="12" cy="27" fill="#1E293B" opacity="0.2" rx="6" ry="2.5" />
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12c0 6.5 10 16 10 16s10-9.5 10-16c0-5.52-4.48-10-10-10z"
                    fill="#EF4444"
                  />
                  <circle cx="12" cy="11" fill="#FFFFFF" r="4" />
                </g>
              </svg>
            </div>
          </div>
        </section>
        {/* END: VisitOurStoreSection */}

        {/* BEGIN: MoreOptionsSection */}
        <section className="pt-1 space-y-2.5" data-purpose="more-options-section">
          <h2 className="text-base font-bold text-slate-900 tracking-tight px-1 mb-1">More options</h2>

          {/* Privacy Policy Card */}
          <button
            type="button"
            onClick={() => setActiveModal('privacy')}
            className="w-full bg-white rounded-2xl p-3.5 flex items-center justify-between border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F8F0] flex items-center justify-center text-[#10B981] flex-shrink-0">
                <ShieldCheck className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Privacy Policy</h3>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">Your data & vehicle specs protection</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Terms & Conditions Card */}
          <button
            type="button"
            onClick={() => setActiveModal('terms')}
            className="w-full bg-white rounded-2xl p-3.5 flex items-center justify-between border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EBF5FF] flex items-center justify-center text-[#2563EB] flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Terms &amp; Conditions</h3>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">Rules for using Rofik Godi Centre app</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Call us Card */}
          <a
            className="bg-white rounded-2xl p-3.5 flex items-center justify-between border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:bg-slate-50 transition-colors"
            href="tel:+919832145678"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF2FE] flex items-center justify-center text-[#2563EB] flex-shrink-0">
                <Phone className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Call us</h3>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">Speak with our master craftsmen</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </section>
        {/* END: MoreOptionsSection */}
      </main>

      {/* Sub-Modals for Account Features */}

      {/* 1. My Orders Modal */}
      <AnimatePresence>
        {activeModal === 'orders' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-[440px] max-h-[85vh] bg-white rounded-[28px] shadow-2xl flex flex-col z-10 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#FDECE9] flex items-center justify-center text-[#E55845]">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-gray-900">Your Orders</h3>
                    <p className="text-[11px] text-gray-400">Track current status & past crafted seats</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1 no-scrollbar">
                {ordersLoading ? <p className="py-10 text-center text-sm text-gray-500">Loading your orders…</p> : customerOrders.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="mx-auto h-9 w-9 text-gray-300" />
                    <h4 className="mt-3 text-sm font-bold text-gray-800">No orders yet</h4>
                    <p className="mt-1 text-xs text-gray-500">Orders you place will appear here.</p>
                  </div>
                ) : customerOrders.map((ord) => {
                  const status = ord.status.replaceAll('_', ' ');
                  const itemSummary = ord.order_items.map((item) => `${item.product_name} × ${item.quantity}`).join(', ');
                  const orderDate = new Date(ord.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
                  const statusTone = ord.status === 'COMPLETED' || ord.status === 'PICKED_UP' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : ord.status === 'CANCELLED' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200';
                  const uniqueItems = ord.order_items.filter((item, index, items) => item.product_id && /^[0-9a-f-]{36}$/i.test(item.product_id) && items.findIndex((candidate) => candidate.product_id === item.product_id) === index);
                  return <article key={ord.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="text-[11px] font-mono font-bold text-gray-500">#{ord.order_number}</span>
                        <h4 className="mt-1 text-[12.5px] font-black text-gray-900 leading-tight">{itemSummary || 'Store pickup order'}</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">{ord.vehicle_model || 'Vehicle not specified'} · Store pickup</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusTone}`}>{status}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 items-center text-[11px] pt-2 text-gray-600 border-t border-gray-200/60">
                      <span>{orderDate}</span>
                      <span>Payment: {ord.payment_status}</span>
                      <strong className="text-gray-900 text-[12.5px]">₹{ord.total}</strong>
                    </div>
                    {uniqueItems.length > 0 && <div className="space-y-2 border-t border-gray-200/60 pt-2">{uniqueItems.map((item) => {
                      const productReview = myReviews.find((review) => review.order_id === ord.id && review.product_id === item.product_id);
                      return <div key={`${ord.id}-${item.product_id}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                        <div className="min-w-0"><p className="truncate text-[11px] font-bold text-gray-800">{item.product_name}</p>{productReview?.is_verified_purchase && <p className="text-[9px] font-semibold text-emerald-700">Verified purchase · Your review</p>}</div>
                        {ord.status === 'COMPLETED' ? <button type="button" onClick={() => setReviewComposer({ productId: item.product_id!, orderId: ord.id, orderNumber: ord.order_number, productTitle: item.product_name, review: productReview })} className="shrink-0 rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-bold text-[#d9232d]">{productReview ? 'Edit review' : 'Rate & Review'}</button> : <span className="shrink-0 text-[9px] text-gray-400">Available after completion</span>}
                      </div>;
                    })}</div>}
                  </article>;
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {reviewComposer && <ReviewComposer productId={reviewComposer.productId} orderId={reviewComposer.orderId} orderNumber={reviewComposer.orderNumber} productTitle={reviewComposer.productTitle} review={reviewComposer.review} onClose={() => setReviewComposer(null)} onSaved={() => {
        setReviewComposer(null);
        if (currentUser && !currentUser.isGuest) void listMyProductReviews(currentUser.id).then(setMyReviews);
      }} />}

      {/* 2. Pickup Store Modal */}
      <AnimatePresence>
        {activeModal === 'pickupStore' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-[440px] max-h-[85vh] bg-white rounded-[28px] shadow-2xl flex flex-col z-10 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#ECF8F1] flex items-center justify-center text-[#16A34A]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-gray-900">Pickup Store</h3>
                    <p className="text-[11px] text-gray-400">Store pickup location and hours</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1 no-scrollbar">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-1 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#16A34A]">PICKUP LOCATION</span>
                      <span className="text-[9.5px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Store</span>
                    </div>
                    <div className="text-[12.5px] font-bold text-gray-900">{WORKSHOP_INFO.name} ({WORKSHOP_INFO.phone})</div>
                    <p className="text-[11.5px] text-gray-600">{WORKSHOP_INFO.address}</p>
                    <p className="text-[11px] text-gray-500 font-medium">{WORKSHOP_INFO.workingHours}</p>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Profile Modal */}
      <AnimatePresence>
        {activeModal === 'profile' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-[440px] max-h-[85vh] bg-white rounded-[28px] shadow-2xl flex flex-col z-10 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#FCE6E1] flex items-center justify-center text-[#E55845]">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-gray-900">Rider Profile</h3>
                    <p className="text-[11px] text-gray-400">Your Supabase customer profile</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1 no-scrollbar text-gray-800">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Registered Vehicles</label>
                  <input
                    type="text"
                    value={profileVehicle}
                    onChange={(e) => setProfileVehicle(e.target.value)}
                    className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                  />
                </div>

                <button
                  disabled={profileSaving}
                  onClick={() => void handleSaveProfile()}
                  className="w-full py-3 bg-[#D9232D] text-white text-[12.5px] font-bold rounded-xl shadow-sm mt-2 disabled:opacity-60"
                >
                  {profileSaving ? 'Saving…' : 'Save Profile'}
                </button>
                {profileMessage && <p className="text-center text-[11px] font-semibold text-gray-500">{profileMessage}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
