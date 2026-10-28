import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ShieldCheck,
  FileText,
  Camera,
  LockKeyhole,
  Trash2,
} from 'lucide-react';
import { CustomerOrderRecord, Product, UserProfile } from '../types';
import { listMyOrders } from '../lib/supabaseOrders';
import { listMyProductReviews, type ProductReviewRecord } from '../lib/supabaseReviews';
import { ReviewComposer } from './ReviewComposer';
import { CustomerOrdersModal, type BuyAgainResult } from './CustomerOrdersModal';
import { SettingsView } from './SettingsView';
import { SupportCenter } from './SupportCenter';
import { ContactSupportView } from './ContactSupportView';
import { PrivacyPolicyView } from './PrivacyPolicyView';
import { TermsConditionsView } from './TermsConditionsView';
import { WORKSHOP_INFO } from '../data/products';
import {
  getCheckoutVehicleCompanies,
  getCheckoutVehicleModels,
  parseVehicleFitmentValue,
  type CheckoutVehicleType,
} from '../lib/checkoutVehicleFitment';
import { deleteMyAvatar, getMyAuthEmail, getMyProfile, saveMyProfile, uploadMyAvatar } from '../lib/supabaseCustomer';
import { getInitials, validateProfileFields } from '../lib/profileValidation';
import { ConfirmDialog } from './ConfirmDialog';
import { PhoneNumberField } from './PhoneNumberField';
import { getPhoneCountry, validatePhoneNumber, type CountryCode } from '../utils/phoneValidation';
import { useI18n } from '../lib/i18n';
import { CloudLoader } from './CloudLoader';

interface AccountViewProps {
  currentUser?: UserProfile;
  isAdmin?: boolean;
  onOpenAdminPanel?: () => void;
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
  onOpenOrdersPage?: () => void;
  onSelectOrderRoute?: (orderSlug: string) => void;
  onBackToOrdersRoute?: () => void;
  onOpenSettingsPage?: () => void;
  onOpenSupportPage?: (requestId?: string) => void;
  onOpenContactSupport?: () => void;
  onSelectSupportRequest?: (requestId: string) => void;
  onBackFromContactSupport?: () => void;
  onOpenPrivacyPage?: () => void;
  onOpenTermsPage?: () => void;
  onExitRoutedPage?: () => void;
  routeModal?: 'orders' | 'settings' | 'support' | 'contact-support' | null;
  initialOrderSlug?: string | null;
  initialSupportRequestId?: string | null;
  onProfileChange?: (profile: Pick<UserProfile, 'name' | 'phone' | 'avatar' | 'vehicle'>) => void;
  onBuyAgain?: (order: CustomerOrderRecord) => Promise<BuyAgainResult>;
  products?: Product[];
  pwaInstallCard?: React.ReactNode;
}

