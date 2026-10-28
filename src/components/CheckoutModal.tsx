import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Banknote, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, CreditCard,
  LoaderCircle, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Store, Truck,
  UserRound, X,
} from 'lucide-react';
import { VEHICLE_BRANDS, WORKSHOP_INFO } from '../data/products';
import { VEHICLE_MODELS } from '../data/vehicleModels';
import {
  getCheckoutVehicleCompanies,
  getCheckoutVehicleModels,
  type CheckoutVehicleType,
} from '../lib/checkoutVehicleFitment';
import { CartItem, OrderDetails } from '../types';
import { cancelUnpaidOnlineOrder, createSupabaseOrder } from '../lib/supabaseOrders';
import { openRazorpayCheckout } from '../lib/razorpay';
import { supabase } from '../lib/supabase';
import { validateProfileName } from '../lib/profileValidation';
import { getPhoneCountry, validatePhoneNumber, type CountryCode } from '../utils/phoneValidation';
import { PhoneNumberField } from './PhoneNumberField';
import { MAX_ORDER_ITEM_QUANTITY } from '../lib/cart';
import { formatInr, useI18n } from '../lib/i18n';

interface CheckoutModalProps {
  isOpen: boolean; onClose: () => void; items: CartItem[]; discount: number; couponCode: string;
  couponSubtotal?: number; couponTotal?: number; onClearCart: () => void; userId: string; onOrderPlaced: () => void;
  onUpdateQuantity: (cartItemId: string, newQuantity: number) => void;
}
type VehicleType = CheckoutVehicleType;
type ProfileLoad = 'loading' | 'ready' | 'error';
const vehicleTypes: VehicleType[] = ['Bike', 'Scooter', 'Car', 'Toto / E-rickshaw', 'Other'];
const timeSlots = ['10:00 AM – 12:00 PM', '12:00 PM – 2:00 PM', '2:00 PM – 4:00 PM', '4:00 PM – 6:00 PM'];
const indianMoney = formatInr;
const isoDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen, onClose, items, discount, couponCode, couponSubtotal, couponTotal, onClearCart, userId, onOrderPlaced, onUpdateQuantity,
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
  const [isProcessing, setIsProcessing] = useState(false);
  const submitLockRef = useRef(false);
  const [submissionError, setSubmissionError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef<number | null>(null);

  const subtotal = couponCode && couponSubtotal !== undefined
    ? couponSubtotal
    : items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = couponCode && couponTotal !== undefined ? couponTotal : Math.max(0, subtotal - discount);
  const visiblePhoneError = phoneTouched ? validatePhoneNumber(phone, phoneCountry).message : phoneError;
  const pickupDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() + index + 1); return date;
  }), []);
  const vehicleCompanies = useMemo(() => getCheckoutVehicleCompanies(vehicleType), [vehicleType]);
  const vehicleModelOptions = useMemo(
    () => getCheckoutVehicleModels(vehicleType, vehicleCompany),
    [vehicleType, vehicleCompany],
  );
  const selectedFitment = vehicleModelOptions.find((model) => model.name === vehicleModel);
  const vehicleValue = vehicleModel.trim()
    ? `${vehicleType} · ${vehicleCompany ? `${vehicleCompany} · ` : ''}${vehicleModel.trim()}`
    : '';
  const vehicleTypeLabel = (type: VehicleType) => type === 'Bike' ? t('checkout.vehicleBike')
    : type === 'Scooter' ? t('checkout.vehicleScooter')
      : type === 'Car' ? t('checkout.vehicleCar')
        : type === 'Toto / E-rickshaw' ? t('checkout.vehicleToto') : t('checkout.vehicleOther');

  useEffect(() => {
    if (!isOpen || !userId) return;
    let active = true;
    setProfileLoad('loading'); setProfileError(''); setSubmissionError(''); setToastMessage(''); setStep(1); setPendingOnlineOrder(null); setPlacedOrder(null);
    setEditingPhone(false); setEditingVehicle(false); setPhoneError('');
    const loadProfile = async () => {
      if (!supabase) {
        if (active) { setProfileError(t('checkout.errorUnavailable')); setProfileLoad('error'); }
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) {
        if (active) { setProfileError(t('checkout.errorSessionChanged')); setProfileLoad('error'); }
        return;
      }
      const { data: profile, error } = await supabase.from('profiles').select('id,full_name,phone,vehicle_model').eq('id', authData.user.id).maybeSingle();
      if (!active) return;
      if (error) { setProfileError(t('checkout.profileLoadFailed')); setProfileLoad('error'); return; }
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
        ? VEHICLE_MODELS.find((model) => model.type === savedCatalogType && model.name.toLowerCase() === savedModel.toLowerCase()) ||
          VEHICLE_MODELS.find(
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
      setEmail(authData.user.email || ''); setPhone(savedNumber); setSavedPhone(savedNumber); setPhoneCountry(getPhoneCountry(savedNumber)); setPhoneTouched(false);
      setVehicleType(savedType);
      setVehicleCompany(savedCatalogVehicle?.brand || savedTotoGroup?.brand || savedCompany);
      setVehicleModel(savedCatalogVehicle?.name || savedTotoModel || savedModel);
      setHasSavedVehicle(Boolean(savedVehicle)); setEditingPhone(!savedNumber); setEditingVehicle(!savedVehicle); setProfileLoad('ready');
    };
    void loadProfile();
    return () => { active = false; };
  }, [isOpen, t, userId]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  if (!isOpen) return null;

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
    if (profileLoad !== 'ready') { setSubmissionError(t('checkout.errorAccountLoading')); return; }
    if (validateProfileName(customerName)) { setSubmissionError(t('checkout.errorName')); return; }
    const phoneResult = validatePhoneNumber(phone, phoneCountry);
    setPhoneTouched(true);
    if (!phoneResult.valid) { setPhoneError(t('checkout.errorPhone')); setStep(1); return; }
    if (!pickupDate || !pickupTime) { setSubmissionError(''); showToast(t('checkout.errorPickup')); setStep(1); return; }
    submitLockRef.current = true;
    setPhoneError(''); setIsProcessing(true);
    let savedOrder: OrderDetails | null = pendingOnlineOrder;
    try {
      const { data: authData, error: authError } = await supabase!.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) throw new Error(t('checkout.errorSessionChanged'));
      await saveCustomerPreferences(authData.user.id);
      const pickupLabel = `${new Date(`${pickupDate}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}, ${pickupTime}`;
      const pickupNote = [`Pickup requested: ${pickupLabel}`, note.trim()].filter(Boolean).join(' · ');
      const order: OrderDetails = {
        orderId: '', items: [...items], subtotal, discount, total, customerName: customerName.trim(), phone: phoneResult.e164!,
        vehicleModel: vehicleValue, note: pickupNote,
        paymentMethod, paymentStatus: 'pending', fulfillmentMethod: 'STORE_PICKUP', pickupStore: WORKSHOP_INFO.name,
        status: 'NEW', createdAt: new Date().toISOString(),
      };
      if (!savedOrder) {
        const persisted = await createSupabaseOrder(order, userId, couponCode);
        if (persisted.error || !persisted.order) throw new Error(persisted.error?.message || 'Unable to save your order. Please try again.');
        savedOrder = persisted.order;
        if (paymentMethod === 'pay_online') setPendingOnlineOrder(savedOrder);
      }
      if (paymentMethod === 'pay_online') {
        await openRazorpayCheckout(savedOrder.orderId);
        savedOrder = { ...savedOrder, paymentStatus: 'paid' };
        setPendingOnlineOrder(null);
      }
      setPlacedOrder(savedOrder); setStep(3); onClearCart(); onOrderPlaced();
      confetti({ particleCount: 70, spread: 58, origin: { y: 0.65 }, colors: ['#D9232D', '#111827', '#EAB308', '#059669'] });
    } catch (error) {
      if (paymentMethod === 'pay_online' && savedOrder?.orderId && savedOrder.paymentStatus !== 'paid') {
        await cancelUnpaidOnlineOrder(savedOrder.orderId).catch(() => undefined);
        setPendingOnlineOrder(null);
      }
      setSubmissionError(error instanceof Error ? error.message : 'Unable to save your order. Please try again.');
    } finally { submitLockRef.current = false; setIsProcessing(false); }
  };

  const continueToPayment = () => {
    setSubmissionError('');
    const phoneResult = validatePhoneNumber(phone, phoneCountry);
    setPhoneTouched(true);
    if (!customerName.trim() || !email) { setSubmissionError(t('checkout.errorMissingNameEmail')); return; }
    if (!phoneResult.valid) { setPhoneError(t('checkout.errorPhone')); return; }
    if (!pickupDate || !pickupTime) { showToast(t('checkout.errorPickupFirst')); return; }
    setPhoneError(''); setStep(2);
  };

  const renderSummary = () => <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label={t('checkout.orderSummary')}>
    <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><ShoppingBag className="h-4 w-4 text-[#D9232D]" />{t('checkout.orderSummary')}</h3><span className="text-[11px] font-semibold text-slate-400">{items.length} {items.length === 1 ? 'item' : 'items'}</span></div>
    <div className="max-h-36 space-y-3 overflow-y-auto">{items.map((item) => <div key={item.cartItemId} className="flex items-center gap-3"><img src={item.product.image} alt="" className="h-12 w-12 rounded-xl bg-slate-100 object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{item.product.title}</p><div className="mt-1 flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[10px] text-slate-500">{item.selectedColor?.name}</span><div role="group" aria-label={t('cart.quantityFor', { title: item.product.title })} className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"><button type="button" onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)} disabled={item.quantity <= 1} aria-label={t('cart.decreaseQuantity', { title: item.product.title })} className="grid min-h-11 min-w-11 place-items-center rounded-md bg-white text-slate-700 shadow-sm disabled:opacity-40"><Minus className="h-3 w-3" /></button><span className="w-7 text-center text-[11px] font-bold text-slate-900">{item.quantity}</span><button type="button" onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} disabled={!item.product.inStock || item.quantity >= MAX_ORDER_ITEM_QUANTITY} aria-label={item.quantity >= MAX_ORDER_ITEM_QUANTITY ? t('cart.maxQuantity', { title: item.product.title }) : t('cart.increaseQuantity', { title: item.product.title })} className="grid min-h-11 min-w-11 place-items-center rounded-md bg-white text-slate-700 shadow-sm disabled:opacity-40"><Plus className="h-3 w-3" /></button></div></div></div><b className="shrink-0 text-xs text-slate-800">{indianMoney(item.unitPrice * item.quantity)}</b></div>)}</div>
    <div className="mt-3 space-y-1.5 border-t border-dashed border-slate-200 pt-3 text-xs"><div className="flex justify-between text-slate-500"><span>{t('cart.subtotal')}</span><span>{indianMoney(subtotal)}</span></div>{discount > 0 && <div className="flex justify-between font-semibold text-emerald-700"><span>{t('checkout.discount')}{couponCode ? ` · ${couponCode}` : ''}</span><span>−{indianMoney(discount)}</span></div>}<div className="flex justify-between text-slate-500"><span>{t('cart.storePickup')}</span><span className="font-bold text-emerald-700">{t('cart.free')}</span></div><div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-black text-slate-900"><span>{t('checkout.totalPayable')}</span><span className="text-[#D9232D]">{indianMoney(total)}</span></div></div>
  </section>;

  return <AnimatePresence><div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t('checkout.title')}>
    <motion.div initial={{ opacity: 0, y: 18, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14 }} transition={{ duration: 0.2 }} className="relative flex max-h-[96dvh] w-full max-w-[650px] flex-col overflow-hidden rounded-t-[26px] bg-[#f7f8fa] text-slate-900 shadow-2xl sm:max-h-[92vh] sm:rounded-[26px]">
      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#D9232D]"><Store className="h-5 w-5" /></div><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#D9232D]">Rofik Godi Centre</p><h2 className="text-base font-black">{step === 3 ? t('checkout.placedTitle') : t('checkout.title')}</h2></div></div><button onClick={onClose} aria-label={t('common.close')} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" /></button></header>
      {step < 3 && <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-5 pb-3 sm:px-6"><span className="h-1.5 flex-1 overflow-hidden rounded bg-slate-100"><i className={`block h-full rounded bg-[#D9232D] transition-all ${step === 1 ? 'w-1/2' : 'w-full'}`} /></span><span className="whitespace-nowrap text-[10px] font-bold text-slate-500">{step === 1 ? t('checkout.progressPickup') : t('checkout.progressPayment')} · {step}/2</span></div>}
      <main className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        {profileLoad === 'loading' && step < 3 && <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin text-[#D9232D]" />{t('checkout.loading')}</div>}
        {profileError && step < 3 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{profileError}<button type="button" onClick={onClose} className="ml-2 font-black underline">{t('checkout.closeRetry')}</button></div>}
        {step === 1 && profileLoad === 'ready' && <>
          <section className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black"><UserRound className="h-4 w-4 text-[#D9232D]" />{t('checkout.details')}</h3><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-700"><ShieldCheck className="h-3 w-3" />{t('checkout.account')}</span></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('checkout.name')}</p><p className="mt-1 text-xs font-bold text-slate-800">{customerName || t('checkout.nameMissing')}</p></div><div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('checkout.email')}</p><p className="mt-1 break-all text-xs font-semibold text-slate-700">{email}</p></div></div>
            <div className="mt-3 rounded-xl border border-slate-200 p-3"><div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('checkout.mobile')}</p><p className="mt-1 text-xs font-bold text-slate-800">{phone && !editingPhone ? phone : t('checkout.addMobile')}</p>{savedPhone && !editingPhone && <p className="mt-1 text-[10px] text-slate-500">{t('checkout.changeNumber')}</p>}</div>
              {editingPhone && <div className="mt-2"><PhoneNumberField id="checkout-phone" label={t('checkout.mobile')} value={phone} country={phoneCountry} onChange={(value) => { setPhone(value); setPhoneError(''); setPhoneTouched(false); }} onCountryChange={(country) => { setPhoneCountry(country); setPhoneError(''); setPhoneTouched(false); }} onBlur={() => { setPhoneTouched(true); setPhoneError(validatePhoneNumber(phone, phoneCountry).message || ''); }} error={visiblePhoneError} placeholder={t('checkout.mobile')} className="border-slate-200 bg-white" /></div>}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,.03)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black"><Truck className="h-4 w-4 text-[#D9232D]" />{t('checkout.vehicle')}</h3>
                <p className="mt-1 pl-6 text-[10px] text-slate-500">{t('checkout.vehicleCompany')} → {t('checkout.vehicleModel')}</p>
              </div>
              {hasSavedVehicle && !editingVehicle && <button type="button" onClick={() => setEditingVehicle(true)} className="min-h-10 shrink-0 rounded-xl bg-red-50 px-3 text-[10px] font-extrabold text-[#D9232D]">{t('checkout.changeModel')}</button>}
            </div>
            {!editingVehicle && hasSavedVehicle ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {selectedFitment?.image ? <div className="h-[72px] w-32 shrink-0 overflow-hidden rounded-xl bg-white"><img src={selectedFitment.image} alt={selectedFitment.name} className="h-full w-full scale-110 object-contain" /></div> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-white text-[#D9232D]"><Truck className="h-6 w-6" /></div>}
                <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{t('checkout.savedVehicle')}</p><p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{vehicleCompany || vehicleType}</p><p className="mt-0.5 break-words text-sm font-black text-slate-900">{vehicleModel || t('checkout.exampleVehicle')}</p></div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block text-[11px] font-bold text-slate-600">{t('checkout.vehicleType')}
                  <select value={vehicleType} onChange={(event) => { setVehicleType(event.target.value as VehicleType); setVehicleCompany(''); setVehicleModel(''); }} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#D9232D] focus:ring-4 focus:ring-red-100">
                    {vehicleTypes.map((type) => <option key={type} value={type}>{vehicleTypeLabel(type)}</option>)}
                  </select>
                </label>
                {vehicleCompanies.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[11px] font-bold text-slate-600">{t('checkout.vehicleCompany')}
                      <select value={vehicleCompany} onChange={(event) => { setVehicleCompany(event.target.value); setVehicleModel(''); }} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#D9232D] focus:ring-4 focus:ring-red-100">
                        <option value="">{t('checkout.chooseCompany')}</option>
                        {vehicleCompanies.map((company) => <option key={company} value={company}>{company}</option>)}
                      </select>
                    </label>
                    <label className="block text-[11px] font-bold text-slate-600">{t('checkout.vehicleModel')}
                      <select value={vehicleModel} onChange={(event) => setVehicleModel(event.target.value)} disabled={!vehicleCompany} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#D9232D] focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400">
                        <option value="">{vehicleCompany ? t('checkout.chooseVehicleModel') : t('checkout.chooseCompany')}</option>
                        {vehicleModelOptions.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[11px] font-bold text-slate-600">{t('checkout.vehicleCompany')}
                      <input value={vehicleCompany} onChange={(event) => setVehicleCompany(event.target.value)} maxLength={40} placeholder={t('checkout.exampleCompany')} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-4 focus:ring-red-100" />
                    </label>
                    <label className="block text-[11px] font-bold text-slate-600">{t('checkout.vehicleModel')}
                      <input value={vehicleModel} onChange={(event) => setVehicleModel(event.target.value)} maxLength={60} placeholder={t('checkout.exampleModel')} className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-4 focus:ring-red-100" />
                    </label>
                  </div>
                )}
                {selectedFitment?.image && (
                  <div className="flex items-center gap-3 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/70 p-2.5">
                    <div className="h-[72px] w-32 shrink-0 overflow-hidden rounded-xl bg-white"><img src={selectedFitment.image} alt={selectedFitment.name} className="h-full w-full scale-110 object-contain" /></div>
                    <div className="min-w-0 flex-1"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-800"><Check className="h-3 w-3" />{t('checkout.selectedVehicle')}</span><p className="mt-1 truncate text-[10px] font-semibold text-slate-500">{selectedFitment.brand}</p><p className="break-words text-xs font-black leading-snug text-slate-900">{selectedFitment.name}</p></div>
                  </div>
                )}
                {hasSavedVehicle && <button type="button" onClick={() => setEditingVehicle(false)} className="min-h-9 text-[10px] font-bold text-slate-500 underline decoration-slate-300 underline-offset-4">{t('checkout.keepVehicle')}</button>}
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="flex items-center gap-2 text-sm font-black"><CalendarDays className="h-4 w-4 text-[#D9232D]" />{t('checkout.chooseTime')}</h3><p className="mt-1 text-[10px] text-slate-500">{t('checkout.slotHint')}</p><div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">{pickupDates.map((date) => { const value = isoDate(date); const selected = pickupDate === value; return <button key={value} onClick={() => setPickupDate(value)} aria-pressed={selected} className={`min-h-11 min-w-[82px] rounded-xl border px-3 py-2.5 text-left ${selected ? 'border-[#D9232D] bg-red-50 text-[#D9232D]' : 'border-slate-200 bg-white text-slate-600'}`}><span className="block text-[9px] font-bold uppercase">{date.toLocaleDateString(locale, { weekday: 'short' })}</span><span className="mt-0.5 block text-xs font-black">{date.getDate()} {date.toLocaleDateString(locale, { month: 'short' })}</span></button>; })}</div><div className="mt-3 grid grid-cols-2 gap-2">{timeSlots.map((slot) => <button key={slot} onClick={() => setPickupTime(slot)} aria-pressed={pickupTime === slot} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-[10px] font-bold ${pickupTime === slot ? 'border-[#D9232D] bg-red-50 text-[#D9232D]' : 'border-slate-200 text-slate-600'}`}><Clock3 className="h-3.5 w-3.5" />{slot}{pickupTime === slot && <Check className="ml-auto h-3.5 w-3.5" />}</button>)}</div></section>
          <section className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/70 p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#D9232D]"><MapPin className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-black">{t('checkout.pickupAt', { store: WORKSHOP_INFO.name })}</h3><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-800">{t('checkout.freePickup')}</span></div><p className="mt-1 text-[10px] leading-relaxed text-slate-600">{WORKSHOP_INFO.address}</p><p className="mt-1 text-[10px] text-slate-500">{WORKSHOP_INFO.workingHours}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}`)}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] font-extrabold text-[#D9232D]">{t('checkout.openMaps')}</a></div></section>
          <label className="block rounded-2xl border border-slate-200 bg-white p-4 text-[10px] font-bold text-slate-500">{t('checkout.note')} <span className="font-normal">{t('checkout.optional')}</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={240} rows={2} placeholder={t('checkout.noteHint')} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 outline-none focus:border-[#D9232D]" /></label>
          {renderSummary()}
        </>}
        {step === 2 && <><section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-black"><CreditCard className="h-4 w-4 text-[#D9232D]" />{t('checkout.paymentMethod')}</h3><div className="space-y-2"><button onClick={() => { setPendingOnlineOrder(null); setPaymentMethod('pay_at_store'); }} aria-pressed={paymentMethod === 'pay_at_store'} className={`flex min-h-[68px] w-full items-center gap-3 rounded-xl border p-3 text-left ${paymentMethod === 'pay_at_store' ? 'border-[#D9232D] bg-red-50/70' : 'border-slate-200'}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Banknote className="h-5 w-5" /></span><span className="flex-1"><b className="block text-xs">{t('checkout.payAtWorkshop')}</b><small className="mt-1 block text-[10px] text-slate-500">{t('checkout.cashOrUpi')}</small></span>{paymentMethod === 'pay_at_store' && <CheckCircle2 className="h-4 w-4 text-[#D9232D]" />}</button><button onClick={() => { setPendingOnlineOrder(null); setPaymentMethod('pay_online'); }} aria-pressed={paymentMethod === 'pay_online'} className={`flex min-h-[68px] w-full items-center gap-3 rounded-xl border p-3 text-left ${paymentMethod === 'pay_online' ? 'border-[#D9232D] bg-red-50/70' : 'border-slate-200'}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CreditCard className="h-5 w-5" /></span><span className="flex-1"><b className="block text-xs">{t('checkout.onlinePayment')}</b><small className="mt-1 block text-[10px] text-slate-500">{t('checkout.onlinePaymentMethods')}</small></span>{paymentMethod === 'pay_online' && <CheckCircle2 className="h-4 w-4 text-[#D9232D]" />}</button></div>{paymentMethod === 'pay_online' && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-center text-xs text-blue-900"><p className="font-bold">{t('checkout.razorpayPaymentInfo')}</p><p className="mt-2 text-left text-[10px] leading-relaxed">{t('checkout.paymentPending')}</p></div>}</section><div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-2 text-xs font-black">{t('checkout.pickupDetails')}</h3><p className="text-[11px] text-slate-600">{pickupDate && new Date(`${pickupDate}T00:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })} · {pickupTime}</p><p className="mt-1 text-[11px] text-slate-500">{customerName} · {phone} · {vehicleValue || vehicleType}</p></div>{renderSummary()}</>}
        {step === 3 && placedOrder && <div className="space-y-4 py-4 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-9 w-9" /></div><div><h3 className="text-xl font-black">{t('checkout.orderReceived')}</h3><p className="mt-1 text-xs text-slate-500">{t('checkout.orderSaved')}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 text-left"><div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-xs text-slate-500">{t('checkout.orderId')}</span><b className="font-mono text-base">#{placedOrder.orderId}</b></div><div className="mt-3 flex justify-between text-xs"><span>{t('checkout.pickup')}</span><b>{pickupDate} · {pickupTime}</b></div><div className="mt-2 flex justify-between text-xs"><span>{t('checkout.payment')}</span><b>{placedOrder.paymentMethod === 'pay_at_store' ? t('checkout.payOnPickup') : placedOrder.paymentStatus === 'paid' ? t('checkout.paymentPaid') : t('checkout.upiPending')}</b></div><div className="mt-2 flex justify-between text-xs"><span>{t('orders.total')}</span><b className="text-[#D9232D]">{indianMoney(placedOrder.total)}</b></div></div><p className="text-[10px] text-slate-500">{t('checkout.trackOrder')}</p></div>}
        {submissionError && step < 3 && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">{submissionError}</p>}
      </main>
      <footer className="border-t border-slate-100 bg-white px-4 pt-3 sm:px-6" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {step === 3 ? <button onClick={() => { setStep(1); setPlacedOrder(null); onClose(); }} className="min-h-12 w-full rounded-xl bg-slate-900 text-sm font-black text-white">{t('checkout.continueShopping')}</button> : <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">{t('checkout.payable')}</span><b className="text-lg font-black text-slate-900">{indianMoney(total)}</b></div>{step === 2 && <button onClick={() => { setPendingOnlineOrder(null); setStep(1); setSubmissionError(''); }} className="min-h-12 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700">{t('checkout.back')}</button>}<button disabled={isProcessing || profileLoad !== 'ready'} onClick={() => step === 1 ? continueToPayment() : void handlePlaceOrder()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#D9232D] px-4 text-xs font-black text-white shadow-[0_6px_18px_rgba(217,35,45,.2)] disabled:cursor-not-allowed disabled:opacity-50">{isProcessing ? <><LoaderCircle className="h-4 w-4 animate-spin" />{paymentMethod === 'pay_online' ? t('checkout.preparingPayment') : t('checkout.saving')}</> : step === 1 ? <>{t('checkout.continueToPayment')}<ChevronRight className="h-4 w-4" /></> : paymentMethod === 'pay_online' ? <>{t('checkout.payWithRazorpay')}<ChevronRight className="h-4 w-4" /></> : <>{t('checkout.confirmPickup')}<ChevronRight className="h-4 w-4" /></>}</button></div>}
      </footer>
    </motion.div>
    {toastMessage && <div role="alert" className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white shadow-2xl ring-1 ring-white/20">{toastMessage}</div>}
  </div></AnimatePresence>;
};
