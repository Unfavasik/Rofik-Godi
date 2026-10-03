import React, { useState } from 'react';
import { CartItem, OrderDetails } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, MapPin, CreditCard, QrCode, Banknote, Download, Share2, ChevronRight, Store, Clock3 } from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';
import { createSupabaseOrder } from '../lib/supabaseOrders';

interface CheckoutModalProps { isOpen: boolean; onClose: () => void; items: CartItem[]; discount: number; couponCode: string; couponSubtotal?: number; couponTotal?: number; onClearCart: () => void; userId: string; onOrderPlaced: () => void; }

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, items, discount, couponCode, couponSubtotal, couponTotal, onClearCart, userId, onOrderPlaced }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_store' | 'pay_online'>('pay_at_store');
  const [placedOrder, setPlacedOrder] = useState<OrderDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  if (!isOpen) return null;
  const localSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const subtotal = couponCode && couponSubtotal !== undefined ? couponSubtotal : localSubtotal;
  const total = couponCode && couponTotal !== undefined ? couponTotal : Math.max(0, subtotal - discount);

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    setSubmissionError('');
    const order: OrderDetails = { orderId: '', items: [...items], subtotal, discount, total, customerName: customerName.trim(), phone: phone.trim(), vehicleModel: vehicleModel.trim(), note: note.trim() || undefined, paymentMethod, paymentStatus: 'pending', fulfillmentMethod: 'STORE_PICKUP', pickupStore: WORKSHOP_INFO.name, status: 'NEW', createdAt: new Date().toISOString() };
    try {
      const persisted = await createSupabaseOrder(order, userId, couponCode);
      if (persisted.error || !persisted.order) {
        setSubmissionError(persisted.error?.message || 'Unable to save your order. Please try again.');
        return;
      }
      setPlacedOrder(persisted.order);
      setStep(3);
      onClearCart();
      onOrderPlaced();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#D9232D', '#111827', '#EAB308', '#059669'] });
    } catch {
      setSubmissionError('Unable to save your order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!placedOrder) return;
    const content = `ROFIK GODI CENTRE\nSTORE PICKUP ORDER\n\nOrder ID: ${placedOrder.orderId}\nCustomer: ${placedOrder.customerName}\nMobile: ${placedOrder.phone}\nVehicle: ${placedOrder.vehicleModel}\nPickup: ${WORKSHOP_INFO.name}\nPayment: ${placedOrder.paymentMethod === 'pay_at_store' ? 'Pay at Store' : 'Pay Online'}\nStatus: ${placedOrder.status}\n\n${placedOrder.items.map((it, i) => `${i + 1}. ${it.product.title} x${it.quantity} - ₹${it.unitPrice * it.quantity}`).join('\n')}\n\nSubtotal: ₹${placedOrder.subtotal}\nDiscount: -₹${placedOrder.discount}\nTOTAL: ₹${placedOrder.total}`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = `Pickup-${placedOrder.orderId}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  return <AnimatePresence><div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/65 backdrop-blur-sm" /><motion.div initial={{ scale: .95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative z-10 flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[28px] bg-white text-gray-800 shadow-2xl">
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D9232D] text-xs font-black text-white">R</div><h3 className="text-[14px] font-black">{step === 3 ? 'Pickup Order Received' : 'Reserve for Store Pickup'}</h3></div><button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"><X className="h-3.5 w-3.5" /></button></div>
    {step < 3 && <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-2 text-[11px] font-bold text-gray-500"><span className={step >= 1 ? 'text-[#D9232D]' : ''}>1. Customer</span><ChevronRight className="h-3 w-3 text-gray-300" /><span className={step >= 2 ? 'text-[#D9232D]' : ''}>2. Payment</span><ChevronRight className="h-3 w-3 text-gray-300" /><span>3. Confirmed</span></div>}
    <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
      {step === 1 && <><div className="flex items-center gap-2 text-[13px] font-black"><Store className="h-4 w-4 text-[#D9232D]" />Customer information</div><div className="grid gap-3"><label className="text-[11px] font-bold">Full Name *<input required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your name" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-[#D9232D]" /></label><label className="text-[11px] font-bold">Mobile Number *<input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-[#D9232D]" /></label><label className="text-[11px] font-bold">Vehicle Name / Model *<input required value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Toyota Fortuner / Hero Splendor" className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-[#D9232D]" /></label><label className="text-[11px] font-bold">Optional Note<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Any fitting or pickup note" rows={2} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs outline-none focus:border-[#D9232D]" /></label></div><div className="rounded-2xl border border-red-100 bg-red-50 p-4"><div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 text-[#D9232D]" /><div><p className="text-xs font-black text-gray-900">Pickup from Store only</p><p className="mt-1 text-[11px] font-semibold text-gray-700">{WORKSHOP_INFO.name}</p><p className="mt-1 text-[11px] text-gray-600">{WORKSHOP_INFO.address}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-gray-500"><Clock3 className="h-3 w-3" />{WORKSHOP_INFO.workingHours}</p><a href="https://www.google.com/maps/search/?api=1&query=Rofik+Godi+Centre" target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-black text-[#D9232D]">Open Google Maps →</a></div></div></div></>}
      {step === 2 && <><div className="flex items-center gap-2 text-[13px] font-black"><CreditCard className="h-4 w-4 text-[#D9232D]" />Choose payment method</div><button onClick={() => setPaymentMethod('pay_at_store')} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${paymentMethod === 'pay_at_store' ? 'border-[#D9232D] bg-red-50' : 'border-gray-200'}`}><span className="flex items-center gap-3"><Banknote className="h-5 w-5 text-emerald-600" /><span><b className="block text-xs">Pay at Store</b><small className="text-[10px] text-gray-500">Pay when you collect your order.</small></span></span><span className="text-[10px] font-black text-emerald-700">CASH / UPI</span></button><button onClick={() => setPaymentMethod('pay_online')} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${paymentMethod === 'pay_online' ? 'border-[#D9232D] bg-red-50' : 'border-gray-200'}`}><span className="flex items-center gap-3"><QrCode className="h-5 w-5 text-blue-600" /><span><b className="block text-xs">Pay Online</b><small className="text-[10px] text-gray-500">Pay using UPI.</small></span></span><span className="text-[10px] font-black text-blue-700">UPI</span></button>{paymentMethod === 'pay_online' && <div className="rounded-2xl bg-gray-900 p-4 text-center text-white"><p className="text-[11px] font-bold text-emerald-400">Pay ₹{total} via UPI</p><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=rofikgodi@upi&pn=ROFIK%20GODI%20CENTRE&am=${total}&cu=INR`)}`} alt="UPI QR" className="mx-auto mt-2 h-28 w-28 rounded-xl bg-white p-2" /><p className="mt-2 text-[10px] text-gray-400">UPI ID: <b>rofikgodi@upi</b></p><p className="mt-2 text-[10px] text-amber-300">Payment verification will be completed by the store team.</p></div>}<div className="rounded-xl bg-gray-50 p-4 text-[11px]"><div className="flex justify-between"><span>Items total</span><b>₹{subtotal}</b></div><div className="flex justify-between text-emerald-600"><span>Discount</span><b>-₹{discount}</b></div><div className="mt-2 flex justify-between border-t pt-2 text-sm font-black"><span>Total</span><b className="text-[#D9232D]">₹{total}</b></div></div></>}
      {step === 3 && placedOrder && <div className="space-y-4 py-2 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-9 w-9" /></div><div><h4 className="text-xl font-black">Order received</h4><p className="mt-1 text-xs text-gray-500">A personal order notification is waiting in Notifications. Track this order in My Orders.</p><p className="mt-2 text-[11px] font-semibold text-emerald-600">Saved securely to the pickup order system.</p></div><div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left"><div className="flex items-center justify-between border-b pb-2"><span className="text-xs text-gray-500">Order ID</span><b className="font-mono text-lg">#{placedOrder.orderId}</b></div><div className="mt-2 flex justify-between text-xs"><span>Pickup</span><b>🏪 Store Pickup</b></div><div className="mt-2 flex justify-between text-xs"><span>Payment</span><b>{placedOrder.paymentMethod === 'pay_at_store' ? 'Pay at Store' : 'Pay Online'}</b></div><div className="mt-2 flex justify-between text-xs"><span>Total</span><b className="text-[#D9232D]">₹{placedOrder.total}</b></div></div><img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(placedOrder.pickupToken || placedOrder.orderId)}`} alt="Pickup QR code" className="mx-auto h-36 w-36 rounded-xl border bg-white p-2" /><p className="text-[10px] font-semibold text-gray-500">Show this one-time pickup QR code or your Order ID at {WORKSHOP_INFO.name}</p><div className="grid grid-cols-2 gap-2"><button onClick={handleDownloadInvoice} className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2.5 text-[11px] font-bold"><Download className="h-3.5 w-3.5" />Invoice</button><a href={`https://wa.me/919832145678?text=My%20store%20pickup%20order%20is%20${placedOrder.orderId}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-bold text-white"><Share2 className="h-3.5 w-3.5" />WhatsApp</a></div></div>}
      {submissionError && step < 3 && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{submissionError}</p>}
    </div>
    <div className="flex gap-3 border-t border-gray-100 bg-white p-4">{step === 3 ? <button onClick={onClose} className="w-full rounded-xl bg-gray-900 py-3.5 text-[13px] font-black text-white">Continue Shopping</button> : <>{step === 2 && <button onClick={() => setStep(1)} className="rounded-xl bg-gray-100 px-4 py-3 text-xs font-bold">Back</button>}<button disabled={isProcessing} onClick={() => { if (step === 1) { if (!customerName.trim() || !phone.trim() || !vehicleModel.trim()) return alert('Please fill in your name, mobile number and vehicle model.'); setStep(2); } else handlePlaceOrder(); }} className="flex-1 rounded-xl bg-[#D9232D] py-3.5 text-[13px] font-black text-white disabled:opacity-60">{isProcessing ? 'Saving Pickup Order...' : step === 2 ? `Place Pickup Order · ₹${total}` : 'Continue to Payment'}<ChevronRight className="ml-1 inline h-4 w-4" /></button></>}</div>
  </motion.div></div></AnimatePresence>;
};