export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  isAdmin = false,
  onOpenAdminPanel,
  onOpenLogin,
  onLogout,
  onContinueShopping,
  onBackToHome,
  onOpenWishlist,
  wishlistCount = 0,
  onOpenStoreInfo,
  onOpenShop,
  onOpenOrdersPage,
  onSelectOrderRoute,
  onBackToOrdersRoute,
  onOpenSettingsPage,
  onOpenSupportPage,
  onOpenContactSupport,
  onSelectSupportRequest,
  onBackFromContactSupport,
  onOpenPrivacyPage,
  onOpenTermsPage,
  onExitRoutedPage,
  routeModal = null,
  initialOrderSlug,
  initialSupportRequestId,
  onProfileChange,
  onBuyAgain,
  pwaInstallCard,
}) => {
  const { t } = useI18n();
  const handleGoHome = () => {
    if (onBackToHome) onBackToHome();
    else if (onContinueShopping) onContinueShopping();
  };
  const [activeModal, setActiveModal] = useState<'orders' | 'pickupStore' | 'settings' | 'support' | 'contact-support' | 'profile' | 'privacy' | 'terms' | null>(null);
  const previousRouteModal = useRef<'orders' | 'settings' | 'support' | 'contact-support' | null>(null);
  const [initialOrderSlugForModal, setInitialOrderSlugForModal] = useState<string | null>(null);

  useEffect(() => {
    if (routeModal) {
      previousRouteModal.current = routeModal;
      setActiveModal(routeModal);
      setInitialOrderSlugForModal(routeModal === 'orders' ? initialOrderSlug ?? null : null);
    } else if (previousRouteModal.current) {
      previousRouteModal.current = null;
      setActiveModal(null);
      setInitialOrderSlugForModal(null);
    }
  }, [initialOrderSlug, routeModal]);

  const closeRoutedPage = () => {
    setInitialOrderSlugForModal(null);
    setActiveModal(null);
    if (routeModal) onExitRoutedPage?.();
  };

  const isGuest = currentUser?.isGuest ?? false;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const [customerOrders, setCustomerOrders] = useState<CustomerOrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [myReviews, setMyReviews] = useState<ProductReviewRecord[]>([]);
  const [reviewComposer, setReviewComposer] = useState<{ productId: string; orderId: string; orderNumber: string; productTitle: string; review?: ProductReviewRecord } | null>(null);
  useEffect(() => {
    let active = true;
    if (activeModal !== 'orders') return () => { active = false; };
    const ordersUser = currentUserRef.current;
    if (!ordersUser || ordersUser.isGuest) {
      setCustomerOrders([]);
      setOrdersLoading(false);
      setOrdersError('');
      return () => { active = false; };
    }
    setOrdersError('');
    setOrdersLoading(true);
    void Promise.all([listMyOrders(ordersUser.id), listMyProductReviews(ordersUser.id)]).then(([orders, reviews]) => {
      if (active) {
        setCustomerOrders(orders);
        setMyReviews(reviews);
      }
    }).catch((error) => {
      if (active) setOrdersError(error instanceof Error ? error.message : 'Your order history could not be loaded.');
    }).finally(() => {
      if (active) setOrdersLoading(false);
    });
    return () => { active = false; };
  }, [activeModal, currentUser?.id, currentUser?.isGuest]);

  const refreshCustomerOrders = useCallback(async () => {
    const ordersUser = currentUserRef.current;
    if (!ordersUser || ordersUser.isGuest) return;
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const latestOrders = await listMyOrders(ordersUser.id);
      if (currentUserRef.current?.id !== ordersUser.id) return;
      setCustomerOrders(latestOrders);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Your order history could not be refreshed.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePhoneCountry, setProfilePhoneCountry] = useState<CountryCode>('IN');
  const [profilePhoneTouched, setProfilePhoneTouched] = useState(false);
  const [profileVehicle, setProfileVehicle] = useState('');
  const [profileVehicleType, setProfileVehicleType] = useState<CheckoutVehicleType>('Bike');
  const [profileVehicleCompany, setProfileVehicleCompany] = useState('');
  const [profileVehicleModel, setProfileVehicleModel] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState({ name: '', phone: '', phoneCountry: 'IN' as CountryCode, vehicle: '', avatar: null as string | null });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMetadataSyncFailed, setProfileMetadataSyncFailed] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [confirmProfileClose, setConfirmProfileClose] = useState(false);
  const profileSavingRef = useRef(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const profileVehicleCompanies = useMemo(
    () => getCheckoutVehicleCompanies(profileVehicleType),
    [profileVehicleType],
  );
  const profileVehicleModels = useMemo(
    () => getCheckoutVehicleModels(profileVehicleType, profileVehicleCompany),
    [profileVehicleType, profileVehicleCompany],
  );
  const selectedProfileVehicle = profileVehicleModels.find((model) => model.name === profileVehicleModel);
  const hydrateProfileVehicle = useCallback((value: string) => {
    const parsed = parseVehicleFitmentValue(value);
    setProfileVehicle(value);
    setProfileVehicleType(parsed.type);
    setProfileVehicleCompany(parsed.company);
    setProfileVehicleModel(parsed.model);
  }, []);
  const profileDirty = profileName !== profileSnapshot.name
    || profilePhone !== profileSnapshot.phone
    || profilePhoneCountry !== profileSnapshot.phoneCountry
    || profileVehicle !== profileSnapshot.vehicle
    || profileAvatarUrl !== profileSnapshot.avatar
    || profileAvatarFile !== null
    || profileMetadataSyncFailed;
  const profileFieldErrors = validateProfileFields({ full_name: profileName, phone: profilePhone, vehicle_model: profileVehicle, phoneCountry: profilePhoneCountry });
  const profilePhoneChanged = profilePhone.trim() !== profileSnapshot.phone.trim() || profilePhoneCountry !== profileSnapshot.phoneCountry;
  const profilePhoneError = profilePhoneTouched && profilePhoneChanged ? profileFieldErrors.phone : undefined;

  useEffect(() => {
    let active = true;
    if (activeModal !== 'profile') return () => { active = false; };
    const profileUser = currentUserRef.current;
    if (!profileUser || profileUser.isGuest) {
      setProfileName('');
      setProfilePhone('');
      setProfilePhoneCountry('IN');
      setProfilePhoneTouched(false);
      hydrateProfileVehicle('');
      setProfileEmail('');
      setProfileAvatarUrl(null);
      setProfileAvatarFile(null);
      setProfileSnapshot({ name: '', phone: '', phoneCountry: 'IN', vehicle: '', avatar: null });
      setProfileMetadataSyncFailed(false);
      setProfileLoading(false);
      return () => { active = false; };
    }
    const fallback = {
      name: profileUser.name || '',
      phone: profileUser.phone || '',
      phoneCountry: getPhoneCountry(profileUser.phone || ''),
      vehicle: profileUser.vehicle || '',
      avatar: profileUser.avatar || null,
    };
    setProfileName(fallback.name);
    setProfilePhone(fallback.phone);
    setProfilePhoneCountry(getPhoneCountry(fallback.phone));
    setProfilePhoneTouched(false);
    hydrateProfileVehicle(fallback.vehicle);
    setProfileEmail(profileUser.email || '');
    setProfileAvatarUrl(fallback.avatar);
    setProfileAvatarFile(null);
    setProfileSnapshot(fallback);
    setProfileMetadataSyncFailed(false);
    setProfileMessage('');
    setProfileLoading(true);
    void Promise.all([getMyProfile(profileUser.id), getMyAuthEmail()]).then(([profile, email]) => {
      if (!active) return;
      const loaded = {
        name: profile?.full_name?.trim() || fallback.name,
        phone: profile?.phone || fallback.phone,
        phoneCountry: getPhoneCountry(profile?.phone || fallback.phone),
        vehicle: profile?.vehicle_model || fallback.vehicle,
        avatar: profile?.avatar_url || fallback.avatar,
      };
      setProfileName(loaded.name);
      setProfilePhone(loaded.phone);
      setProfilePhoneCountry(loaded.phoneCountry);
      setProfilePhoneTouched(false);
      hydrateProfileVehicle(loaded.vehicle);
      setProfileEmail(email || profileUser.email || '');
      setProfileAvatarUrl(loaded.avatar);
      setProfileSnapshot(loaded);
    }).catch(() => {
      if (active) setProfileMessage('Could not load the saved profile. You can still edit and try saving.');
    }).finally(() => {
      if (active) setProfileLoading(false);
    });
    return () => { active = false; };
  }, [activeModal, currentUser?.id, currentUser?.isGuest, hydrateProfileVehicle]);

  const handleSaveProfile = async () => {
    if (!currentUser || currentUser.isGuest || profileSavingRef.current) return;
    setProfilePhoneTouched(true);
    const errors = validateProfileFields({ full_name: profileName, phone: profilePhoneChanged ? profilePhone : '', vehicle_model: profileVehicle, phoneCountry: profilePhoneCountry });
    if (Object.keys(errors).length > 0) return;
    profileSavingRef.current = true;
    setProfileSaving(true);
    setProfileMessage('');
    let uploadedAvatarUrl: string | null = null;
    try {
      let nextAvatarUrl = profileAvatarUrl;
      if (profileAvatarFile) {
        const upload = await uploadMyAvatar(profileAvatarFile);
        if (upload.error || !upload.data) throw upload.error || new Error('Avatar upload failed. Please try again.');
        uploadedAvatarUrl = upload.data.url;
        nextAvatarUrl = upload.data.url;
      }
      const cleanName = profileName.trim();
      const phoneChanged = profilePhoneChanged;
      const cleanPhone = phoneChanged
        ? (profilePhone.trim() ? validatePhoneNumber(profilePhone, profilePhoneCountry).e164 || profilePhone.trim() : '')
        : profileSnapshot.phone;
      const cleanVehicle = profileVehicle.trim();
      const { error, metadataError } = await saveMyProfile({
        full_name: cleanName,
        phone: cleanPhone,
        avatar_url: nextAvatarUrl,
        vehicle_model: cleanVehicle,
      });
      if (error) {
        if (uploadedAvatarUrl) {
          try { await deleteMyAvatar(uploadedAvatarUrl); } catch { /* The failed profile save remains the primary error. */ }
        }
        throw error;
      }
      let warning = '';
      if (profileSnapshot.avatar && profileSnapshot.avatar !== nextAvatarUrl) {
        try {
          const removed = await deleteMyAvatar(profileSnapshot.avatar);
          if (removed.error) warning = ' Profile saved, but the previous photo could not be deleted.';
        } catch {
          warning = ' Profile saved, but the previous photo could not be deleted.';
        }
      }
      const updated = { name: cleanName, phone: cleanPhone, phoneCountry: getPhoneCountry(cleanPhone), vehicle: cleanVehicle, avatar: nextAvatarUrl };
      setProfileName(updated.name);
      setProfilePhone(updated.phone);
      setProfilePhoneCountry(updated.phoneCountry);
      setProfilePhoneTouched(false);
      setProfileVehicle(updated.vehicle);
      setProfileAvatarFile(null);
      setProfileAvatarUrl(updated.avatar);
      setProfileSnapshot(updated);
      setProfileMetadataSyncFailed(Boolean(metadataError));
      onProfileChange?.({ name: updated.name, phone: updated.phone, vehicle: updated.vehicle, avatar: updated.avatar || undefined });
      setProfileMessage(metadataError
        ? `Profile saved, but account details could not be synced. Please try saving again.${warning}`
        : `Profile saved.${warning}`);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Unable to save profile. Please try again.');
    } finally {
      profileSavingRef.current = false;
      setProfileSaving(false);
    }
  };

  const handleAvatarFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage('Choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage('The original image must be 5 MB or smaller.');
      return;
    }
    if (file.size === 0) {
      setProfileMessage('The selected image is empty. Choose another file.');
      return;
    }
    setProfileMessage('');
    setProfileAvatarFile(file);
    setProfileAvatarUrl(URL.createObjectURL(file));
  };

  useEffect(() => {
    if (!profileAvatarUrl?.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(profileAvatarUrl);
  }, [profileAvatarUrl]);

  const closeProfileModal = () => {
    setConfirmProfileClose(false);
    setProfileAvatarFile(null);
    setProfileAvatarUrl(profileSnapshot.avatar);
    setActiveModal(null);
  };

  const requestCloseProfile = () => {
    if (profileSavingRef.current) return;
    if (profileDirty) setConfirmProfileClose(true);
    else closeProfileModal();
  };

  const handleProtectedAction = (modalType: 'orders' | 'pickupStore' | 'settings' | 'profile' | 'privacy' | 'terms') => {
    if (isGuest && (modalType === 'orders' || modalType === 'pickupStore' || modalType === 'profile')) {
      if (modalType === 'orders' && onOpenOrdersPage) return onOpenOrdersPage();
      if (onOpenLogin) onOpenLogin();
      else if (modalType !== 'profile') setActiveModal(modalType);
    } else {
      if (modalType === 'orders' && onOpenOrdersPage) return onOpenOrdersPage();
      if (modalType === 'settings' && onOpenSettingsPage) return onOpenSettingsPage();
      if (modalType === 'privacy' && onOpenPrivacyPage) return onOpenPrivacyPage();
      if (modalType === 'terms' && onOpenTermsPage) return onOpenTermsPage();
      if (modalType === 'pickupStore' && onOpenStoreInfo) return onOpenStoreInfo();
      setActiveModal(modalType);
    }
  };


  if (activeModal === 'support') {
    return (
      <SupportCenter
        currentUserId={currentUser?.id || ''}
        customerName={currentUser?.name}
        isAuthenticated={Boolean(currentUser && !currentUser.isGuest)}
        initialRequestId={initialSupportRequestId}
        onBack={closeRoutedPage}
        onOpenLogin={onOpenLogin}
        onSelectRequest={onSelectSupportRequest ?? (() => undefined)}
      />
    );
  }

  if (activeModal === 'contact-support') {
    return <ContactSupportView
      currentUserId={currentUser?.id || ''}
      isAuthenticated={Boolean(currentUser && !currentUser.isGuest)}
      onBack={onBackFromContactSupport ?? closeRoutedPage}
      onOpenLogin={onOpenLogin}
      onOpenSupportRequest={onSelectSupportRequest}
      onOpenSupportRequests={() => onOpenSupportPage?.()}
    />;
  }

  if (activeModal === 'settings') {
    return (
      <SettingsView
        onBack={closeRoutedPage}
        onLogout={onLogout}
        isAuthenticated={Boolean(currentUser && !currentUser.isGuest)}
        onOpenOrders={onOpenOrdersPage ?? (() => setActiveModal('orders'))}
        currentUserId={currentUser?.id}
        onOpenSupportRequests={() => onOpenSupportPage?.()}
        onOpenContactSupport={onOpenContactSupport}
        onOpenWishlist={onOpenWishlist}
        onOpenStoreInfo={onOpenStoreInfo}
        onOpenShop={onOpenShop}
        onOpenPrivacyPage={onOpenPrivacyPage}
        onOpenTermsPage={onOpenTermsPage}
        pwaInstallCard={pwaInstallCard}
      />
    );
  }

  if (activeModal === 'privacy') {
    return (
      <PrivacyPolicyView
        onBack={closeRoutedPage}
        onOpenStoreInfo={onOpenStoreInfo}
      />
    );
  }

  if (activeModal === 'terms') {
    return (
      <TermsConditionsView
        onBack={closeRoutedPage}
        onOpenStoreInfo={onOpenStoreInfo}
      />
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4 pb-12 animate-fade-in text-slate-800">
      {/* Account Page Title & Avatar */}
      <section className="px-5 pt-3 pb-2 flex justify-between items-start" data-purpose="account-header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">{t('account.title')}</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 tracking-tight">
            {isGuest ? t('account.guestSubtitle') : t('account.subtitle')}
          </p>
        </div>
        {/* User Avatar / Profile Icon Button */}
        <button
          type="button"
          onClick={() => handleProtectedAction('profile')}
          aria-label={t('account.profile')}
          className="min-h-11 min-w-11 h-11 w-11 rounded-full bg-[#FCE6E1] flex items-center justify-center transition-transform active:scale-95 text-slate-700 shadow-xs hover:bg-[#FCD8CF]"
        >
          {currentUser?.avatar
            ? <img src={currentUser.avatar} alt={`${currentUser.name || 'Rider'} avatar`} className="h-full w-full rounded-full object-cover" />
            : <span aria-hidden="true" className="text-sm font-black text-[#D9232D]">{getInitials(currentUser?.name || '')}</span>}
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
                {t('account.unlock')}
              </h4>
              <p className="text-[11.5px] text-gray-600 font-medium mt-0.5">
                {t('account.loginHint')}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenLogin}
            className="min-h-11 w-full sm:w-auto px-4 py-2 bg-[#D9232D] hover:bg-[#C01B24] active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center space-x-1.5 flex-shrink-0"
          >
            <span>{t('account.login')}</span>
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
                  className="min-h-11 inline-flex items-center justify-between bg-[#FEE5DF] hover:bg-[#FCD7CE] text-zinc-900 rounded-full pl-3.5 pr-1.5 py-1.5 transition-all shadow-sm group active:scale-95"
                >
                  <span className="text-xs font-semibold text-slate-900 tracking-tight mr-2">{t('account.continueShopping')}</span>
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
        <section className="space-y-2.5 pt-0.5" data-purpose="account-categories">
          <h2 className="px-1 text-base font-bold tracking-tight text-slate-900">Your account</h2>
          <div className="grid grid-cols-4 gap-2.5" data-purpose="quick-navigation-grid">
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
              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight leading-none">{t('account.myOrders')}</h3>
              <p className="text-[10px] text-slate-500 font-normal mt-1 leading-none">{t('account.ordersHint')}</p>
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
              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight leading-none">{t('account.wishlist')}</h3>
              <p className="text-[10px] text-slate-500 font-normal mt-1 leading-none">
                {wishlistCount > 0 ? t('account.savedCount', { count: wishlistCount }) : t('account.savedItems')}
              </p>
            </div>
            <svg className="w-3 h-3 text-slate-700 absolute bottom-3 right-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 3. Profile details (Soft Rose) */}
          <button
            type="button"
            onClick={() => handleProtectedAction('profile')}
            aria-label={t('account.profile')}
            className="bg-[#FDECE9] hover:bg-[#FCD8CF] rounded-2xl p-2.5 flex flex-col justify-between aspect-[1/1.08] relative group active:scale-95 transition-transform shadow-xs text-left"
          >
            <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#E55845]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight leading-none">{t('account.profile')}</h3>
              <p className="text-[10px] text-slate-500 font-normal mt-1 leading-none">{t('account.personalDetails')}</p>
            </div>
            <svg className="w-3 h-3 text-slate-700 absolute bottom-3 right-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* 4. Settings (Soft Purple) */}
          <button
            type="button"
            onClick={() => handleProtectedAction('settings')}
            className="bg-[#F3EEFD] hover:bg-[#EAE1FB] rounded-2xl p-2.5 flex flex-col justify-between aspect-[1/1.08] relative group active:scale-95 transition-transform shadow-xs text-left"
          >
            <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#7C3AED]">
              <Settings className="w-4 h-4 text-[#7C3AED] fill-[#7C3AED]" />
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-slate-800 tracking-tight leading-none">{t('account.settings')}</h3>
              <p className="text-[10px] text-slate-500 font-normal mt-1 leading-none">{t('account.preferences')}</p>
            </div>
            <svg className="w-3 h-3 text-slate-700 absolute bottom-3 right-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          </div>
        </section>
        {/* END: QuickActionsGrid */}

        {/* BEGIN: NeedHelpSection */}
        <section className="pt-2" data-purpose="help-section">
          <div className="flex justify-between items-center px-1 mb-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">{t('account.needHelp')}</h2>
            <button
              type="button"
              onClick={onOpenContactSupport}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center"
            >
              {t('account.getSupport')}
              <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* WhatsApp Support Card */}
          <div className="bg-white rounded-2xl p-3.5 flex items-center justify-between border border-emerald-100/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#25D366] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <MessageCircle className="w-6 h-6 fill-white text-[#25D366]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">{t('account.chatWhatsApp')}</h3>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">{t('account.quickAnswers')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenContactSupport}
              className="min-h-11 bg-[#1EB754] hover:bg-[#16A34A] text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center space-x-1 transition-colors flex-shrink-0"
            >
              <span>{t('account.chatNow')}</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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
                  <span className="truncate">{WORKSHOP_INFO.workingHours}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
                  <span className="truncate">{WORKSHOP_INFO.address}</span>
                </div>
              </div>
              {/* Get directions pill button */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(WORKSHOP_INFO.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 bg-[#FEE5DF] hover:bg-[#FCD8CF] text-[#C83F2D] text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
                >
                  <span>Get directions</span>
                  <svg className="w-3 h-3 text-[#C83F2D]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => handleProtectedAction('pickupStore')}
                  className="inline-flex items-center space-x-1.5 bg-[#ECF8F1] hover:bg-[#DCF2E4] text-[#15803D] text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
                >
                  <span>Pickup details</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
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
          {isAdmin && onOpenAdminPanel && <button type="button" onClick={onOpenAdminPanel} className="w-full bg-[#FFF3E8] rounded-2xl p-3.5 flex items-center justify-between border border-orange-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:bg-orange-50 transition-colors text-left cursor-pointer"><div className="flex items-center space-x-3"><div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700 flex-shrink-0"><ShieldCheck className="w-5 h-5" /></div><div><h3 className="text-sm font-bold text-slate-900 leading-tight">Go to admin panel</h3><p className="text-[11px] text-slate-500 font-normal mt-0.5">Manage products, orders and support</p></div></div><ChevronRight className="w-4 h-4 text-slate-400" /></button>}

          {/* Privacy Policy Card */}
          <button
            type="button"
            onClick={() => handleProtectedAction('privacy')}
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
            onClick={() => handleProtectedAction('terms')}
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
      <AnimatePresence>
        {activeModal === 'orders' && (
          <CustomerOrdersModal
            orders={customerOrders}
            reviews={myReviews}
            loading={ordersLoading}
            error={ordersError}
            customerName={currentUser?.name || ''}
            currentUserId={currentUser?.id || ''}
            initialOrderSlug={initialOrderSlugForModal}
            onSelectOrderRoute={onSelectOrderRoute}
            onBackToOrdersRoute={onBackToOrdersRoute}
            onClose={closeRoutedPage}
            onRefresh={refreshCustomerOrders}
            onBuyAgain={onBuyAgain}
            onReview={(order, productId, productTitle, review) =>
              setReviewComposer({
                productId,
                orderId: order.id,
                orderNumber: order.order_number,
                productTitle,
                review,
              })
            }
          />
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={requestCloseProfile} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-[440px] max-h-[85vh] bg-white rounded-[28px] shadow-2xl flex flex-col z-10 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#FCE6E1] flex items-center justify-center text-[#E55845]">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="profile-modal-title" className="text-[15px] font-black text-gray-900">Rider Profile</h3>
                    <p className="text-[11px] text-gray-400">Your Supabase customer profile</p>
                  </div>
                </div>
                <button type="button" onClick={requestCloseProfile} disabled={profileSaving} aria-label="Close profile editor" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-50">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1 no-scrollbar text-gray-800">
                {profileLoading && <CloudLoader label="Loading profile…" className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3" />}
                <div className="flex items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-[#FCE6E1] text-lg font-black text-[#D9232D] shadow-sm">
                    {profileAvatarUrl
                      ? <img src={profileAvatarUrl} alt={`${profileName || 'Rider'} profile photo`} className="h-full w-full object-cover" />
                      : <span aria-label={`${getInitials(profileName)} initials`}>{getInitials(profileName)}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-gray-900">Profile photo</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">Image files up to 5 MB. Saved as a square WebP.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input ref={avatarFileInputRef} type="file" accept="image/*" aria-label="Choose profile photo" className="sr-only" onChange={handleAvatarFile} />
                      <button type="button" aria-label="Upload profile photo" disabled={profileSaving || profileLoading} onClick={() => avatarFileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9232D] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                        <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Change photo
                      </button>
                      {(profileAvatarUrl || profileAvatarFile) && <button type="button" aria-label="Remove profile photo" disabled={profileSaving || profileLoading} onClick={() => { setProfileAvatarFile(null); setProfileAvatarUrl(null); setProfileMessage(''); }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-bold text-[#D9232D] disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove photo
                      </button>}
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="profile-name" className="text-[11px] font-bold text-gray-700 block mb-1">Your Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={50}
                    autoComplete="name"
                    value={profileName}
                    onChange={(e) => { setProfileName(e.target.value); setProfileMessage(''); }}
                    aria-invalid={Boolean(profileFieldErrors.full_name)}
                    aria-describedby={profileFieldErrors.full_name ? 'profile-name-error' : undefined}
                    disabled={profileLoading || profileSaving}
                    className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                  />
                  {profileFieldErrors.full_name && <p id="profile-name-error" role="alert" className="mt-1 text-[10px] font-medium text-red-600">{profileFieldErrors.full_name}</p>}
                </div>
                <div>
                  <PhoneNumberField
                    id="profile-phone"
                    label="Phone Number (optional)"
                    value={profilePhone}
                    country={profilePhoneCountry}
                    onChange={(value) => { setProfilePhone(value); setProfileMessage(''); }}
                    onCountryChange={setProfilePhoneCountry}
                    onBlur={() => setProfilePhoneTouched(true)}
                    error={profilePhoneError}
                    placeholder="Enter phone number"
                    disabled={profileLoading || profileSaving}
                  />
                </div>
                <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3" aria-label="Vehicle fitment">
                  <div>
                    <p className="text-[11px] font-bold text-gray-700">Vehicle for fitment <span className="font-normal text-gray-400">(optional)</span></p>
                    <p className="mt-1 text-[10px] leading-relaxed text-gray-500">Choose a company first to see its models and photo.</p>
                  </div>
                  <label htmlFor="profile-vehicle-type" className="block text-[10px] font-semibold text-gray-600">{t('checkout.vehicleType')}
                    <select
                      id="profile-vehicle-type"
                      value={profileVehicleType}
                      onChange={(event) => {
                        setProfileVehicleType(event.target.value as CheckoutVehicleType);
                        setProfileVehicleCompany('');
                        setProfileVehicleModel('');
                        setProfileVehicle('');
                        setProfileMessage('');
                      }}
                      disabled={profileLoading || profileSaving}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[12px] font-semibold text-gray-900 outline-none focus:border-[#D9232D]"
                    >
                      {(['Bike', 'Scooter', 'Toto / E-rickshaw', 'Car', 'Other'] as CheckoutVehicleType[]).map((type) => (
                        <option key={type} value={type}>{type === 'Bike' ? t('checkout.vehicleBike') : type === 'Scooter' ? t('checkout.vehicleScooter') : type === 'Toto / E-rickshaw' ? t('checkout.vehicleToto') : type === 'Car' ? t('checkout.vehicleCar') : t('checkout.vehicleOther')}</option>
                      ))}
                    </select>
                  </label>
                  {profileVehicleCompanies.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label htmlFor="profile-vehicle-company" className="block text-[10px] font-semibold text-gray-600">{t('checkout.vehicleCompany')}
                        <select
                          id="profile-vehicle-company"
                          value={profileVehicleCompany}
                          onChange={(event) => {
                            setProfileVehicleCompany(event.target.value);
                            setProfileVehicleModel('');
                            setProfileVehicle('');
                            setProfileMessage('');
                          }}
                          disabled={profileLoading || profileSaving}
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[12px] font-semibold text-gray-900 outline-none focus:border-[#D9232D]"
                        >
                          <option value="">{t('checkout.chooseCompany')}</option>
                          {profileVehicleCompanies.map((company) => <option key={company} value={company}>{company}</option>)}
                        </select>
                      </label>
                      <label htmlFor="profile-vehicle-model" className="block text-[10px] font-semibold text-gray-600">{t('checkout.vehicleModel')} <span className="font-normal text-gray-400">(optional)</span>
                        <select
                          id="profile-vehicle-model"
                          value={profileVehicleModel}
                          onChange={(event) => {
                            const model = event.target.value;
                            setProfileVehicleModel(model);
                            setProfileVehicle(model ? `${profileVehicleType} · ${profileVehicleCompany} · ${model}` : '');
                            setProfileMessage('');
                          }}
                          disabled={profileLoading || profileSaving || !profileVehicleCompany}
                          aria-invalid={Boolean(profileFieldErrors.vehicle_model)}
                          aria-describedby={profileFieldErrors.vehicle_model ? 'profile-vehicle-error' : undefined}
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[12px] font-semibold text-gray-900 outline-none focus:border-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="">{profileVehicleCompany ? t('checkout.chooseVehicleModel') : t('checkout.chooseCompany')}</option>
                          {profileVehicleModels.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="profile-vehicle" className="mb-1 block text-[10px] font-semibold text-gray-600">Vehicle Model <span className="font-normal text-gray-400">(optional)</span></label>
                      <input
                        id="profile-vehicle"
                        type="text"
                        maxLength={60}
                        value={profileVehicle}
                        onChange={(event) => { setProfileVehicle(event.target.value); setProfileMessage(''); }}
                        aria-invalid={Boolean(profileFieldErrors.vehicle_model)}
                        aria-describedby={profileFieldErrors.vehicle_model ? 'profile-vehicle-error' : undefined}
                        disabled={profileLoading || profileSaving}
                        placeholder={t('checkout.exampleVehicle')}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[12px] text-gray-900 outline-none focus:border-[#D9232D]"
                      />
                    </div>
                  )}
                  {selectedProfileVehicle && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5">
                      {selectedProfileVehicle.image ? (
                        <div className="h-[72px] w-32 shrink-0 overflow-hidden rounded-lg bg-white"><img src={selectedProfileVehicle.image} alt={selectedProfileVehicle.name} className="h-full w-full scale-110 object-contain" /></div>
                      ) : (
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white text-2xl">🛺</div>
                      )}
                      <div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-800">{t('checkout.selectedVehicle')}</p><p className="mt-1 truncate text-[10px] font-semibold text-gray-500">{selectedProfileVehicle.brand}</p><p className="break-words text-xs font-black leading-snug text-gray-900">{selectedProfileVehicle.name}</p></div>
                    </div>
                  )}
                  {profileFieldErrors.vehicle_model && <p id="profile-vehicle-error" role="alert" className="text-[10px] font-medium text-red-600">{profileFieldErrors.vehicle_model}</p>}
                </section>
                <div>
                  <label htmlFor="profile-email" className="text-[11px] font-bold text-gray-700 block mb-1">Email</label>
                  <div className="relative">
                    <input id="profile-email" type="email" value={profileEmail} readOnly disabled aria-describedby="profile-email-hint" className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 pr-9 text-[12.5px] text-gray-500 disabled:cursor-not-allowed" />
                    <LockKeyhole className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  </div>
                  <p id="profile-email-hint" className="mt-1 text-[10px] text-gray-500">Email cannot be changed</p>
                </div>

                <button
                  type="button"
                  aria-label="Save profile changes"
                  disabled={profileSaving || profileLoading || !profileDirty || Object.keys(profileFieldErrors).length > 0}
                  onClick={() => void handleSaveProfile()}
                  className="w-full py-3 bg-[#D9232D] text-white text-[12.5px] font-bold rounded-xl shadow-sm mt-2 disabled:opacity-60"
                >
                  {profileSaving ? 'Saving…' : profileLoading ? 'Loading…' : 'Save Profile'}
                </button>
                {profileMessage && <p role="status" className={`text-center text-[11px] font-semibold ${profileMessage.toLowerCase().includes('saved') && !profileMessage.toLowerCase().includes('could not') ? 'text-emerald-700' : 'text-red-600'}`}>{profileMessage}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmDialog
        open={confirmProfileClose}
        title="Discard profile changes?"
        message="You have unsaved changes to your profile. Close without saving?"
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onCancel={() => setConfirmProfileClose(false)}
        onConfirm={closeProfileModal}
      />
    </div>
  );
};
