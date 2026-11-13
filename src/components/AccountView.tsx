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
  Star,
  ShoppingBag,
  Sparkles,
  LogOut,
  ArrowLeft,
  Bell,
  Pencil,
  SlidersHorizontal,
  ExternalLink,
  Bike,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { CustomerOrderRecord, Product, UserProfile } from '../types';
import { getMyOrderBySlug, listMyOrders } from '../lib/supabaseOrders';
import { listMyProductReviews, type ProductReviewRecord } from '../lib/supabaseReviews';
import { ReviewComposer } from './ReviewComposer';
import { AvatarCropModal } from './AvatarCropModal';
import { CustomerOrdersModal, type BuyAgainResult } from './CustomerOrdersModal';
import { SettingsView } from './SettingsView';
import { SupportCenter } from './SupportCenter';
import { ContactSupportView } from './ContactSupportView';
import { OrderHelpSupportView } from './OrderHelpSupportView';
import { PrivacyPolicyView } from './PrivacyPolicyView';
import { TermsConditionsView } from './TermsConditionsView';
import { WORKSHOP_INFO } from '../data/products';
import type { SettingsSectionRoute } from '../lib/appRoutes';
import {
  getCheckoutVehicleCompanies,
  getCheckoutVehicleModels,
  parseVehicleFitmentValue,
  resolveVehicleFitment,
  type CheckoutVehicleType,
} from '../lib/checkoutVehicleFitment';
import {
  getCachedVehicleModels,
  loadVehicleModels,
  slugifyVehicleModelName,
  VEHICLE_CATALOG_CHANGED_EVENT,
  type VehicleCatalogModel,
} from '../lib/supabaseVehicleCatalog';
import { deleteMyAvatar, getMyAuthEmail, getMyProfile, saveMyProfile, uploadMyAvatar } from '../lib/supabaseCustomer';
import { getInitials, validateProfileFields } from '../lib/profileValidation';
import { ConfirmDialog } from './ConfirmDialog';
import { PhoneNumberField } from './PhoneNumberField';
import { VehicleModelPicker } from './VehicleModelPicker';
import { getPhoneCountry, validatePhoneNumber, type CountryCode } from '../utils/phoneValidation';
import { useI18n } from '../lib/i18n';
import { AccountPageSkeleton, AccountProfileEditorSkeleton } from './AccountPageSkeleton';

interface AccountViewProps {
  currentUser?: UserProfile;
  isLoading?: boolean;
  isAdmin?: boolean;
  onOpenAdminPanel?: () => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onContinueShopping?: () => void;
  onBackToHome?: () => void;
  onOpenWishlist: () => void;
  wishlistCount?: number;
  notificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenProduct?: (p: Product) => void;
  onOpenStoreInfo?: () => void;
  onOpenCustomBuilder?: () => void;
  onOpenShop?: () => void;
  onOpenOrdersPage?: () => void;
  onOpenProfileEditPage?: () => void;
  onSelectOrderRoute?: (orderSlug: string) => void;
  onBackToOrdersRoute?: () => void;
  helpOrderSlug?: string | null;
  onOpenOrderHelp?: (order: CustomerOrderRecord) => void;
  onCloseOrderHelp?: (orderSlug: string) => void;
  onOpenSettingsPage?: () => void;
  onOpenCouponsPage?: () => void;
  onOpenSupportPage?: (requestId?: string) => void;
  onOpenContactSupport?: (orderSlug?: string, relatedOrderId?: string) => void;
  onSelectSupportRequest?: (requestId: string) => void;
  onBackFromContactSupport?: () => void;
  onOpenPrivacyPage?: () => void;
  onOpenTermsPage?: () => void;
  onOpenPersonalData?: () => void;
  settingsSection?: SettingsSectionRoute | null;
  onOpenSettingsSection?: (section: SettingsSectionRoute) => void;
  onCloseSettingsSection?: () => void;
  onExitRoutedPage?: () => void;
  routeModal?: 'orders' | 'settings' | 'support' | 'contact-support' | 'profile' | null;
  initialOrderSlug?: string | null;
  initialSupportRequestId?: string | null;
  initialSupportOrderId?: string | null;
  onProfileChange?: (profile: Pick<UserProfile, 'name' | 'phone' | 'avatar' | 'vehicle'>) => void;
  onBuyAgain?: (order: CustomerOrderRecord) => Promise<BuyAgainResult>;
  products?: Product[];
  pwaInstallCard?: React.ReactNode;
}

