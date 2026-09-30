import React, { useState } from 'react';
import { CartItem, OrderDetails } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  X,
  CheckCircle2,
  MapPin,
  Truck,
  CreditCard,
  QrCode,
  Banknote,
  Wrench,
  Download,
  Share2,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  discount: number;
  couponCode: string;
  onClearCart: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  discount,
  couponCode,
  onClearCart,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [deliveryType, setDeliveryType] = useState<'home_delivery' | 'workshop_pickup'>('home_delivery');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod' | 'card'>('upi');
  const [placedOrder, setPlacedOrder] = useState<OrderDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = deliveryType === 'workshop_pickup' || subtotal >= 999 ? 0 : 70;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#D9232D', '#111827', '#EAB308', '#059669'],
    });
  };

  const handlePlaceOrder = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newOrder: OrderDetails = {
        orderId: `RFK-${Math.floor(100000 + Math.random() * 900000)}`,
        items: [...items],
        subtotal,
        discount,
        deliveryFee,
        total,
        customerName: customerName || 'Valued Rider',
        phone: phone || '+91 9876543210',
        address: deliveryType === 'workshop_pickup' ? 'Rofik Godi Centre Workshop (Self Pickup)' : address,
        city: city || 'Local',
        pincode: pincode || '700001',
        deliveryType,
        paymentMethod,
        status: 'confirmed',
        createdAt: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        vehicleModel: vehicleModel || undefined,
      };

      setPlacedOrder(newOrder);
      setIsProcessing(false);
      setStep(4);
      triggerConfetti();
      onClearCart();
    }, 1000);
  };

  const handleDownloadInvoice = () => {
    if (!placedOrder) return;
    const content = `==============================\nROFIK GODI CENTRE - INVOICE\n==============================\nOrder ID: ${placedOrder.orderId}\nDate: ${placedOrder.createdAt}\nCustomer: ${placedOrder.customerName}\nPhone: ${placedOrder.phone}\nDelivery Mode: ${placedOrder.deliveryType === 'workshop_pickup' ? 'Workshop Free Fitment & Pickup' : 'Home Delivery'}\nAddress: ${placedOrder.address}, ${placedOrder.city} - ${placedOrder.pincode}\nPayment Mode: ${placedOrder.paymentMethod.toUpperCase()}\n\nITEMS:\n${placedOrder.items.map((it, idx) => `${idx + 1}. ${it.product.title} (x${it.quantity}) - ₹${it.unitPrice * it.quantity}`).join('\n')}\n\nSubtotal: ₹${placedOrder.subtotal}\nDiscount: -₹${placedOrder.discount}\nDelivery: ₹${placedOrder.deliveryFee}\nTOTAL AMOUNT: ₹${placedOrder.total}\n==============================\nThank you for choosing ROFIK GODI! Safe Riding!`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${placedOrder.orderId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-[460px] max-h-[92vh] bg-white rounded-[28px] shadow-2xl flex flex-col z-10 overflow-hidden text-gray-800"
        >
          {/* Top Bar */}
          <div className="flex justify-between items-center px-5 py-3.5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#D9232D] text-white flex items-center justify-center font-black text-xs">
                R
              </div>
              <h3 className="text-[14px] font-black text-gray-900 leading-none">
                {step === 4 ? 'Order Confirmed!' : 'Checkout & Fitment'}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stepper Indicator */}
          {step < 4 && (
            <div className="flex items-center justify-between px-6 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500">
              <span className={step >= 1 ? 'text-[#D9232D]' : ''}>1. Address</span>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className={step >= 2 ? 'text-[#D9232D]' : ''}>2. Delivery</span>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className={step >= 3 ? 'text-[#D9232D]' : ''}>3. Payment</span>
            </div>
          )}

          {/* Body Content by Step */}
          <div className="overflow-y-auto px-5 py-4 flex-1 no-scrollbar space-y-4">
            {/* STEP 1: Customer Details */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[12.5px] font-black text-gray-900">
                  <MapPin className="w-4 h-4 text-[#D9232D]" />
                  <span>Contact & Fitment Information</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Full Name <span className="text-[#D9232D]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Subhash Mondal"
                    className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Phone Number <span className="text-[#D9232D]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9832145678"
                      className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Vehicle / Model
                    </label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="e.g. Splendor / Yatri Toto"
                      className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Delivery Address <span className="text-[#D9232D]">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Shop no., Road, Landmark"
                    className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">City / Town</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Kolkata / Murshidabad"
                      className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 700001"
                      className="w-full bg-gray-50 text-[12.5px] rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Delivery & Fitment Mode */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[12.5px] font-black text-gray-900">
                  <Truck className="w-4 h-4 text-[#D9232D]" />
                  <span>Choose Delivery & Fitment Preference</span>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('home_delivery')}
                    className={`w-full p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      deliveryType === 'home_delivery'
                        ? 'border-[#D9232D] bg-[#FEECEC]/50 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-[#D9232D] mt-0.5">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-gray-900">Express Doorstep Courier</div>
                        <div className="text-[11px] text-gray-500">Delivered in 24–48 hours with easy fit guide</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-[#D9232D]">
                      {subtotal >= 999 ? 'FREE' : '₹70'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('workshop_pickup')}
                    className={`w-full p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      deliveryType === 'workshop_pickup'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mt-0.5">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-gray-900">
                          Workshop Pickup & FREE Expert Installation
                        </div>
                        <div className="text-[11px] text-emerald-700 font-semibold">
                          Fitted free by Rofik Godi master team on your bike/toto!
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-emerald-700">FREE</span>
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
                  ⚡ <strong>Same-Day Fitment Guarantee:</strong> Orders confirmed before 2:00 PM are ready for immediate workshop fitment today!
                </div>
              </div>
            )}

            {/* STEP 3: Payment Method */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[12.5px] font-black text-gray-900">
                  <CreditCard className="w-4 h-4 text-[#D9232D]" />
                  <span>Select Payment Method</span>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-[#D9232D] bg-[#FEECEC]/50 shadow-xs'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-gray-900">Instant UPI / QR Scanner</div>
                        <div className="text-[10.5px] text-gray-500">GPay, PhonePe, Paytm & any UPI app</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Fastest</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-[#D9232D] bg-[#FEECEC]/50 shadow-xs'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-gray-900">Cash on Delivery (COD)</div>
                        <div className="text-[10.5px] text-gray-500">Pay cash upon delivery or workshop visit</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      paymentMethod === 'card'
                        ? 'border-[#D9232D] bg-[#FEECEC]/50 shadow-xs'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-black text-xs">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-gray-900">Debit / Credit Card & Net Banking</div>
                        <div className="text-[10.5px] text-gray-500">All major Indian banks supported</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* UPI Live QR Mock */}
                {paymentMethod === 'upi' && (
                  <div className="bg-gray-900 text-white rounded-2xl p-4 text-center space-y-2">
                    <div className="text-[11px] font-bold text-emerald-400">Scan & Pay ₹{total} via any UPI app</div>
                    <div className="w-28 h-28 bg-white mx-auto rounded-xl p-2 flex items-center justify-center shadow-inner">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=rofikgodi@upi&pn=ROFIK%20GODI%20CENTRE&am=899&cu=INR"
                        alt="UPI QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-[10px] text-gray-400">UPI ID: <strong>rofikgodi@upi</strong></div>
                  </div>
                )}

                <p className="text-[10.5px] text-gray-400 text-center pt-2">
                  By placing this order, you agree to Rofik Godi Centre's{' '}
                  <span className="text-gray-700 font-semibold">Terms &amp; Conditions</span> and{' '}
                  <span className="text-gray-700 font-semibold">Privacy Policy</span>.
                </p>
              </div>
            )}

            {/* STEP 4: Order Success */}
            {step === 4 && placedOrder && (
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                  <h4 className="text-xl font-black text-gray-900">Ride in Comfort!</h4>
                  <p className="text-[12px] text-gray-500 mt-1">
                    Your seat order is confirmed and sent to Rofik Godi workshop.
                  </p>
                </div>

                {/* Order ID badge */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-left space-y-2 text-[12px]">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-gray-500">Order Number:</span>
                    <strong className="text-gray-900 font-mono text-[13px]">{placedOrder.orderId}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Amount Paid:</span>
                    <strong className="text-[#D9232D] text-[13px]">₹{placedOrder.total}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Delivery Method:</span>
                    <span className="font-semibold text-gray-800">
                      {placedOrder.deliveryType === 'workshop_pickup' ? 'Workshop Free Fitment' : 'Home Express'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={handleDownloadInvoice}
                    className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Invoice</span>
                  </button>

                  <a
                    href={`https://wa.me/919832145678?text=Hello%20Rofik%20Godi,%20I%20placed%20order%20${placedOrder.orderId}%20for%20seat%20covers.`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp Update</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center gap-3">
            {step < 4 ? (
              <>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as any)}
                    className="py-3 px-4 rounded-xl text-[12px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                  >
                    Back
                  </button>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    if (step === 1) {
                      if (!customerName.trim() || !phone.trim() || !address.trim()) {
                        alert('Please fill in Name, Phone number, and Delivery address.');
                        return;
                      }
                      setStep(2);
                    } else if (step === 2) {
                      setStep(3);
                    } else if (step === 3) {
                      handlePlaceOrder();
                    }
                  }}
                  className="flex-1 py-3.5 bg-[#D9232D] hover:bg-[#c01d26] text-white rounded-xl text-[13px] font-black shadow-md flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <span>Confirming Order...</span>
                  ) : step === 3 ? (
                    <span>Place Order · ₹{total}</span>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl text-[13px] font-black"
              >
                Continue Shopping
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
