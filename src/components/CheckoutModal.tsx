import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  LoaderCircle,
  MapPin,
  Minus,
  Pencil,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { VEHICLE_BRANDS, WORKSHOP_INFO } from '../data/products';
import {
  getCheckoutVehicleCompanies,
  getCheckoutVehicleModels,
  type CheckoutVehicleType,
} from '../lib/checkoutVehicleFitment';
import { loadVehicleModels, type VehicleCatalogModel } from '../lib/supabaseVehicleCatalog';
import { CartItem, OrderDetails } from '../types';
import { cancelUnpaidOnlineOrder, createSupabaseOrder } from '../lib/supabaseOrders';
import { openRazorpayCheckout } from '../lib/razorpay';
import { supabase } from '../lib/supabase';
import { validateProfileName } from '../lib/profileValidation';
import { getPhoneCountry, validatePhoneNumber, type CountryCode } from '../utils/phoneValidation';
import { PhoneNumberField } from './PhoneNumberField';
import { VehicleModelPicker } from './VehicleModelPicker';
import { MAX_ORDER_ITEM_QUANTITY } from '../lib/cart';
import { formatInr, useI18n } from '../lib/i18n';
import { loadCustomerCouponOffers, type CustomerCouponOffer } from '../lib/supabaseCoupons';
import {
  applyCouponCodeForCheckout,
  calculateItemsSubtotal,
  getCheckoutPricingSummary,
  type CheckoutCouponState,
} from '../lib/checkoutCoupon';
import { CheckoutCouponValidator } from './CheckoutCouponValidator';
import { CheckoutPageSkeleton } from './AccountPageSkeleton';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  discount: number;
  couponCode: string;
  couponSubtotal?: number;
  couponTotal?: number;
  onCouponChange?: (discount: number, couponCode: string, quote?: { subtotal: number; total: number } | null) => void;
  onClearCart: () => void;
  userId: string;
  onOrderPlaced: () => void;
  onUpdateQuantity: (cartItemId: string, newQuantity: number) => void;
}
type VehicleType = CheckoutVehicleType;
type ProfileLoad = 'loading' | 'ready' | 'error';
const vehicleTypes: VehicleType[] = ['Bike', 'Scooter', 'Car', 'Toto / E-rickshaw', 'Other'];
const timeSlots = ['10:00 AM – 12:00 PM', '12:00 PM – 2:00 PM', '2:00 PM – 4:00 PM', '4:00 PM – 6:00 PM'];
const indianMoney = formatInr;
const isoDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  discount,
  couponCode,
  couponSubtotal,
  couponTotal,
  onCouponChange,
  onClearCart,
  userId,
  onOrderPlaced,
  onUpdateQuantity,
}) => {
  const { t, language } = useI18n();
  const locale = language === 'bn' ? 'bn-IN' : 'en-IN';
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('IN');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [savedPhone, setSavedPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Bike');
  const [vehicleCompany, setVehicleCompany] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleCatalogModels, setVehicleCatalogModels] = useState<VehicleCatalogModel[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [hasSavedVehicle, setHasSavedVehicle] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [profileLoad, setProfileLoad] = useState<ProfileLoad>('loading');
  const [profileError, setProfileError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_store' | 'pay_online'>('pay_at_store');
  const [pendingOnlineOrder, setPendingOnlineOrder] = useState<OrderDetails | null>(null);
  const [placedOrder, setPlacedOrder] = useState<OrderDetails | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const submitLockRef = useRef(false);
  const [submissionError, setSubmissionError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef<number | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CheckoutCouponState | null>(() => {
    const normalized = couponCode.trim().toUpperCase();
    if (!normalized) return null;
    const baseSubtotal = couponSubtotal ?? calculateItemsSubtotal(items);
    const safeDiscount = Math.max(0, discount);
    return {
      code: normalized,
      discount: safeDiscount,
      subtotal: baseSubtotal,
      total: couponTotal ?? Math.max(0, baseSubtotal - safeDiscount),
    };
  });
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponOffers, setCouponOffers] = useState<CustomerCouponOffer[]>([]);

  const itemsSignature = useMemo(
    () => items.map((item) => `${item.cartItemId}:${item.quantity}:${item.unitPrice}`).join('|'),
    [items],
  );
  const validatedSignatureRef = useRef(itemsSignature);

  const pricing = useMemo(
    () => getCheckoutPricingSummary(items, appliedCoupon),
    [items, appliedCoupon],
  );
  const subtotal = pricing.subtotal;
  const effectiveDiscount = pricing.discount;
  const total = pricing.total;
  const activeCouponCode = pricing.couponCode;
  const visiblePhoneError = phoneTouched ? validatePhoneNumber(phone, phoneCountry).message : phoneError;
  const pickupDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    return date;
  }), []);
  const vehicleCompanies = useMemo(
    () => getCheckoutVehicleCompanies(vehicleType, vehicleCatalogModels),
    [vehicleType, vehicleCatalogModels],
  );
  const vehicleModelOptions = useMemo(
    () => getCheckoutVehicleModels(vehicleType, vehicleCompany, vehicleCatalogModels),
    [vehicleType, vehicleCompany, vehicleCatalogModels],
  );
  const selectedFitment = vehicleModelOptions.find((model) => model.name === vehicleModel);
  const vehicleValue = vehicleModel.trim()
    ? `${vehicleType} · ${vehicleCompany ? `${vehicleCompany} · ` : ''}${vehicleModel.trim()}`
    : '';
  const vehicleTypeLabel = (type: VehicleType) =>
    type === 'Bike'
      ? t('checkout.vehicleBike')
      : type === 'Scooter'
        ? t('checkout.vehicleScooter')
        : type === 'Car'
          ? t('checkout.vehicleCar')
          : type === 'Toto / E-rickshaw'
            ? t('checkout.vehicleToto')
            : t('checkout.vehicleOther');

  // The vehicle catalog loads once per open. It must stay in its own effect:
  // loadVehicleModels() returns a fresh array every call, so letting the profile
  // effect both fetch it and depend on it loops forever and pins the modal on
  // the "Loading your secure account details…" state.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setCatalogReady(false);
    setVehicleCatalogModels([]);
    void loadVehicleModels().then(({ data }) => {
      if (!active) return;
      setVehicleCatalogModels(data);
      setCatalogReady(true);
    });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !userId || !catalogReady) return;
    let active = true;
    setProfileLoad('loading');
    setProfileError('');
    setSubmissionError('');
    setToastMessage('');
    setStep(1);
    setPendingOnlineOrder(null);
    setPlacedOrder(null);
    setCopiedOrderId(false);
    setEditingPhone(false);
    setEditingVehicle(false);
    setPhoneError('');
    const loadProfile = async () => {
      if (!supabase) {
        if (active) {
          setProfileError(t('checkout.errorUnavailable'));
          setProfileLoad('error');
        }
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) {
        if (active) {
          setProfileError(t('checkout.errorSessionChanged'));
          setProfileLoad('error');
        }
        return;
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id,full_name,phone,vehicle_model')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setProfileError(t('checkout.profileLoadFailed'));
        setProfileLoad('error');
        return;
      }
      const metadata = authData.user.user_metadata || {};
      const savedNumber = String(profile?.phone || '').trim();
      const savedVehicle = String(profile?.vehicle_model || '').trim();
      const matchedType = vehicleTypes.find((type) => savedVehicle.toLowerCase().startsWith(`${type.toLowerCase()} ·`));
      const savedType = matchedType || 'Bike';
      const vehicleDetails = matchedType ? savedVehicle.slice(savedVehicle.indexOf('·') + 1).trim() : savedVehicle;
      const vehicleParts = vehicleDetails.split('·').map((part) => part.trim()).filter(Boolean);
      const savedCompany = vehicleParts.length > 1 ? vehicleParts[0] : '';
      const savedModel = vehicleParts.length > 1 ? vehicleParts.slice(1).join(' · ') : vehicleParts[0] || '';
      const savedCatalogType = savedType === 'Bike' ? 'bike' : savedType === 'Scooter' ? 'scooter' : null;
      const savedCatalogVehicle = savedCatalogType
        ? vehicleCatalogModels.find((model) => model.type === savedCatalogType && model.name.toLowerCase() === savedModel.toLowerCase()) ||
          vehicleCatalogModels.find(
            (model) =>
              model.type === savedCatalogType &&
              (model.name.toLowerCase().endsWith(` ${savedModel.toLowerCase()}`) ||
                model.name.toLowerCase().startsWith(`${savedModel.toLowerCase()} `)),
          )
        : undefined;
      const savedTotoGroup = matchedType === 'Toto / E-rickshaw'
        ? VEHICLE_BRANDS.toto.find(
            (group) => group.brand === savedCompany || group.models.some((model) => savedModel.toLowerCase().endsWith(model.toLowerCase())),
          )
        : undefined;
      const savedTotoModel = savedTotoGroup?.models.find((model) => savedModel.toLowerCase().endsWith(model.toLowerCase()));
      setCustomerName(String(profile?.full_name || metadata.full_name || metadata.name || '').trim());
      setEmail(authData.user.email || '');
      setPhone(savedNumber);
      setSavedPhone(savedNumber);
      setPhoneCountry(getPhoneCountry(savedNumber));
      setPhoneTouched(false);
      setVehicleType(savedType);
      setVehicleCompany(savedCatalogVehicle?.brand || savedTotoGroup?.brand || savedCompany);
      setVehicleModel(savedCatalogVehicle?.name || savedTotoModel || savedModel);
      setHasSavedVehicle(Boolean(savedVehicle));
      setEditingPhone(!savedNumber);
      setEditingVehicle(!savedVehicle);
      setProfileLoad('ready');
    };
    void loadProfile();
    return () => { active = false; };
  }, [isOpen, t, userId, catalogReady, vehicleCatalogModels]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const normalized = couponCode.trim().toUpperCase();
    const baseSubtotal = couponSubtotal ?? calculateItemsSubtotal(items);
    const safeDiscount = Math.max(0, discount);
    setAppliedCoupon(
      normalized
        ? {
            code: normalized,
            discount: safeDiscount,
            subtotal: baseSubtotal,
            total: couponTotal ?? Math.max(0, baseSubtotal - safeDiscount),
          }
        : null,
    );
    setCouponInput('');
    setCouponError('');
    setIsValidatingCoupon(false);
    validatedSignatureRef.current = itemsSignature;
    // Seed coupon state only when the checkout modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !userId || items.length === 0) return;
    let active = true;
    void loadCustomerCouponOffers().then(({ data }) => {
      if (!active) return;
      setCouponOffers(data);
    });
    return () => { active = false; };
  }, [isOpen, items.length, userId]);

  useEffect(() => {
    if (!isOpen || !appliedCoupon || !userId || items.length === 0) return;
    if (itemsSignature === validatedSignatureRef.current) return;
    let active = true;
    setIsValidatingCoupon(true);
    setPendingOnlineOrder(null);
    void applyCouponCodeForCheckout(appliedCoupon.code, items, userId, {
      emptyCode: t('cart.emptyCouponCode'),
      invalidCoupon: t('cart.invalidCoupon'),
      unavailable: t('cart.couponUnavailable'),
    }).then((result) => {
      if (!active) return;
      validatedSignatureRef.current = itemsSignature;
      setIsValidatingCoupon(false);
      if (result.ok) {
        setAppliedCoupon(result.applied);
        setCouponError('');
        onCouponChange?.(result.applied.discount, result.applied.code, {
          subtotal: result.applied.subtotal,
          total: result.applied.total,
        });
      } else {
        setAppliedCoupon(null);
        setCouponError(result.error);
        onCouponChange?.(0, '', null);
      }
    });
    return () => { active = false; };
  }, [appliedCoupon, isOpen, items, itemsSignature, onCouponChange, t, userId]);

  if (!isOpen) return null;

  const handleApplyCheckoutCoupon = async (overrideCode?: string) => {
    if (isValidatingCoupon) return;
    setCouponError('');
    setIsValidatingCoupon(true);
    setPendingOnlineOrder(null);
    const result = await applyCouponCodeForCheckout(
      overrideCode ?? couponInput,
      items,
      userId,
      {
        emptyCode: t('cart.emptyCouponCode'),
        invalidCoupon: t('cart.invalidCoupon'),
        unavailable: t('cart.couponUnavailable'),
      },
    );
    setIsValidatingCoupon(false);
    if (!result.ok) {
      setCouponError(result.error);
      return;
    }
    validatedSignatureRef.current = itemsSignature;
    setAppliedCoupon(result.applied);
    setCouponInput('');
    setCouponError('');
    onCouponChange?.(result.applied.discount, result.applied.code, {
      subtotal: result.applied.subtotal,
      total: result.applied.total,
    });
  };

  const handleRemoveCheckoutCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    setPendingOnlineOrder(null);
    onCouponChange?.(0, '', null);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('');
      toastTimerRef.current = null;
    }, 3500);
  };

  const saveCustomerPreferences = async (verifiedUserId: string) => {
    if (!supabase) throw new Error(t('checkout.errorUnavailable'));
    const patch: { phone?: string; vehicle_model?: string } = {};
    if (phone.trim() !== savedPhone || phoneCountry !== getPhoneCountry(savedPhone)) {
      patch.phone = validatePhoneNumber(phone, phoneCountry).e164 || phone.trim();
    }
    const nextVehicle = vehicleValue;
    if (editingVehicle && nextVehicle) patch.vehicle_model = nextVehicle;
    if (!Object.keys(patch).length) return;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== verifiedUserId) throw new Error(t('checkout.errorSessionChanged'));
    const { data: existing, error: readError } = await supabase.from('profiles').select('id').eq('id', verifiedUserId).maybeSingle();
    if (readError) throw new Error(t('checkout.errorProfileCheck'));
    const result = existing
      ? await supabase.from('profiles').update(patch).eq('id', verifiedUserId)
      : await supabase.from('profiles').upsert({ id: verifiedUserId, ...patch }, { onConflict: 'id' });
    if (result.error) throw new Error(t('checkout.errorPreferences'));
    if (patch.phone) setSavedPhone(patch.phone);
    if (patch.vehicle_model) setHasSavedVehicle(true);
  };

  const handlePlaceOrder = async () => {
    if (submitLockRef.current || isProcessing) return;
    setSubmissionError('');
    if (profileLoad !== 'ready') {
      setSubmissionError(t('checkout.errorAccountLoading'));
      return;
    }
    if (validateProfileName(customerName)) {
      setSubmissionError(t('checkout.errorName'));
      return;
    }
    const phoneResult = validatePhoneNumber(phone, phoneCountry);
    setPhoneTouched(true);
    if (!phoneResult.valid) {
      setPhoneError(t('checkout.errorPhone'));
      setStep(1);
      return;
    }
    if (!pickupDate || !pickupTime) {
      setSubmissionError('');
      showToast(t('checkout.errorPickup'));
      setStep(1);
      return;
    }
    submitLockRef.current = true;
    setPhoneError('');
    setIsProcessing(true);
    let savedOrder: OrderDetails | null = pendingOnlineOrder;
    try {
      const { data: authData, error: authError } = await supabase!.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) throw new Error(t('checkout.errorSessionChanged'));
      await saveCustomerPreferences(authData.user.id);
      const pickupLabel = `${new Date(`${pickupDate}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}, ${pickupTime}`;
      const pickupNote = [`Pickup requested: ${pickupLabel}`, note.trim()].filter(Boolean).join(' · ');
      const order: OrderDetails = {
        orderId: '',
        items: [...items],
        subtotal,
        discount: effectiveDiscount,
        total,
        customerName: customerName.trim(),
        phone: phoneResult.e164!,
        vehicleType,
        vehicleCompany: vehicleCompany.trim(),
        vehicleModel: vehicleValue,
        note: pickupNote,
        paymentMethod,
        paymentStatus: 'pending',
        fulfillmentMethod: 'STORE_PICKUP',
        pickupStore: WORKSHOP_INFO.name,
        status: 'NEW',
        createdAt: new Date().toISOString(),
      };
      if (!savedOrder) {
        const persisted = await createSupabaseOrder(order, userId, activeCouponCode);
        if (persisted.error || !persisted.order) {
          throw new Error(persisted.error?.message || 'Unable to save your order. Please try again.');
        }
        savedOrder = persisted.order;
        if (paymentMethod === 'pay_online') setPendingOnlineOrder(savedOrder);
      }
      if (paymentMethod === 'pay_online') {
        await openRazorpayCheckout(savedOrder.orderId);
        savedOrder = { ...savedOrder, paymentStatus: 'paid' };
        setPendingOnlineOrder(null);
      }
      setPlacedOrder(savedOrder);
      setStep(3);
      onClearCart();
      onCouponChange?.(0, '', null);
      onOrderPlaced();
      confetti({
        particleCount: 70,
        spread: 58,
        origin: { y: 0.65 },
        colors: ['#6B352A', '#FFF1A6', '#FF6115', '#FFFCF4'],
      });
    } catch (error) {
      if (paymentMethod === 'pay_online' && savedOrder?.orderId && savedOrder.paymentStatus !== 'paid') {
        await cancelUnpaidOnlineOrder(savedOrder.orderId).catch(() => undefined);
        setPendingOnlineOrder(null);
      }
      setSubmissionError(error instanceof Error ? error.message : 'Unable to save your order. Please try again.');
    } finally {
      submitLockRef.current = false;
      setIsProcessing(false);
    }
  };

  const continueToPayment = () => {
    setSubmissionError('');
    const phoneResult = validatePhoneNumber(phone, phoneCountry);
    setPhoneTouched(true);
    if (!customerName.trim() || !email) {
      setSubmissionError(t('checkout.errorMissingNameEmail'));
      return;
    }
    if (!phoneResult.valid) {
      setPhoneError(t('checkout.errorPhone'));
      return;
    }
    if (!pickupDate || !pickupTime) {
      showToast(t('checkout.errorPickupFirst'));
      return;
    }
    setPhoneError('');
    setStep(2);
  };

  const handleCopyPlacedOrderId = async () => {
    if (!placedOrder?.orderId) return;
    try {
      await navigator.clipboard.writeText(placedOrder.orderId);
      setCopiedOrderId(true);
      window.setTimeout(() => setCopiedOrderId(false), 1800);
    } catch {
      // Clipboard access can be blocked; order ID remains visible.
    }
  };

  const renderSummary = () => (
    <section
      className="min-w-0 max-w-full rounded-3xl border border-[#E8D8C4] bg-white p-4 sm:p-5 backdrop-blur-md shadow-[0_12px_32px_-16px_rgba(107,53,42,0.1)]"
      aria-label={t('checkout.orderSummary')}
    >
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-[#F4EAE0] pb-3">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-black tracking-tight text-[#2B1611]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF1A6] text-[#6B352A]">
            <ShoppingBag className="h-4 w-4" />
          </span>
          <span className="truncate">{t('checkout.orderSummary')}</span>
        </h3>
        <span className="shrink-0 whitespace-nowrap text-[11px] font-bold text-[#6B4C44] tabular-nums">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="max-h-60 space-y-3 overflow-y-auto overflow-x-hidden pr-0.5 no-scrollbar">
        {items.map((item) => (
          <div
            key={item.cartItemId}
            className="flex min-w-0 items-start gap-2.5 rounded-2xl border border-[#F4EAE0] bg-[#FFFCF4] p-2.5 sm:items-center sm:gap-3"
          >
            <img
              src={item.selectedColor?.images?.[0] ?? item.product.image}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl bg-white object-cover ring-1 ring-[#E8D8C4] sm:h-14 sm:w-14"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 break-words text-xs font-extrabold leading-snug text-[#2B1611] sm:truncate">
                  {item.product.title}
                </p>
                <b className="shrink-0 whitespace-nowrap text-xs font-black text-[#6B352A] tabular-nums">
                  {indianMoney(item.unitPrice * item.quantity)}
                </b>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] font-medium text-[#6B4C44]">
                  {item.selectedColor?.name || 'Standard'}
                </span>
                <div
                  role="group"
                  aria-label={t('cart.quantityFor', { title: item.product.title })}
                  className="flex shrink-0 items-center rounded-xl border border-[#E8D8C4] bg-white p-0.5 shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label={t('cart.decreaseQuantity', { title: item.product.title })}
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-[#6B352A] transition-colors hover:bg-[#FFF8D6] disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-xs font-extrabold text-[#2B1611] tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                    disabled={!item.product.inStock || item.quantity >= MAX_ORDER_ITEM_QUANTITY}
                    aria-label={
                      item.quantity >= MAX_ORDER_ITEM_QUANTITY
                        ? t('cart.maxQuantity', { title: item.product.title })
                        : t('cart.increaseQuantity', { title: item.product.title })
                    }
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-[#6B352A] transition-colors hover:bg-[#FFF8D6] disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CheckoutCouponValidator
        couponInput={couponInput}
        onCouponInputChange={(value) => {
          setCouponInput(value);
          if (couponError) setCouponError('');
        }}
        appliedCoupon={appliedCoupon}
        errorMessage={couponError}
        isValidating={isValidatingCoupon}
        eligibleOffers={couponOffers}
        onApply={(code) => void handleApplyCheckoutCoupon(code)}
        onRemove={handleRemoveCheckoutCoupon}
      />

      <div className="mt-4 space-y-2 border-t border-dashed border-[#E8D8C4] pt-3.5 text-xs">
        <div className="flex justify-between gap-2 text-[#6B4C44]">
          <span>{t('cart.subtotal')}</span>
          <span className="font-semibold text-[#2B1611] tabular-nums">{indianMoney(subtotal)}</span>
        </div>
        {effectiveDiscount > 0 && (
          <div className="flex justify-between gap-2 font-bold text-[#6B352A]">
            <span className="min-w-0 truncate">
              {t('checkout.discount')}
              {activeCouponCode ? ` · ${activeCouponCode}` : ''}
            </span>
            <span className="shrink-0 tabular-nums">−{indianMoney(effectiveDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between gap-2 text-[#6B4C44]">
          <span>{t('cart.storePickup')}</span>
          <span className="font-extrabold text-[#6B352A]">{t('cart.free')}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#F4EAE0] pt-2.5 text-sm font-black text-[#2B1611]">
          <span>{t('checkout.totalPayable')}</span>
          <span className="shrink-0 whitespace-nowrap text-base text-[#6B352A] tabular-nums" data-testid="checkout-summary-total">
            {indianMoney(total)}
          </span>
        </div>
      </div>
    </section>
  );

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] flex items-end justify-center overflow-x-hidden bg-[#2B1611]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={t('checkout.title')}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.2 }}
          className="relative flex max-h-[96dvh] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] bg-[#FFFCF4] text-[#2B1611] shadow-2xl sm:max-h-[92vh] sm:max-w-[960px] sm:rounded-[28px]"
        >
          {/* Header & Step Progress */}
          <header className="shrink-0 border-b border-[#E8D8C4] bg-[#6B352A] text-[#FFFCF4]">
            <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF1A6] text-[#6B352A] shadow-2xs">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10.5px] font-extrabold text-[#FFF1A6]">Rofik Godi Centre</p>
                  <h2 className="truncate text-base font-black tracking-tight text-[#FFFCF4] sm:text-lg">
                    {step === 3 ? t('checkout.placedTitle') : t('checkout.title')}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[#FFFCF4] transition-colors hover:bg-white/25"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {step < 3 && (
              <div className="flex min-w-0 items-center gap-3 border-t border-white/15 bg-[#53271E] px-4 py-2.5 sm:px-6">
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20">
                  <i
                    className={`block h-full rounded-full bg-[#FFF1A6] transition-all duration-300 ${
                      step === 1 ? 'w-1/2' : 'w-full'
                    }`}
                  />
                </span>
                <span className="shrink-0 whitespace-nowrap text-[11px] font-bold text-[#FFF1A6] tabular-nums">
                  {step === 1 ? t('checkout.progressPickup') : t('checkout.progressPayment')} · {step}/2
                </span>
              </div>
            )}
          </header>

          {/* Scrollable Body */}
          <main className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3.5 py-4 sm:px-6 sm:py-5">
            {profileLoad === 'loading' && step < 3 && (
              <CheckoutPageSkeleton label={t('checkout.loading')} />
            )}

            {profileError && step < 3 && (
              <div
                role="alert"
                className="rounded-2xl border border-[#E6CE73] bg-[#FFF8D6] p-4 text-xs font-medium leading-relaxed text-[#2B1611] shadow-2xs"
              >
                {profileError}
                <button type="button" onClick={onClose} className="ml-2 font-black text-[#6B352A] underline">
                  {t('checkout.closeRetry')}
                </button>
              </div>
            )}

            {step === 1 && profileLoad === 'ready' && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] lg:items-start">
                <div className="min-w-0 space-y-4">
                  {/* 1. Customer Details Card */}
                  <section className="min-w-0 max-w-full rounded-3xl border border-[#E8D8C4] bg-white p-4 sm:p-5 backdrop-blur-md shadow-[0_12px_32px_-16px_rgba(107,53,42,0.08)]">
                    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex min-w-0 items-center gap-2 text-sm font-black tracking-tight text-[#2B1611]">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF1A6] text-[#6B352A]">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <span className="truncate">{t('checkout.details')}</span>
                      </h3>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E6CE73] bg-[#FFF8D6] px-2.5 py-1 text-[10px] font-extrabold text-[#6B352A]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t('checkout.account')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0 rounded-2xl border border-[#F4EAE0] bg-[#FFFCF4] px-3.5 py-3">
                        <p className="text-[10px] font-bold text-[#8A6C63]">{t('checkout.name')}</p>
                        <p className="mt-1 break-words text-sm font-extrabold text-[#2B1611] sm:text-xs">
                          {customerName || t('checkout.nameMissing')}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-2xl border border-[#F4EAE0] bg-[#FFFCF4] px-3.5 py-3">
                        <p className="text-[10px] font-bold text-[#8A6C63]">{t('checkout.email')}</p>
                        <p className="mt-1 break-all text-sm font-semibold text-[#6B4C44] sm:text-xs">{email}</p>
                      </div>
                    </div>

                    <div className="mt-3 min-w-0 rounded-2xl border border-[#E8D8C4] bg-[#FFFCF4] p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-[#8A6C63]">{t('checkout.mobile')}</p>
                          <p className="mt-1 break-words text-sm font-extrabold text-[#2B1611] tabular-nums sm:text-xs">
                            {phone && !editingPhone ? phone : t('checkout.addMobile')}
                          </p>
                          {savedPhone && !editingPhone && (
                            <p className="mt-1 text-[11px] text-[#6B4C44]">{t('checkout.changeNumber')}</p>
                          )}
                        </div>
                        {savedPhone && !editingPhone && (
                          <button
                            type="button"
                            onClick={() => setEditingPhone(true)}
                            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-[#E8D8C4] bg-white px-3 py-1.5 text-xs font-bold text-[#6B352A] hover:border-[#6B352A] hover:bg-[#FFF8D6]"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </div>
                      {editingPhone && (
                        <div className="mt-2.5 min-w-0">
                          <PhoneNumberField
                            id="checkout-phone"
                            label={t('checkout.mobile')}
                            value={phone}
                            country={phoneCountry}
                            onChange={(value) => {
                              setPhone(value);
                              setPhoneError('');
                              setPhoneTouched(false);
                            }}
                            onCountryChange={(country) => {
                              setPhoneCountry(country);
                              setPhoneError('');
                              setPhoneTouched(false);
                            }}
                            onBlur={() => {
                              setPhoneTouched(true);
                              setPhoneError(validatePhoneNumber(phone, phoneCountry).message || '');
                            }}
                            error={visiblePhoneError}
                            placeholder={t('checkout.mobile')}
                            className="border-[#E8D8C4] bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  {/* 2. Vehicle Fitment Card with Quick Category Pills */}
                  <section className="min-w-0 max-w-full rounded-3xl border border-[#E8D8C4] bg-white p-4 sm:p-5 backdrop-blur-md shadow-[0_12px_32px_-16px_rgba(107,53,42,0.08)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF1A6] text-[#6B352A]">
                          <Truck className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black tracking-tight text-[#2B1611]">{t('checkout.vehicle')}</h3>
                          <p className="mt-0.5 break-words text-[11px] font-medium text-[#6B4C44]">
                            {t('checkout.vehicleCompany')} → {t('checkout.vehicleModel')}
                          </p>
                        </div>
                      </div>
                      {hasSavedVehicle && !editingVehicle && (
                        <button
                          type="button"
                          onClick={() => setEditingVehicle(true)}
                          className="min-h-11 shrink-0 rounded-xl border border-[#E6CE73] bg-[#FFF8D6] px-3 text-xs font-extrabold text-[#6B352A] transition-colors hover:bg-[#FFF1A6]"
                        >
                          {t('checkout.changeModel')}
                        </button>
                      )}
                    </div>

                    {!editingVehicle && hasSavedVehicle ? (
                      <div className="mt-4 flex min-w-0 items-center gap-3 rounded-2xl border border-[#E8D8C4] bg-[#FFFCF4] p-3 sm:gap-3.5 sm:p-3.5">
                        {selectedFitment?.image ? (
                          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-[#E8D8C4] sm:h-[72px] sm:w-32">
                            <img src={selectedFitment.image} alt={selectedFitment.name} className="h-full w-full object-contain p-1 sm:scale-110 sm:p-0" />
                          </div>
                        ) : (
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white text-[#6B352A] ring-1 ring-[#E8D8C4]">
                            <Truck className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-[#8A6C63]">{t('checkout.savedVehicle')}</p>
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-[#6B4C44]">
                            {vehicleCompany || vehicleType}
                          </p>
                          <p className="mt-0.5 break-words text-sm font-black text-[#2B1611]">
                            {vehicleModel || t('checkout.exampleVehicle')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 min-w-0 space-y-3.5">
                        {/* Quick Vehicle Category Pills */}
                        <div className="flex flex-wrap gap-1.5 sm:grid sm:grid-cols-5" role="group" aria-label="Quick vehicle category">
                          {vehicleTypes.map((type) => {
                            const active = vehicleType === type;
                            const shortName = type === 'Toto / E-rickshaw' ? 'Toto' : vehicleTypeLabel(type);
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  if (vehicleType === type) return;
                                  setVehicleType(type);
                                  setVehicleCompany('');
                                  setVehicleModel('');
                                }}
                                className={`min-h-11 min-w-[calc(33%-4px)] flex-1 rounded-xl border px-2 py-1.5 text-xs font-extrabold transition-all whitespace-nowrap truncate sm:min-w-0 sm:text-[11px] ${
                                  active
                                    ? 'border-[#6B352A] bg-[#6B352A] text-[#FFFCF4] shadow-2xs'
                                    : 'border-[#E8D8C4] bg-[#FFFCF4] text-[#6B4C44] hover:border-[#6B352A]/40 hover:bg-[#FFF8D6]'
                                }`}
                              >
                                {shortName}
                              </button>
                            );
                          })}
                        </div>

                        <label className="block min-w-0 text-[11px] font-bold text-[#6B4C44]">
                          {t('checkout.vehicleType')}
                          <select
                            value={vehicleType}
                            onChange={(event) => {
                              setVehicleType(event.target.value as VehicleType);
                              setVehicleCompany('');
                              setVehicleModel('');
                            }}
                            className="mt-1.5 min-h-12 w-full rounded-xl border border-[#E8D8C4] bg-[#FFFCF4] px-3.5 text-base font-semibold text-[#2B1611] outline-none transition focus:border-[#6B352A] focus:bg-white focus:ring-4 focus:ring-[#FFF1A6] sm:text-sm"
                          >
                            {vehicleTypes.map((type) => (
                              <option key={type} value={type}>
                                {vehicleTypeLabel(type)}
                              </option>
                            ))}
                          </select>
                        </label>

                        {vehicleCompanies.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            <label className="block min-w-0 text-[11px] font-bold text-[#6B4C44]">
                              {t('checkout.vehicleCompany')}
                              <select
                                value={vehicleCompany}
                                onChange={(event) => {
                                  setVehicleCompany(event.target.value);
                                  setVehicleModel('');
                                }}
                                className="mt-1.5 min-h-12 w-full rounded-xl border border-[#E8D8C4] bg-[#FFFCF4] px-3.5 text-base font-semibold text-[#2B1611] outline-none transition focus:border-[#6B352A] focus:bg-white focus:ring-4 focus:ring-[#FFF1A6] sm:text-sm"
                              >
                                <option value="">{t('checkout.chooseCompany')}</option>
                                {vehicleCompanies.map((company) => (
                                  <option key={company} value={company}>
                                    {company}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="block min-w-0 text-[11px] font-bold text-[#6B4C44]">
                              <span>{t('checkout.vehicleModel')}</span>
                              {!vehicleCompany ? (
                                <p className="mt-1.5 rounded-xl border border-dashed border-[#E8D8C4] bg-[#FFFCF4] px-3.5 py-4 text-xs font-medium text-[#8A6C63]">
                                  {t('checkout.chooseCompany')}
                                </p>
                              ) : (
                                <VehicleModelPicker
                                  models={vehicleModelOptions}
                                  selectedModel={vehicleModel}
                                  onSelect={setVehicleModel}
                                  selectedLabel={t('checkout.selectedVehicle')}
                                  changeLabel={t('checkout.changeModel')}
                                  ariaLabel={t('checkout.vehicleModel')}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="block min-w-0 text-[11px] font-bold text-[#6B4C44]">
                              {t('checkout.vehicleCompany')}
                              <input
                                value={vehicleCompany}
                                onChange={(event) => setVehicleCompany(event.target.value)}
                                maxLength={40}
                                placeholder={t('checkout.exampleCompany')}
                                className="mt-1.5 min-h-12 w-full rounded-xl border border-[#E8D8C4] bg-[#FFFCF4] px-3.5 text-base font-semibold text-[#2B1611] outline-none transition placeholder:font-normal placeholder:text-[#8A6C63] focus:border-[#6B352A] focus:bg-white focus:ring-4 focus:ring-[#FFF1A6] sm:text-sm"
                              />
                            </label>
                            <label className="block min-w-0 text-[11px] font-bold text-[#6B4C44]">
                              {t('checkout.vehicleModel')}
                              <input
                                value={vehicleModel}
                                onChange={(event) => setVehicleModel(event.target.value)}
                                maxLength={60}
                                placeholder={t('checkout.exampleModel')}
                                className="mt-1.5 min-h-12 w-full rounded-xl border border-[#E8D8C4] bg-[#FFFCF4] px-3.5 text-base font-semibold text-[#2B1611] outline-none transition placeholder:font-normal placeholder:text-[#8A6C63] focus:border-[#6B352A] focus:bg-white focus:ring-4 focus:ring-[#FFF1A6] sm:text-sm"
                              />
                            </label>
                          </div>
                        )}
                        {hasSavedVehicle && (
                          <button
                            type="button"
                            onClick={() => setEditingVehicle(false)}
                            className="min-h-11 text-xs font-bold text-[#6B4C44] underline decoration-[#D4C0AE] underline-offset-4 hover:text-[#6B352A]"
                          >
                            {t('checkout.keepVehicle')}
                          </button>
                        )}
                      </div>
                    )}
                  </section>

                  {/* 3. Pickup Date & Time Slots Card */}
                  <section className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-[#E8D8C4] bg-white p-4 sm:p-5 backdrop-blur-md shadow-[0_12px_32px_-16px_rgba(107,53,42,0.08)]">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF1A6] text-[#6B352A]">
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black tracking-tight text-[#2B1611]">{t('checkout.chooseTime')}</h3>
                        <p className="mt-0.5 text-[11px] text-[#6B4C44]">{t('checkout.slotHint')}</p>
                      </div>
                    </div>

                    <div className="no-scrollbar mt-3.5 flex w-full max-w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
                      {pickupDates.map((date) => {
                        const value = isoDate(date);
                        const selected = pickupDate === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPickupDate(value)}
                            aria-pressed={selected}
                            className={`min-h-14 w-[78px] shrink-0 snap-start rounded-2xl border px-3 py-2.5 text-left transition-all sm:w-auto sm:min-w-[84px] ${
                              selected
                                ? 'border-[#6B352A] bg-[#FFF1A6] text-[#6B352A] shadow-2xs ring-1 ring-[#6B352A]/30'
                                : 'border-[#E8D8C4] bg-[#FFFCF4] text-[#6B4C44] hover:border-[#6B352A]/40 hover:bg-white'
                            }`}
                          >
                            <span className="block text-[10px] font-bold uppercase opacity-75">
                              {date.toLocaleDateString(locale, { weekday: 'short' })}
                            </span>
                            <span className="mt-0.5 block text-xs font-black tabular-nums">
                              {date.getDate()} {date.toLocaleDateString(locale, { month: 'short' })}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {timeSlots.map((slot) => {
                        const selected = pickupTime === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setPickupTime(slot)}
                            aria-pressed={selected}
                            className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-3.5 text-left text-xs font-bold transition-all tabular-nums ${
                              selected
                                ? 'border-[#6B352A] bg-[#FFF1A6] text-[#6B352A] shadow-2xs'
                                : 'border-[#E8D8C4] bg-[#FFFCF4] text-[#2B1611] hover:border-[#6B352A]/40 hover:bg-white'
                            }`}
                          >
                            <Clock3 className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 truncate">{slot}</span>
                            {selected && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* 4. Workshop Pickup Location Card */}
                  <section className="flex min-w-0 max-w-full items-start gap-3.5 rounded-3xl border border-[#E6CE73] bg-gradient-to-br from-[#FFF8D6] via-[#FFFCF4] to-[#FFF1A6]/50 p-4 sm:p-5 shadow-2xs">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#6B352A] ring-1 ring-[#E6CE73] shadow-2xs">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-xs font-black text-[#2B1611]">
                          {t('checkout.pickupAt', { store: WORKSHOP_INFO.name })}
                        </h3>
                        <span className="rounded-lg border border-[#6B352A]/20 bg-[#6B352A] px-2 py-0.5 text-[10px] font-extrabold text-[#FFF1A6]">
                          {t('checkout.freePickup')}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-[11px] leading-relaxed text-[#6B4C44]">{WORKSHOP_INFO.address}</p>
                      <p className="mt-1 break-words text-[11px] font-medium text-[#8A6C63]">{WORKSHOP_INFO.workingHours}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2.5 inline-flex min-h-11 items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-[#6B352A] ring-1 ring-[#E6CE73] transition-colors hover:bg-[#FFF1A6]"
                      >
                        {t('checkout.openMaps')}
                      </a>
                    </div>
                  </section>

                  {/* 5. Optional Pickup Note */}
                  <label className="block min-w-0 max-w-full rounded-3xl border border-[#E8D8C4] bg-white p-4 sm:p-5 text-xs font-extrabold text-[#2B1611] backdrop-blur-md shadow-2xs">
                    {t('checkout.note')} <span className="font-normal text-[#8A6C63]">{t('checkout.optional')}</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      maxLength={240}
                      rows={2}
                      placeholder={t('checkout.noteHint')}
                      className="mt-2 w-full resize-none rounded-2xl border border-[#E8D8C4] bg-[#FFFCF4] p-3 text-base font-medium text-[#2B1611] outline-none transition-colors focus:border-[#6B352A] focus:bg-white sm:text-sm"
                    />
                  </label>
                </div>

                {/* Right Sticky Summary Column on Desktop */}
                <div className="min-w-0 lg:sticky lg:top-0">{renderSummary()}</div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] lg:items-start">
                <div className="min-w-0 space-y-4">
                  {/* Payment Method Cards */}
                  <section className="min-w-0 max-w-full rounded-3xl border border-[#E8D8C4] bg-white p-4 sm:p-5 backdrop-blur-md shadow-[0_12px_32px_-16px_rgba(107,53,42,0.08)]">
                    <h3 className="mb-3.5 flex items-center gap-2 text-sm font-black tracking-tight text-[#2B1611]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF1A6] text-[#6B352A]">
                        <CreditCard className="h-4 w-4" />
                      </span>
                      <span className="truncate">{t('checkout.paymentMethod')}</span>
                    </h3>

                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingOnlineOrder(null);
                          setPaymentMethod('pay_at_store');
                        }}
                        aria-pressed={paymentMethod === 'pay_at_store'}
                        className={`flex min-h-[72px] w-full min-w-0 items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all ${
                          paymentMethod === 'pay_at_store'
                            ? 'border-[#6B352A] bg-gradient-to-r from-[#FFF8D6] to-white shadow-2xs ring-1 ring-[#6B352A]/25'
                            : 'border-[#E8D8C4] bg-[#FFFCF4] hover:border-[#6B352A]/40 hover:bg-white'
                        }`}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF1A6] text-[#6B352A] ring-1 ring-[#E6CE73]">
                          <Banknote className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block break-words text-xs font-extrabold text-[#2B1611]">{t('checkout.payAtWorkshop')}</b>
                          <small className="mt-1 block break-words text-[11px] font-medium text-[#6B4C44]">
                            {t('checkout.cashOrUpi')}
                          </small>
                        </span>
                        {paymentMethod === 'pay_at_store' && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#6B352A]" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPendingOnlineOrder(null);
                          setPaymentMethod('pay_online');
                        }}
                        aria-pressed={paymentMethod === 'pay_online'}
                        className={`flex min-h-[72px] w-full min-w-0 items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all ${
                          paymentMethod === 'pay_online'
                            ? 'border-[#6B352A] bg-gradient-to-r from-[#FFF8D6] to-white shadow-2xs ring-1 ring-[#6B352A]/25'
                            : 'border-[#E8D8C4] bg-[#FFFCF4] hover:border-[#6B352A]/40 hover:bg-white'
                        }`}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F6EAE4] text-[#6B352A] ring-1 ring-[#DFC6B8]">
                          <CreditCard className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block break-words text-xs font-extrabold text-[#2B1611]">{t('checkout.onlinePayment')}</b>
                          <small className="mt-1 block break-words text-[11px] font-medium text-[#6B4C44]">
                            {t('checkout.onlinePaymentMethods')}
                          </small>
                        </span>
                        {paymentMethod === 'pay_online' && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#6B352A]" />}
                      </button>
                    </div>

                    {paymentMethod === 'pay_online' && (
                      <div className="mt-3.5 rounded-2xl border border-[#E6CE73] bg-[#FFF8D6] p-3.5 text-xs text-[#2B1611]">
                        <p className="font-extrabold text-[#6B352A]">{t('checkout.razorpayPaymentInfo')}</p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#6B4C44]">{t('checkout.paymentPending')}</p>
                      </div>
                    )}
                  </section>

                  {/* Pickup Recap Card */}
                  <div className="min-w-0 max-w-full rounded-3xl border border-[#E8D8C4] bg-white p-4 sm:p-5 backdrop-blur-md shadow-2xs">
                    <div className="flex items-center justify-between gap-2 border-b border-[#F4EAE0] pb-2.5">
                      <h3 className="min-w-0 truncate text-xs font-black tracking-tight text-[#2B1611]">{t('checkout.pickupDetails')}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingOnlineOrder(null);
                          setStep(1);
                          setSubmissionError('');
                        }}
                        className="min-h-11 shrink-0 px-2 text-xs font-bold text-[#6B352A] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="mt-3 break-words text-xs font-bold text-[#2B1611]">
                      {pickupDate &&
                        new Date(`${pickupDate}T00:00:00`).toLocaleDateString(locale, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}{' '}
                      · {pickupTime}
                    </p>
                    <p className="mt-1 break-words text-[11.5px] font-medium text-[#6B4C44]">
                      {customerName} · {phone} · {vehicleValue || vehicleType}
                    </p>
                  </div>
                </div>

                {/* Sticky Order Summary on Desktop */}
                <div className="min-w-0 lg:sticky lg:top-0">{renderSummary()}</div>
              </div>
            )}

            {step === 3 && placedOrder && (
              <div className="mx-auto w-full min-w-0 max-w-lg space-y-5 py-2 text-center sm:py-4">
                <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FFF1A6] to-[#FFF8D6] text-[#6B352A] ring-1 ring-[#E6CE73] shadow-sm">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-[#2B1611]">{t('checkout.orderReceived')}</h3>
                  <p className="mt-1.5 text-xs font-medium text-[#6B4C44]">{t('checkout.orderSaved')}</p>
                </div>

                <div className="rounded-3xl border border-[#E8D8C4] bg-white p-4 text-left backdrop-blur-md shadow-[0_14px_34px_-16px_rgba(107,53,42,0.1)] sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F4EAE0] pb-3.5">
                    <span className="text-xs font-semibold text-[#6B4C44]">{t('checkout.orderId')}</span>
                    <div className="flex items-center gap-2">
                      <b className="font-mono text-base font-black text-[#2B1611]">#{placedOrder.orderId}</b>
                      <button
                        type="button"
                        onClick={() => void handleCopyPlacedOrderId()}
                        aria-label={copiedOrderId ? 'Order ID copied' : 'Copy Order ID'}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E8D8C4] bg-[#FFFCF4] text-[#6B4C44] hover:bg-[#FFF8D6] hover:text-[#6B352A]"
                      >
                        {copiedOrderId ? <Check className="h-4 w-4 text-[#6B352A]" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3.5 flex flex-wrap justify-between gap-2 text-xs">
                    <span className="text-[#6B4C44]">{t('checkout.pickup')}</span>
                    <b className="break-words text-right font-bold text-[#2B1611] tabular-nums">
                      {pickupDate} · {pickupTime}
                    </b>
                  </div>
                  <div className="mt-2.5 flex flex-wrap justify-between gap-2 text-xs">
                    <span className="text-[#6B4C44]">{t('checkout.payment')}</span>
                    <b className="text-right font-bold text-[#2B1611]">
                      {placedOrder.paymentMethod === 'pay_at_store'
                        ? t('checkout.payOnPickup')
                        : placedOrder.paymentStatus === 'paid'
                          ? t('checkout.paymentPaid')
                          : t('checkout.upiPending')}
                    </b>
                  </div>
                  <div className="mt-3 flex justify-between gap-2 border-t border-[#F4EAE0] pt-3 text-sm">
                    <span className="font-bold text-[#2B1611]">{t('orders.total')}</span>
                    <b className="shrink-0 whitespace-nowrap font-black text-[#6B352A] tabular-nums">{indianMoney(placedOrder.total)}</b>
                  </div>
                </div>

                <p className="text-[11px] font-medium text-[#6B4C44]">{t('checkout.trackOrder')}</p>
              </div>
            )}

            {submissionError && step < 3 && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-[#E9C2B5] bg-[#FDF2EE] px-4 py-3 text-xs font-semibold text-[#9E2A2B]"
              >
                {submissionError}
              </p>
            )}
          </main>

          {/* Compact Sticky Action Footer */}
          <footer
            className="w-full shrink-0 border-t border-[#E8D8C4] bg-white px-3.5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(107,53,42,0.08)] sm:px-6"
          >
            {step === 3 ? (
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setPlacedOrder(null);
                  onClose();
                }}
                className="banner-cta-shine group/cta min-h-12 w-full rounded-2xl bg-[#6B352A] text-sm font-black text-[#FFFCF4] shadow-sm transition-all hover:bg-[#53271E] hover:shadow-md active:scale-[0.98]"
              >
                {t('checkout.continueShopping')}
              </button>
            ) : (
              <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2.5 sm:flex-nowrap sm:gap-3">
                <div className="min-w-0 shrink-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8A6C63]">
                    {t('checkout.payable')}
                  </span>
                  <b className="whitespace-nowrap text-lg font-black text-[#2B1611] tabular-nums">{indianMoney(total)}</b>
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  {step === 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingOnlineOrder(null);
                        setStep(1);
                        setSubmissionError('');
                      }}
                      className="min-h-12 shrink-0 whitespace-nowrap rounded-2xl border border-[#E8D8C4] bg-[#FFFCF4] px-3.5 text-xs font-bold text-[#6B352A] transition-colors hover:bg-[#FFF8D6] active:scale-[0.98] sm:px-4"
                    >
                      {t('checkout.back')}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isProcessing || profileLoad !== 'ready'}
                    onClick={() => (step === 1 ? continueToPayment() : void handlePlaceOrder())}
                    className={`banner-cta-shine group/cta flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl px-4 text-xs font-black transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:flex-initial sm:min-w-[230px] sm:px-5 sm:text-sm ${
                      step === 1
                        ? 'bg-[#6B352A] text-[#FFFCF4] shadow-[0_8px_20px_-6px_rgba(107,53,42,0.4)] hover:bg-[#53271E]'
                        : 'bg-[#FF6115] text-[#1F0E0A] shadow-[0_8px_20px_-6px_rgba(255,97,21,0.45)] hover:bg-[#E5520D]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
                        <span className="truncate">{paymentMethod === 'pay_online' ? t('checkout.preparingPayment') : t('checkout.saving')}</span>
                      </>
                    ) : step === 1 ? (
                      <>
                        <span className="truncate">{t('checkout.continueToPayment')}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                      </>
                    ) : paymentMethod === 'pay_online' ? (
                      <>
                        <span className="truncate">{t('checkout.payWithRazorpay')}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                      </>
                    ) : (
                      <>
                        <span className="truncate">{t('checkout.confirmPickup')}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </footer>
        </motion.div>

        {toastMessage && (
          <div
            role="alert"
            className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-[#2B1611] px-4 py-3 text-center text-sm font-bold text-[#FFF1A6] shadow-2xl ring-1 ring-[#FFF1A6]/30"
          >
            {toastMessage}
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