export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  isLoading = false,
  isAdmin = false,
  onOpenAdminPanel,
  onOpenLogin,
  onLogout,
  onOpenWishlist,
  wishlistCount = 0,
  notificationCount = 0,
  onOpenNotifications,
  onOpenStoreInfo,
  onOpenShop,
  onOpenCustomBuilder,
  onOpenOrdersPage,
  onOpenProfileEditPage,
  onSelectOrderRoute,
  onBackToOrdersRoute,
  helpOrderSlug = null,
  onOpenOrderHelp,
  onCloseOrderHelp,
  onOpenSettingsPage,
  onOpenCouponsPage,
  onOpenSupportPage,
  onOpenContactSupport,
  onSelectSupportRequest,
  onBackFromContactSupport,
  onOpenPrivacyPage,
  onOpenTermsPage,
  onOpenPersonalData,
  settingsSection = null,
  onOpenSettingsSection,
  onCloseSettingsSection,
  onExitRoutedPage,
  routeModal = null,
  initialOrderSlug,
  initialSupportRequestId,
  initialSupportOrderId,
  onProfileChange,
  onBuyAgain,
  pwaInstallCard,
}) => {
  const { t } = useI18n();
  const [activeModal, setActiveModal] = useState<'orders' | 'pickupStore' | 'settings' | 'support' | 'contact-support' | 'profile' | 'privacy' | 'terms' | null>(null);
  const previousRouteModal = useRef<'orders' | 'settings' | 'support' | 'contact-support' | 'profile' | null>(null);
  const [initialOrderSlugForModal, setInitialOrderSlugForModal] = useState<string | null>(null);
  const [helpOrder, setHelpOrder] = useState<CustomerOrderRecord | null>(null);

  useEffect(() => {
    if (activeModal !== 'orders' && helpOrder) setHelpOrder(null);
  }, [activeModal, helpOrder]);

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
  const [summaryLoading, setSummaryLoading] = useState(() => Boolean(currentUser && !currentUser.isGuest));
  const [heroAvatarLoaded, setHeroAvatarLoaded] = useState(false);
  const [vehicleCatalog, setVehicleCatalog] = useState<VehicleCatalogModel[]>(() => getCachedVehicleModels());
  const [garageImgError, setGarageImgError] = useState(false);
  const [reviewComposer, setReviewComposer] = useState<{ productId: string; orderId: string; orderNumber: string; productTitle: string; review?: ProductReviewRecord } | null>(null);

  useEffect(() => {
    setHeroAvatarLoaded(false);
  }, [currentUser?.avatar]);

  useEffect(() => {
    let active = true;
    const syncCatalog = () => {
      void loadVehicleModels().then(({ data }) => {
        if (active && data.length) setVehicleCatalog(data);
      });
    };
    syncCatalog();
    if (typeof window === 'undefined') return () => { active = false; };
    window.addEventListener(VEHICLE_CATALOG_CHANGED_EVENT, syncCatalog);
    return () => {
      active = false;
      window.removeEventListener(VEHICLE_CATALOG_CHANGED_EVENT, syncCatalog);
    };
  }, []);
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

  // Keep the order help overlay in sync with /my-order/order/:slug/order-need-help.
  // The orders modal stays mounted underneath, so its scroll position survives the round trip.
  useEffect(() => {
    if (!helpOrderSlug) {
      setHelpOrder((current) => (current ? null : current));
      return;
    }
    const normalizedSlug = helpOrderSlug.toLowerCase();
    if (helpOrder?.order_slug?.toLowerCase() === normalizedSlug) return;
    const fromList = customerOrders.find((order) => order.order_slug?.toLowerCase() === normalizedSlug);
    if (fromList) {
      setHelpOrder(fromList);
      return;
    }
    if (!currentUser || currentUser.isGuest) return;
    let active = true;
    void getMyOrderBySlug(currentUser.id, normalizedSlug)
      .then((order) => { if (active && order) setHelpOrder(order); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [helpOrderSlug, helpOrder, customerOrders, currentUser]);

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

  // Load live order and review counts for the account page summary; the orders
  // modal refreshes the same lists again when it opens.
  useEffect(() => {
    let active = true;
    const summaryUser = currentUserRef.current;
    if (!summaryUser || summaryUser.isGuest) {
      setCustomerOrders([]);
      setMyReviews([]);
      setSummaryLoading(false);
      return () => { active = false; };
    }
    setSummaryLoading(true);
    void Promise.all([
      listMyOrders(summaryUser.id).catch(() => null),
      listMyProductReviews(summaryUser.id).catch(() => null),
    ]).then(([orders, reviews]) => {
      if (!active) return;
      if (orders) setCustomerOrders(orders);
      if (reviews) setMyReviews(reviews);
    }).finally(() => {
      if (active) setSummaryLoading(false);
    });
    return () => { active = false; };
  }, [currentUser?.id, currentUser?.isGuest]);

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
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState({ name: '', phone: '', phoneCountry: 'IN' as CountryCode, vehicle: '', avatar: null as string | null });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMetadataSyncFailed, setProfileMetadataSyncFailed] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [confirmProfileClose, setConfirmProfileClose] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const profileSavingRef = useRef(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const profileVehicleCompanies = useMemo(
    () => getCheckoutVehicleCompanies(profileVehicleType, vehicleCatalog),
    [profileVehicleType, vehicleCatalog],
  );
  const profileVehicleModels = useMemo(
    () => getCheckoutVehicleModels(profileVehicleType, profileVehicleCompany, vehicleCatalog),
    [profileVehicleType, profileVehicleCompany, vehicleCatalog],
  );
  const hydrateProfileVehicle = useCallback((value: string) => {
    const parsed = parseVehicleFitmentValue(value, vehicleCatalog);
    setProfileVehicle(value);
    setProfileVehicleType(parsed.type);
    setProfileVehicleCompany(parsed.company);
    setProfileVehicleModel(parsed.model);
  }, [vehicleCatalog]);
  const garageFitment = useMemo(
    () => (currentUser?.vehicle?.trim() ? resolveVehicleFitment(currentUser.vehicle, vehicleCatalog) : null),
    [currentUser?.vehicle, vehicleCatalog],
  );
  const garageImageSrc = useMemo(() => {
    if (garageFitment?.image) return garageFitment.image;
    const raw = currentUser?.vehicle?.trim();
    if (!raw) return '';
    const parts = raw.split('·').map((part) => part.trim()).filter(Boolean);
    const firstLower = parts[0]?.toLowerCase() || '';
    if (firstLower === 'car' || firstLower === 'toto / e-rickshaw' || firstLower === 'other') return '';
    const modelText = garageFitment?.model || (parts.length > 1 ? parts[parts.length - 1] : parts[0]) || '';
    const slug = slugifyVehicleModelName(modelText);
    return slug ? `/vehicle-models/${slug}.webp` : '';
  }, [currentUser?.vehicle, garageFitment]);
  useEffect(() => {
    setGarageImgError(false);
  }, [garageImageSrc]);
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

  const accountProfileCompletion = useMemo(() => {
    if (!currentUser || currentUser.isGuest) {
      return { percent: 0, missingLabel: 'Sign in to sync your garage & orders' };
    }
    const hasName = Boolean(currentUser.name?.trim());
    const hasPhone = Boolean(currentUser.phone?.trim());
    const hasVehicle = Boolean(currentUser.vehicle?.trim());
    const hasAvatar = Boolean(currentUser.avatar?.trim());
    const completed = [hasName, hasPhone, hasVehicle, hasAvatar].filter(Boolean).length;
    const percent = Math.round((completed / 4) * 100);
    const missingLabel = !hasVehicle
      ? 'Add your bike or toto model for exact seat fitment'
      : !hasPhone
        ? 'Add your mobile number for faster delivery updates'
        : !hasAvatar
          ? 'Add a profile photo to personalize your rider card'
          : !hasName
            ? 'Add your full name'
            : 'Profile & fitment garage complete';
    return { percent, missingLabel };
  }, [currentUser]);

  const editorProfileCompletion = useMemo(() => {
    const hasName = Boolean(profileName.trim());
    const hasPhone = Boolean(profilePhone.trim());
    const hasVehicle = Boolean(profileVehicle.trim());
    const hasAvatar = Boolean(profileAvatarUrl || profileAvatarFile);
    const completed = [hasName, hasPhone, hasVehicle, hasAvatar].filter(Boolean).length;
    return Math.round((completed / 4) * 100);
  }, [profileName, profilePhone, profileVehicle, profileAvatarUrl, profileAvatarFile]);

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
      // Mirror the vehicle-edit flow: a clean save returns to the profile page.
      // closeProfileModal() is avoided here because its snapshot reset would
      // read the stale pre-save avatar in this same tick.
      if (!metadataError) {
        setConfirmProfileClose(false);
        if (routeModal === 'profile') closeRoutedPage();
        else setActiveModal(null);
      }
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
    setPendingCropFile(file);
  };

  const handleCroppedAvatar = (cropped: File) => {
    setPendingCropFile(null);
    setProfileMessage('');
    setProfileAvatarFile(cropped);
    setProfileAvatarUrl(URL.createObjectURL(cropped));
  };

  useEffect(() => {
    if (!profileAvatarUrl?.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(profileAvatarUrl);
  }, [profileAvatarUrl]);

  const closeProfileModal = () => {
    setConfirmProfileClose(false);
    setProfileAvatarFile(null);
    setProfileAvatarUrl(profileSnapshot.avatar);
    if (routeModal === 'profile') closeRoutedPage();
    else setActiveModal(null);
  };

  const requestCloseProfile = () => {
    if (profileSavingRef.current) return;
    if (profileDirty) setConfirmProfileClose(true);
    else closeProfileModal();
  };

  const handleProtectedAction = (modalType: 'orders' | 'pickupStore' | 'settings' | 'profile' | 'privacy' | 'terms') => {
    if (modalType === 'profile' && onOpenProfileEditPage) return onOpenProfileEditPage();
    if (isGuest && (modalType === 'orders' || modalType === 'profile')) {
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
      initialOrderId={initialSupportOrderId}
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
        isLoading={isLoading}
        onOpenOrders={onOpenOrdersPage ?? (() => setActiveModal('orders'))}
        currentUserId={currentUser?.id}
        onOpenSupportRequests={() => onOpenSupportPage?.()}
        onOpenContactSupport={onOpenContactSupport}
        onOpenWishlist={onOpenWishlist}
        onOpenStoreInfo={onOpenStoreInfo}
        onOpenShop={onOpenShop}
        onOpenPrivacyPage={onOpenPrivacyPage}
        onOpenTermsPage={onOpenTermsPage}
        onOpenPersonalData={onOpenPersonalData}
        activeSection={settingsSection}
        onOpenSection={onOpenSettingsSection}
        onCloseSection={onCloseSettingsSection}
        pwaInstallCard={pwaInstallCard}
      />
    );
  }

  if (activeModal === 'privacy') {
    return (
      <PrivacyPolicyView
        onBack={closeRoutedPage}
        onOpenStoreInfo={onOpenStoreInfo}
        onOpenTerms={() => (onOpenTermsPage ? onOpenTermsPage() : setActiveModal('terms'))}
        onOpenPersonalData={onOpenPersonalData}
        onOpenDeleteAccount={
          onOpenSettingsSection
            ? () => {
                closeRoutedPage();
                onOpenSettingsSection('delete-account');
              }
            : undefined
        }
      />
    );
  }

  if (activeModal === 'terms') {
    return (
      <TermsConditionsView
        onBack={closeRoutedPage}
        onOpenStoreInfo={onOpenStoreInfo}
        onOpenPrivacy={() => (onOpenPrivacyPage ? onOpenPrivacyPage() : setActiveModal('privacy'))}
        onOpenDeleteAccount={
          onOpenSettingsSection
            ? () => {
                closeRoutedPage();
                onOpenSettingsSection('delete-account');
              }
            : undefined
        }
      />
    );
  }

  if (activeModal === null && isLoading) {
    return <AccountPageSkeleton />;
  }

  return (
    <div className="w-full max-w-full flex-1 flex flex-col space-y-4 pb-12 overflow-x-hidden animate-fade-in text-slate-800 bg-[#F8FAFC]">
      {/* Account Page Title & Top Actions */}
      <section className="px-4 sm:px-5 pt-4 pb-1 flex justify-between items-center gap-2" data-purpose="account-header">
        <div>
          <h1 className="text-[28px] sm:text-[30px] font-black tracking-tight text-slate-900 leading-none">{t('account.title')}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1.5 tracking-tight">
            {isGuest ? t('account.guestSubtitle') : t('account.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (onOpenNotifications ? onOpenNotifications() : onOpenSupportPage?.())}
            aria-label={t('account.supportRequests')}
            className="relative min-h-11 min-w-11 h-11 w-11 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-2xs transition-all active:scale-95"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#D9232D] ring-2 ring-white"
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleProtectedAction('settings')}
            aria-label={t('account.settings')}
            className="min-h-11 min-w-11 h-11 w-11 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-2xs transition-all active:scale-95"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </section>

      <main className="px-4 space-y-4">
        {/* BEGIN: ProfileHeroCard */}
        <section
          className="group relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.08)] transition-all duration-200"
          data-purpose="profile-hero-card"
        >
          {/* Subtle Top Ambient Workshop Accent Band */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-[#FFF0F2] via-[#FFF7F8] to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#D9232D]/[0.06] blur-2xl"
          />

          <div className="relative p-4 sm:p-5 space-y-3.5">
            {/* Top Row: Avatar + Name + Primary Action */}
            <div className="flex items-center gap-3.5">
              {/* Interactive Avatar with Dual Ring & Camera Badge */}
              <button
                type="button"
                onClick={() => (isGuest && onOpenLogin ? onOpenLogin() : handleProtectedAction('profile'))}
                aria-label={isGuest ? t('account.login') : t('account.editProfile')}
                className="relative h-[68px] w-[68px] sm:h-[74px] sm:w-[74px] shrink-0 rounded-full text-left transition-transform active:scale-95 focus:outline-none"
              >
                <div className="h-full w-full rounded-full bg-gradient-to-br from-[#D9232D] via-[#F43F5E] to-[#FDA4AF] p-[2.5px] shadow-[0_6px_16px_rgba(217,35,45,0.18)]">
                  <div className="relative h-full w-full rounded-full bg-[#FFF5F6] ring-2 ring-white flex items-center justify-center overflow-hidden">
                    {currentUser?.avatar ? (
                      <>
                        {!heroAvatarLoaded && (
                          <span
                            aria-hidden="true"
                            className="skeleton-shimmer absolute inset-0 rounded-full bg-rose-100/80"
                          />
                        )}
                        <img
                          ref={(node) => {
                            if (node?.complete && node.naturalWidth > 0) {
                              setHeroAvatarLoaded(true);
                            }
                          }}
                          src={currentUser.avatar}
                          alt={`${currentUser.name || 'Rider'} avatar`}
                          referrerPolicy="no-referrer"
                          onLoad={() => setHeroAvatarLoaded(true)}
                          className={`h-full w-full object-cover transition-opacity duration-300 ${
                            heroAvatarLoaded ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                      </>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="text-xl font-black tracking-tight text-[#D9232D]"
                      >
                        {getInitials(currentUser?.name || '')}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-[#D9232D] text-white ring-2 ring-white shadow-xs transition-transform group-hover:scale-105"
                >
                  <Camera className="h-3 w-3" />
                </span>
              </button>

              {/* Identity Headline */}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[19px] sm:text-[21px] font-black tracking-tight text-slate-900 leading-tight">
                  {currentUser?.name?.trim() || (isGuest ? t('account.guestTitle') : 'Rider')}
                </h2>
              </div>

              {/* Primary Top-Right Action Button */}
              <div className="shrink-0">
                {isGuest ? (
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="banner-cta-shine group/cta inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#D9232D] hover:bg-[#C01B24] active:scale-95 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all"
                  >
                    <span>{t('account.login')}</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleProtectedAction('profile')}
                    aria-label={t('account.editProfile')}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-[#D9232D] text-slate-700 hover:text-white border border-slate-200/90 hover:border-[#D9232D] px-3 py-1.5 text-xs font-bold shadow-2xs transition-all active:scale-95"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{t('account.editProfile')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Clean Full-Width Contact Details Strip (Never Cramped Beside Avatar) */}
            {(currentUser?.email?.trim() || currentUser?.phone?.trim() || !isGuest || isGuest) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-slate-600">
                {currentUser?.email?.trim() && (
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-slate-600">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="break-all sm:truncate">{currentUser.email.trim()}</span>
                  </span>
                )}
                {currentUser?.phone?.trim() ? (
                  <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold text-slate-800 whitespace-nowrap">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    <span>{currentUser.phone.trim()}</span>
                  </span>
                ) : !isGuest ? (
                  <button
                    type="button"
                    onClick={() => handleProtectedAction('profile')}
                    className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-[#D9232D] hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>+ Add phone</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">{t('account.loginHint')}</span>
                )}
              </div>
            )}

            {/* Profile Completeness Nudge (when signed in & < 100%) OR Guest Sign-in Callout */}
            {isGuest ? (
              <div className="rounded-2xl bg-gradient-to-r from-rose-50/90 via-rose-50/50 to-slate-50 border border-rose-200/70 p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate">{t('account.unlock')}</p>
                  <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                    Save your bike model, track live orders &amp; get custom seat recommendations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="shrink-0 min-h-11 rounded-xl bg-white border border-rose-200 px-3.5 py-2 text-xs font-extrabold text-[#D9232D] hover:bg-rose-50 transition-colors"
                >
                  Sign in
                </button>
              </div>
            ) : (
              accountProfileCompletion.percent < 100 && (
                <button
                  type="button"
                  onClick={() => handleProtectedAction('profile')}
                  className="w-full rounded-2xl bg-slate-50/90 hover:bg-rose-50/40 border border-slate-200/70 hover:border-rose-200/80 px-3.5 py-2.5 text-left transition-colors group/complete"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-slate-700 truncate">
                      {accountProfileCompletion.missingLabel}
                    </span>
                    <span className="shrink-0 font-extrabold text-[#D9232D] tabular-nums">
                      {accountProfileCompletion.percent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D9232D] to-[#FB7185] transition-all duration-300"
                      style={{ width: `${accountProfileCompletion.percent}%` }}
                    />
                  </div>
                </button>
              )
            )}

            {/* Interactive "My Fitment Garage" Sub-Card with Vehicle Photo */}
            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => handleProtectedAction('profile')}
                className="flex items-center gap-3 min-w-0 flex-1 text-left group/garage"
              >
                <div className="h-16 w-24 sm:h-[72px] sm:w-28 rounded-xl bg-white border border-slate-200/85 text-[#D9232D] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group-hover/garage:border-rose-200 transition-colors">
                  {garageImageSrc && !garageImgError ? (
                    <img
                      src={garageImageSrc}
                      alt={currentUser?.vehicle?.trim() || 'Saved vehicle'}
                      referrerPolicy="no-referrer"
                      onError={() => setGarageImgError(true)}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Bike className="h-6 w-6" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500 leading-tight whitespace-nowrap">
                    My Fitment Garage
                  </p>
                  {currentUser?.vehicle?.trim() ? (
                    <p className="mt-1 break-words text-[13.5px] sm:text-[14.5px] font-black leading-snug text-slate-900">
                      {currentUser.vehicle.trim()}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold leading-snug text-slate-500">
                      Add your bike, scooter or toto model
                    </p>
                  )}
                </div>
              </button>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-2.5 sm:flex sm:items-center sm:shrink-0 sm:border-t-0 sm:pt-0">
                {currentUser?.vehicle?.trim() && onOpenShop && (
                  <button
                    type="button"
                    onClick={onOpenShop}
                    className="banner-cta-shine group/cta inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-xs font-extrabold text-[#D9232D] transition-all active:scale-[0.98] whitespace-nowrap"
                  >
                    <span>Browse seats</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleProtectedAction('profile')}
                  className={`inline-flex min-h-11 items-center justify-center rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 px-3.5 py-2 text-xs font-extrabold text-slate-700 transition-colors active:scale-[0.98] whitespace-nowrap ${
                    !(currentUser?.vehicle?.trim() && onOpenShop) ? 'col-span-2 sm:col-span-1' : ''
                  }`}
                >
                  {currentUser?.vehicle?.trim() ? 'Change' : '+ Add vehicle'}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive 3-Column Live Metrics Footer */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => handleProtectedAction('orders')}
              className="py-2.5 px-2 flex flex-col items-center justify-center hover:bg-white active:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-1 text-slate-900">
                <Package className="h-3.5 w-3.5 text-[#D9232D]" aria-hidden="true" />
                {summaryLoading ? (
                  <span
                    aria-hidden="true"
                    data-testid="account-orders-metric-skeleton"
                    className="skeleton-shimmer inline-block h-4 w-6 rounded bg-slate-200/85"
                  />
                ) : (
                  <span className="text-[15px] font-black tabular-nums leading-none">{customerOrders.length}</span>
                )}
              </div>
              <span className="mt-1 text-[10.5px] font-semibold text-slate-500">Orders</span>
            </button>

            <button
              type="button"
              onClick={onOpenWishlist}
              className="py-2.5 px-2 flex flex-col items-center justify-center hover:bg-white active:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-1 text-slate-900">
                <Heart className="h-3.5 w-3.5 text-[#7C3AED]" aria-hidden="true" />
                <span className="text-[15px] font-black tabular-nums leading-none">{wishlistCount}</span>
              </div>
              <span className="mt-1 text-[10.5px] font-semibold text-slate-500">Saved</span>
            </button>

            <button
              type="button"
              onClick={() => handleProtectedAction('orders')}
              className="py-2.5 px-2 flex flex-col items-center justify-center hover:bg-white active:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-1 text-slate-900">
                <Star className="h-3.5 w-3.5 text-[#D97706]" aria-hidden="true" />
                {summaryLoading ? (
                  <span
                    aria-hidden="true"
                    data-testid="account-reviews-metric-skeleton"
                    className="skeleton-shimmer inline-block h-4 w-6 rounded bg-slate-200/85"
                  />
                ) : (
                  <span className="text-[15px] font-black tabular-nums leading-none">{myReviews.length}</span>
                )}
              </div>
              <span className="mt-1 text-[10.5px] font-semibold text-slate-500">Reviews</span>
            </button>
          </div>
        </section>
        {/* END: ProfileHeroCard */}

        {/* BEGIN: QuickActionsGrid */}
        <section className="space-y-2.5" data-purpose="account-categories">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">{t('account.yourAccount')}</h2>
            <p className="text-[11px] font-medium text-slate-400">{t('account.manageExperience')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5" data-purpose="quick-navigation-grid">
            {/* 1. My Orders */}
            <button
              type="button"
              onClick={() => handleProtectedAction('orders')}
              className="min-h-14 bg-white rounded-2xl p-3 flex items-center gap-2.5 border border-slate-200/80 shadow-2xs hover:border-slate-300 active:scale-[0.98] transition-all text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center text-[#D9232D] shrink-0">
                <Package className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-bold text-slate-900 tracking-tight leading-tight truncate">{t('account.myOrders')}</h3>
                {summaryLoading ? (
                  <span
                    aria-hidden="true"
                    className="skeleton-shimmer mt-1 block h-3 w-20 rounded bg-slate-200/75"
                  />
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate tabular-nums">
                    {customerOrders.length > 0 ? `${customerOrders.length} ${customerOrders.length === 1 ? 'order' : 'orders'}` : t('account.ordersHint')}
                  </p>
                )}
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>

            {/* 2. Wishlist */}
            <button
              type="button"
              onClick={onOpenWishlist}
              className="min-h-14 bg-white rounded-2xl p-3 flex items-center gap-2.5 border border-slate-200/80 shadow-2xs hover:border-slate-300 active:scale-[0.98] transition-all text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-[#F3EEFD] flex items-center justify-center text-[#7C3AED] shrink-0">
                <Heart className="w-4.5 h-4.5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-bold text-slate-900 tracking-tight leading-tight truncate">{t('account.wishlist')}</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate tabular-nums">
                  {wishlistCount > 0 ? t('account.savedCount', { count: wishlistCount }) : t('account.savedItems')}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>

            {/* 3. Coupons */}
            <button
              type="button"
              onClick={() => (onOpenCouponsPage ? onOpenCouponsPage() : handleProtectedAction('settings'))}
              aria-label={t('account.coupons')}
              className="min-h-14 bg-white rounded-2xl p-3 flex items-center gap-2.5 border border-slate-200/80 shadow-2xs hover:border-slate-300 active:scale-[0.98] transition-all text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-[#FFF4E0] flex items-center justify-center text-[#D97706] shrink-0">
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    clipRule="evenodd"
                    d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a1.5 1.5 0 0 0 0-3V6zm5.5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-5.2 2.7a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06l-5 5a.75.75 0 0 1-1.06 0z"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-bold text-slate-900 tracking-tight leading-tight truncate">{t('account.coupons')}</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{t('account.couponsHint')}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>

            {/* 4. Settings */}
            <button
              type="button"
              onClick={() => handleProtectedAction('settings')}
              className="min-h-14 bg-white rounded-2xl p-3 flex items-center gap-2.5 border border-slate-200/80 shadow-2xs hover:border-slate-300 active:scale-[0.98] transition-all text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-[#EBF5FF] flex items-center justify-center text-[#2563EB] shrink-0">
                <SlidersHorizontal className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-bold text-slate-900 tracking-tight leading-tight truncate">{t('account.settings')}</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{t('account.preferences')}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>
          </div>
        </section>
        {/* END: QuickActionsGrid */}

        {/* BEGIN: ActivityServicesSection (Minimal Clean Grouped List) */}
        <section className="space-y-2" data-purpose="activity-services">
          <h2 className="px-1 text-sm font-extrabold tracking-tight text-slate-900">{t('account.activityServices')}</h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {/* My reviews */}
            <button
              type="button"
              onClick={() => handleProtectedAction('orders')}
              className="w-full min-h-14 px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#FFF7E6] flex items-center justify-center text-[#B45309] shrink-0">
                  <Star className="w-4.5 h-4.5 fill-current" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">{t('account.myReviews')}</h3>
                  {summaryLoading ? (
                    <span
                      aria-hidden="true"
                      className="skeleton-shimmer mt-1 block h-3 w-24 rounded bg-slate-200/75"
                    />
                  ) : (
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate tabular-nums">
                      {myReviews.length > 0 ? t('account.reviewsCount', { count: myReviews.length }) : t('account.reviewsHint')}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Rating store — iframe-safe external anchor link */}
            <a
              href="https://g.page/r/CUiStgroG6BfEAE/review"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-14 px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#EAF7EF] flex items-center justify-center text-[#15803D] shrink-0">
                  <Star className="w-4.5 h-4.5 fill-current" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">{t('account.ratingStore')}</h3>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">{t('account.ratingStoreHint')}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
            </a>

            {/* Support requests */}
            <button
              type="button"
              onClick={() => onOpenSupportPage?.()}
              className="w-full min-h-14 px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#EBF5FF] flex items-center justify-center text-[#2563EB] shrink-0">
                  <MessageCircle className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">{t('account.supportRequests')}</h3>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">{t('account.supportRequestsHint')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Custom seat builder */}
            <button
              type="button"
              onClick={onOpenCustomBuilder}
              className="w-full min-h-14 px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F3EEFD] flex items-center justify-center text-[#7C3AED] shrink-0">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">{t('account.customSeat')}</h3>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">{t('account.customSeatHint')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Browse shop */}
            <button
              type="button"
              onClick={onOpenShop}
              className="w-full min-h-14 px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-[#D9232D] shrink-0">
                  <ShoppingBag className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">{t('account.browseShop')}</h3>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">{t('account.browseShopHint')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </section>
        {/* END: ActivityServicesSection */}

        {/* BEGIN: NeedHelpSection (Streamlined Single-Card Support & Quick Contact Bar) */}
        <section className="space-y-2" data-purpose="help-section">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">{t('account.needHelp')}</h2>
            <button
              type="button"
              onClick={() => onOpenContactSupport?.()}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-0.5"
            >
              <span>{t('account.getSupport')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/images/chat-support-bubbles.webp" alt="" className="h-9 w-9 object-contain" loading="lazy" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">{t('account.contactSupportTitle')}</h3>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">{t('account.quickAnswers')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`tel:${WORKSHOP_INFO.phone.replace(/[^+\d]/g, '')}`}
                aria-label="Call workshop support"
                className="min-h-10 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors flex-1 sm:flex-initial whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call us</span>
              </a>
              <button
                type="button"
                onClick={() => onOpenContactSupport?.()}
                className="min-h-10 bg-[#D9232D] hover:bg-[#B91C1C] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors flex-1 sm:flex-initial shadow-2xs whitespace-nowrap"
              >
                <span>{t('account.chatNow')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
        {/* END: NeedHelpSection */}

        {/* BEGIN: VisitOurStoreSection (Interactive Store Location Card) */}
        <section
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs relative overflow-hidden"
          data-purpose="store-locator-card"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Left details column */}
            <div className="min-w-0 sm:col-span-7 space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-[#D9232D] flex-shrink-0">
                  <MapPin className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">Visit our store</h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5 truncate">Rofik Godi Centre</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-normal leading-snug">
                Local automotive accessories &amp; fitting service
              </p>

              <div className="space-y-1 pt-0.5 text-[11px] text-slate-600 font-medium">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{WORKSHOP_INFO.workingHours}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="line-clamp-2 break-words">{WORKSHOP_INFO.address}</span>
                </div>
              </div>

              <div className="pt-1.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleProtectedAction('pickupStore')}
                  className="min-h-11 inline-flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-[#D9232D] text-xs font-bold px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap"
                >
                  <span>Get directions</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('pickupStore')}
                  className="min-h-11 inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap"
                >
                  <span>Pickup details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Right Isometric Map / Store Preview Graphic */}
            <div
              onClick={() => handleProtectedAction('pickupStore')}
              role="presentation"
              className="min-w-0 sm:col-span-5 h-full min-h-[136px] rounded-xl overflow-hidden relative bg-[#E7F0FA] flex items-center justify-center p-1.5 cursor-pointer"
            >
              <svg className="w-full h-full" fill="none" viewBox="0 0 140 140">
                <rect fill="#E8F4E8" height="140" rx="16" width="140" />
                <path d="M-10 60 L150 110" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="18" />
                <path d="M-10 60 L150 110" stroke="#D1E2F0" strokeLinecap="round" strokeWidth="12" />
                <path d="M90 -10 L40 150" stroke="#FFFFFF" strokeWidth="14" />
                <path d="M90 -10 L40 150" stroke="#D1E2F0" strokeWidth="8" />
                <circle cx="20" cy="25" fill="#D3EDD8" r="14" />
                <circle cx="125" cy="40" fill="#D3EDD8" r="18" />
                <circle cx="120" cy="120" fill="#D3EDD8" r="16" />
                <g transform="translate(42, 45)">
                  <ellipse cx="28" cy="42" fill="#000000" opacity="0.12" rx="22" ry="7" />
                  <rect fill="#E2E8F0" height="24" rx="2" stroke="#94A3B8" strokeWidth="1" width="36" x="10" y="16" />
                  <rect fill="#7DD3FC" height="12" rx="1" width="12" x="14" y="24" />
                  <rect fill="#64748B" height="18" rx="1" width="12" x="30" y="22" />
                  <rect fill="#94A3B8" height="16" width="8" x="32" y="24" />
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

        {/* BEGIN: MoreOptionsSection (Minimal Clean Grouped List) */}
        <section className="space-y-2" data-purpose="more-options-section">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight px-1">More options</h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {isAdmin && onOpenAdminPanel && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="w-full min-h-14 bg-[#FFF8F1] hover:bg-orange-50/80 px-3.5 py-3 flex items-center justify-between transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 shrink-0">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">Go to admin panel</h3>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">Manage products, orders and support</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            )}

            {/* Privacy Policy Row */}
            <button
              type="button"
              onClick={() => handleProtectedAction('privacy')}
              className="w-full min-h-14 px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8F0] flex items-center justify-center text-[#10B981] shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5 fill-current" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">Privacy Policy</h3>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">Your data &amp; vehicle specs protection</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Terms & Conditions Row */}
            <button
              type="button"
              onClick={() => handleProtectedAction('terms')}
              className="w-full min-h-14 px-3.5 py-3 flex items-center justify-between hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#EBF5FF] flex items-center justify-center text-[#2563EB] shrink-0">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-bold text-slate-900 leading-tight truncate">Terms &amp; Conditions</h3>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">Rules for using Rofik Godi Centre app</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Log out Row */}
            {!isGuest && onLogout && (
              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                className="w-full min-h-14 px-3.5 py-3 flex items-center justify-between hover:bg-red-50/60 active:bg-red-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-[#D9232D] shrink-0">
                    <LogOut className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13.5px] font-bold text-[#D9232D] leading-tight truncate">{t('account.logout')}</h3>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">{t('account.logoutHint')}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            )}
          </div>
        </section>
        {/* END: MoreOptionsSection */}
      </main>

      {/* Sub-Modals for Account Features */}
      <AnimatePresence>
        {activeModal === 'orders' && helpOrder && (
          <OrderHelpSupportView
            order={helpOrder}
            onBack={() => {
              setHelpOrder(null);
              onCloseOrderHelp?.(helpOrder.order_slug);
            }}
            onOpenLiveChat={(orderId) => onOpenContactSupport?.(helpOrder.order_slug, orderId)}
          />
        )}
      </AnimatePresence>

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
            onNeedHelp={(order) => {
              setHelpOrder(order);
              onOpenOrderHelp?.(order);
            }}
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-full sm:max-w-[440px] max-h-[92dvh] bg-white rounded-t-3xl sm:rounded-[28px] shadow-2xl flex flex-col z-10 overflow-hidden overflow-x-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex justify-between items-center gap-2 px-5 py-4 border-b border-gray-100 bg-white">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-[#ECF8F1] flex items-center justify-center text-[#16A34A]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-black text-gray-900 truncate">Pickup Store</h3>
                    <p className="text-[11px] text-gray-400 truncate">Store pickup location and hours</p>
                  </div>
                </div>
                <button type="button" onClick={() => setActiveModal(null)} aria-label="Close pickup store details" className="w-11 h-11 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3 flex-1 no-scrollbar">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 relative">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[11px] font-extrabold tracking-wide text-[#16A34A]">Pickup Location</span>
                    <span className="text-[10px] font-semibold text-emerald-700">Free store pickup</span>
                  </div>
                  <div className="text-[13px] font-bold text-slate-900 break-words">{WORKSHOP_INFO.name} ({WORKSHOP_INFO.phone})</div>
                  <p className="text-xs text-slate-600 break-words">{WORKSHOP_INFO.address}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{WORKSHOP_INFO.workingHours}</p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${WORKSHOP_INFO.lat},${WORKSHOP_INFO.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#D9232D] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#B91C1C] transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Open in Google Maps</span>
                    </a>
                    {onOpenStoreInfo && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          onOpenStoreInfo();
                        }}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <span>Store details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Profile Modal */}
      <AnimatePresence>
        {activeModal === 'profile' && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex w-full max-w-full flex-col bg-gradient-to-br from-[#F8FAFC] via-[#F4F6FB] to-[#FFF5F6] overflow-hidden"
          >
            {/* Top Sticky Glassmorphic App Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_-10px_rgba(15,23,42,0.05)]">
              <button
                type="button"
                onClick={requestCloseProfile}
                disabled={profileSaving}
                aria-label="Close profile editor"
                className="min-h-11 min-w-11 rounded-2xl bg-slate-100/90 hover:bg-rose-50 hover:text-[#D9232D] active:scale-95 transition-all flex items-center justify-center text-slate-700 disabled:opacity-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFE4E6] to-[#FECDD3] flex items-center justify-center text-[#D9232D] shrink-0 ring-1 ring-inset ring-rose-200/70 shadow-2xs">
                <User className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#D9232D] ring-1 ring-inset ring-rose-100">
                    <Sparkles className="h-2.5 w-2.5" /> Rider ID
                  </span>
                </div>
                <h3 id="profile-modal-title" className="text-[16px] font-black tracking-tight text-slate-900 leading-tight truncate">
                  Rider Profile
                </h3>
                <p className="text-[11px] font-medium text-slate-500 truncate">
                  Personal details &amp; fitment garage
                </p>
              </div>
              <button
                type="button"
                aria-label="Save profile changes"
                disabled={profileSaving || profileLoading || !profileDirty || Object.keys(profileFieldErrors).length > 0}
                onClick={() => void handleSaveProfile()}
                className="banner-cta-shine ml-auto min-h-11 shrink-0 rounded-2xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-5 py-2 text-xs font-black text-white shadow-[0_6px_16px_rgba(217,35,45,0.25)] transition-all hover:brightness-105 hover:shadow-md active:scale-95 disabled:opacity-45 disabled:shadow-none"
              >
                {profileSaving ? 'Saving…' : profileLoading ? 'Loading…' : 'Save'}
              </button>
            </div>

            <div className="overflow-y-auto overflow-x-hidden flex-1 no-scrollbar text-slate-800">
              <div className="mx-auto w-full max-w-[560px] px-4 sm:px-5 py-5 space-y-4 pb-6">
                {profileLoading ? (
                  <AccountProfileEditorSkeleton />
                ) : (
                  <>
                {/* Glassmorphic Live Rider ID Card Preview Banner */}
                <div className="relative overflow-hidden rounded-3xl border border-rose-200/80 bg-gradient-to-br from-[#FFF4F5] via-white to-[#FCECEF] p-4 sm:p-5 shadow-[0_12px_32px_-14px_rgba(217,35,45,0.14)] space-y-4">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#D9232D]/[0.07] blur-2xl"
                  />

                  <div className="relative flex items-start gap-4">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        disabled={profileSaving || profileLoading}
                        onClick={() => avatarFileInputRef.current?.click()}
                        aria-label="Choose profile photo"
                        className="group/avatar relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-br from-[#FFE4E6] to-[#FECDD3] text-xl font-black text-[#D9232D] shadow-[0_8px_20px_rgba(217,35,45,0.18)] transition-transform active:scale-95 disabled:opacity-60"
                      >
                        {profileAvatarUrl ? (
                          <img
                            src={profileAvatarUrl}
                            alt={`${profileName || 'Rider'} profile photo`}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span aria-label={`${getInitials(profileName)} initials`}>
                            {getInitials(profileName)}
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 flex items-center justify-center bg-slate-900/35 opacity-0 transition-opacity group-hover/avatar:opacity-100"
                        >
                          <Camera className="h-5 w-5 text-white" />
                        </span>
                      </button>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-[#D9232D] text-white ring-2 ring-white shadow-2xs"
                      >
                        <Camera className="h-3 w-3" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[15px] font-black text-slate-900 truncate">
                          {profileName.trim() || 'Rider Profile Photo'}
                        </p>
                        <span className="shrink-0 rounded-full bg-white/95 border border-rose-200/80 px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#D9232D] tabular-nums shadow-2xs">
                          {editorProfileCompletion}% complete
                        </span>
                      </div>

                      {/* Live Identity & Fitment Preview Chips */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {profilePhone.trim() && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 border border-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-700 tabular-nums">
                            <Phone className="h-2.5 w-2.5 text-[#D9232D]" />
                            {profilePhone.trim()}
                          </span>
                        )}
                        {profileVehicle.trim() && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 border border-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-[#D9232D] truncate max-w-full">
                            <Bike className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{profileVehicle.trim()}</span>
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        Square WebP photo up to 5 MB. Tap photo or button below to update.
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/*"
                          aria-label="Choose profile photo"
                          className="sr-only"
                          onChange={handleAvatarFile}
                        />
                        {pendingCropFile && (
                          <AvatarCropModal
                            file={pendingCropFile}
                            onCancel={() => setPendingCropFile(null)}
                            onConfirm={handleCroppedAvatar}
                          />
                        )}
                        <button
                          type="button"
                          aria-label="Upload profile photo"
                          disabled={profileSaving || profileLoading}
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="banner-cta-shine inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91822] hover:brightness-105 px-3.5 py-2 text-[11px] font-black text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Change photo
                        </button>
                        {(profileAvatarUrl || profileAvatarFile) && (
                          <button
                            type="button"
                            aria-label="Remove profile photo"
                            disabled={profileSaving || profileLoading}
                            onClick={() => {
                              setProfileAvatarFile(null);
                              setProfileAvatarUrl(null);
                              setProfileMessage('');
                            }}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-200 bg-white/90 hover:bg-rose-50 px-3.5 py-2 text-[11px] font-bold text-[#D9232D] transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Completeness Bar & Checklist */}
                  <div className="rounded-2xl bg-white/80 backdrop-blur-xs border border-rose-100/90 p-3 space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-rose-100/90">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#D9232D] to-[#FB7185] transition-all duration-300"
                        style={{ width: `${editorProfileCompletion}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {[
                        { label: 'Name', done: Boolean(profileName.trim()) },
                        { label: 'Photo', done: Boolean(profileAvatarUrl || profileAvatarFile) },
                        { label: 'Phone', done: Boolean(profilePhone.trim()) },
                        { label: 'Vehicle', done: Boolean(profileVehicle.trim()) },
                      ].map((step) => (
                        <span
                          key={step.label}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            step.done
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <CheckCircle2 className={`h-2.5 w-2.5 ${step.done ? 'text-emerald-600' : 'text-slate-400'}`} />
                          {step.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Personal Information Card */}
                <div className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-4 sm:p-5 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.06)] space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-[13.5px] font-black text-slate-900">Personal Details</h4>
                      <p className="text-[11px] text-slate-500">Used on invoices, order pickup &amp; support</p>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-rose-50 text-[#D9232D] flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="profile-name" className="text-xs font-extrabold text-slate-700 block mb-1.5">
                      Your Name
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={50}
                      autoComplete="name"
                      value={profileName}
                      onChange={(e) => {
                        setProfileName(e.target.value);
                        setProfileMessage('');
                      }}
                      aria-invalid={Boolean(profileFieldErrors.full_name)}
                      aria-describedby={profileFieldErrors.full_name ? 'profile-name-error' : undefined}
                      disabled={profileLoading || profileSaving}
                      className="min-h-11 w-full bg-slate-50/90 text-base sm:text-[13px] font-semibold text-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-200/90 transition-all focus:bg-white focus:outline-none focus:border-[#D9232D] focus:ring-2 focus:ring-rose-100"
                    />
                    {profileFieldErrors.full_name && (
                      <p id="profile-name-error" role="alert" className="mt-1 text-[11px] font-medium text-red-600">
                        {profileFieldErrors.full_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <PhoneNumberField
                      id="profile-phone"
                      label="Phone Number (optional)"
                      value={profilePhone}
                      country={profilePhoneCountry}
                      onChange={(value) => {
                        setProfilePhone(value);
                        setProfileMessage('');
                      }}
                      onCountryChange={setProfilePhoneCountry}
                      onBlur={() => setProfilePhoneTouched(true)}
                      error={profilePhoneError}
                      placeholder="Enter phone number"
                      disabled={profileLoading || profileSaving}
                    />
                  </div>

                  <div>
                    <label htmlFor="profile-email" className="text-xs font-extrabold text-slate-700 block mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        id="profile-email"
                        type="email"
                        value={profileEmail}
                        readOnly
                        disabled
                        aria-describedby="profile-email-hint"
                        className="min-h-11 w-full rounded-xl border border-slate-200/90 bg-slate-100/80 px-3.5 py-2.5 pr-9 text-base sm:text-[13px] font-medium text-slate-500 disabled:cursor-not-allowed"
                      />
                      <LockKeyhole className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    </div>
                    <p id="profile-email-hint" className="mt-1 text-[10.5px] text-slate-400">
                      Email is linked to your login account and cannot be changed
                    </p>
                  </div>
                </div>

                {/* Vehicle Fitment Card */}
                <section
                  className="space-y-3.5 rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-4 sm:p-5 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.06)]"
                  aria-label="Vehicle fitment"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-rose-50 text-[#D9232D] flex items-center justify-center shrink-0 mt-0.5">
                        <Bike className="h-4.5 w-4.5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-[13.5px] font-black text-slate-900">
                          Vehicle for fitment <span className="font-normal text-slate-400">(optional)</span>
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                          Choose your vehicle type and brand to match compatible seat covers.
                        </p>
                      </div>
                    </div>
                    {profileVehicle.trim() && (
                      <button
                        type="button"
                        disabled={profileLoading || profileSaving}
                        onClick={() => {
                          setProfileVehicleCompany('');
                          setProfileVehicleModel('');
                          setProfileVehicle('');
                          setProfileMessage('');
                        }}
                        className="shrink-0 min-h-9 rounded-lg bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-[11px] font-bold text-[#D9232D] transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Quick Vehicle Category Pills */}
                  <div className="flex flex-wrap gap-1.5 sm:grid sm:grid-cols-5" role="group" aria-label="Quick vehicle category selector">
                    {(['Bike', 'Scooter', 'Toto / E-rickshaw', 'Car', 'Other'] as CheckoutVehicleType[]).map((type) => {
                      const active = profileVehicleType === type;
                      const shortLabel =
                        type === 'Toto / E-rickshaw' ? 'Toto' : type;
                      return (
                        <button
                          key={type}
                          type="button"
                          disabled={profileLoading || profileSaving}
                          onClick={() => {
                            if (profileVehicleType === type) return;
                            setProfileVehicleType(type);
                            setProfileVehicleCompany('');
                            setProfileVehicleModel('');
                            setProfileVehicle('');
                            setProfileMessage('');
                          }}
                          className={`min-h-11 min-w-[calc(33%-4px)] flex-1 sm:min-w-0 rounded-xl border px-2 py-2 text-xs sm:text-[11px] font-extrabold transition-all ${
                            active
                              ? 'border-[#D9232D] bg-gradient-to-r from-[#D9232D] to-[#B91822] text-white shadow-2xs'
                              : 'border-slate-200/80 bg-slate-50/90 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {shortLabel}
                        </button>
                      );
                    })}
                  </div>

                  <label htmlFor="profile-vehicle-type" className="block text-xs font-extrabold text-slate-700">
                    {t('checkout.vehicleType')}
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
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-2.5 text-base sm:text-[13px] font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#D9232D]"
                    >
                      {(['Bike', 'Scooter', 'Toto / E-rickshaw', 'Car', 'Other'] as CheckoutVehicleType[]).map((type) => (
                        <option key={type} value={type}>
                          {type === 'Bike'
                            ? t('checkout.vehicleBike')
                            : type === 'Scooter'
                              ? t('checkout.vehicleScooter')
                              : type === 'Toto / E-rickshaw'
                                ? t('checkout.vehicleToto')
                                : type === 'Car'
                                  ? t('checkout.vehicleCar')
                                  : t('checkout.vehicleOther')}
                        </option>
                      ))}
                    </select>
                  </label>

                  {profileVehicleCompanies.length > 0 ? (
                    <div className="grid gap-3.5">
                      <label htmlFor="profile-vehicle-company" className="block min-w-0 text-xs font-extrabold text-slate-700">
                        {t('checkout.vehicleCompany')}
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
                          className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-2.5 text-base sm:text-[13px] font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#D9232D]"
                        >
                          <option value="">{t('checkout.chooseCompany')}</option>
                          {profileVehicleCompanies.map((company) => (
                            <option key={company} value={company}>
                              {company}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="block min-w-0 text-xs font-extrabold text-slate-700">
                        <span>
                          {t('checkout.vehicleModel')} <span className="font-normal text-slate-400">(optional)</span>
                        </span>
                        {!profileVehicleCompany ? (
                          <p className="mt-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3.5 py-3 text-xs font-medium text-slate-400">
                            {t('checkout.chooseCompany')}
                          </p>
                        ) : (
                          <VehicleModelPicker
                            models={profileVehicleModels}
                            selectedModel={profileVehicleModel}
                            onSelect={(model) => {
                              setProfileVehicleModel(model);
                              setProfileVehicle(model ? `${profileVehicleType} · ${profileVehicleCompany} · ${model}` : '');
                              setProfileMessage('');
                            }}
                            selectedLabel={t('checkout.selectedVehicle')}
                            changeLabel={t('checkout.changeModel')}
                            ariaLabel={t('checkout.vehicleModel')}
                            disabled={profileLoading || profileSaving}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="profile-vehicle" className="mb-1.5 block text-xs font-extrabold text-slate-700">
                        Vehicle Model <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <input
                        id="profile-vehicle"
                        type="text"
                        maxLength={60}
                        value={profileVehicle}
                        onChange={(event) => {
                          setProfileVehicle(event.target.value);
                          setProfileMessage('');
                        }}
                        aria-invalid={Boolean(profileFieldErrors.vehicle_model)}
                        aria-describedby={profileFieldErrors.vehicle_model ? 'profile-vehicle-error' : undefined}
                        disabled={profileLoading || profileSaving}
                        placeholder={t('checkout.exampleVehicle')}
                        className="min-h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-2.5 text-base sm:text-[13px] text-slate-900 outline-none focus:bg-white focus:border-[#D9232D]"
                      />
                    </div>
                  )}
                  {profileFieldErrors.vehicle_model && (
                    <p id="profile-vehicle-error" role="alert" className="text-[11px] font-medium text-red-600">
                      {profileFieldErrors.vehicle_model}
                    </p>
                  )}
                </section>

                {profileMessage && (
                  <p
                    role="status"
                    className={`rounded-2xl px-4 py-3 text-center text-xs font-bold ${
                      profileMessage.toLowerCase().includes('saved') && !profileMessage.toLowerCase().includes('could not')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                        : 'bg-red-50 text-red-600 border border-red-200/70'
                    }`}
                  >
                    {profileMessage}
                  </p>
                )}
                  </>
                )}
              </div>
            </div>

            {/* Sticky Bottom Action Bar for Mobile & Desktop */}
            {!profileLoading && (
              <div className="border-t border-slate-200/85 bg-white/92 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex max-w-[560px] flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3">
                  <span className="min-w-0 text-xs font-bold text-slate-600 truncate">
                    {profileDirty ? 'Unsaved profile changes' : 'All changes up to date'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <button
                      type="button"
                      disabled={profileSaving}
                      onClick={requestCloseProfile}
                      className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      {profileDirty ? 'Discard' : 'Close'}
                    </button>
                    <button
                      type="button"
                      disabled={profileSaving || profileLoading || !profileDirty || Object.keys(profileFieldErrors).length > 0}
                      onClick={() => void handleSaveProfile()}
                      className="banner-cta-shine min-h-11 rounded-xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] hover:brightness-105 hover:shadow-md px-4 py-2 text-xs font-black text-white shadow-sm shadow-red-600/20 transition-all active:scale-95 whitespace-nowrap disabled:opacity-45"
                    >
                      {profileSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
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
      <ConfirmDialog
        open={confirmLogout}
        title={t('account.logoutConfirmTitle')}
        message={t('account.logoutConfirmMessage')}
        confirmLabel={t('account.logoutConfirmYes')}
        cancelLabel={t('account.logoutConfirmNo')}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          onLogout?.();
        }}
      />
    </div>
  );
};
