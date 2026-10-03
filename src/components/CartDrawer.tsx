import React, { useEffect, useState } from 'react';
import { CartItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { validateCustomerCoupon } from '../lib/supabaseCoupons';
import {
  X,
  ShoppingBag,
  Trash2,
  Tag,
  ArrowRight,
  Store,
  Sparkles,
  Check,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  userId: string;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedToCheckout: (appliedDiscount: number, couponCode: string, quote?: { subtotal: number; total: number }) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  userId,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; subtotal: number; total: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponError('');
  }, [items]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const displayedSubtotal = appliedCoupon?.subtotal ?? subtotal;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const grandTotal = appliedCoupon?.total ?? Math.max(0, subtotal - discount);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) {
      setCouponError('Enter a coupon code first.');
      return;
    }
    setCouponError('');
    setIsApplyingCoupon(true);
    try {
      const quote = await validateCustomerCoupon(code, items, userId);
      if (!quote.valid) {
        setAppliedCoupon(null);
        setCouponError(quote.message || 'Coupon is invalid or expired.');
        return;
      }
      const quotedDiscount = Number(quote.discount_amount ?? quote.discount ?? 0);
      const quotedSubtotal = Number(quote.subtotal ?? subtotal);
      setAppliedCoupon({ code: quote.code || code, discount: quotedDiscount, subtotal: quotedSubtotal, total: Number(quote.final_total ?? Math.max(0, quotedSubtotal - quotedDiscount)) });
      setCouponCode('');
    } catch {
      setCouponError('Coupon validation is temporarily unavailable. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#FEECEC] flex items-center justify-center text-[#D9232D]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-gray-900 leading-tight">Your Cart</h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  {items.length} {items.length === 1 ? 'item' : 'items'} selected
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Store Pickup Banner */}
          <div className="border-b border-gray-100 bg-red-50 px-5 py-3">
            <div className="flex items-center gap-2 text-[11.5px] font-bold text-gray-800"><Store className="h-4 w-4 text-[#D9232D]" />🏪 Pickup from Rofik Godi Centre</div>
            <p className="mt-1 pl-6 text-[10px] text-gray-500">We&apos;ll prepare your order for collection at the store.</p>
          </div>

          {/* Items List / Empty State */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-[15px] font-black text-gray-800 mb-1">Your cart is empty</h4>
                <p className="text-[12px] text-gray-500 max-w-[220px] mb-4">
                  Explore our premium bike & toto seat covers crafted for maximum riding comfort.
                </p>
                <button
                  onClick={onClose}
                  className="bg-[#D9232D] text-white text-[12px] font-bold px-5 py-2.5 rounded-full shadow-md hover:bg-[#c01d26] transition-all"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="bg-white rounded-2xl p-3 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex gap-3 relative"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                    <img
                      src={item.product.image}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="text-[12px] font-black text-gray-900 leading-tight truncate">
                          {item.product.title}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.cartItemId)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Custom Tags (Color, stitch, embroidery) */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                          <span
                            className="w-2 h-2 rounded-full border border-gray-300"
                            style={{ backgroundColor: item.selectedColor.hex }}
                          />
                          {item.selectedColor.name}
                        </span>

                        {item.selectedStitch && (
                          <span className="text-[9.5px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {item.selectedStitch}
                          </span>
                        )}

                        {item.selectedThickness && item.selectedThickness.extraPrice > 0 && (
                          <span className="text-[9.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            {item.selectedThickness.label}
                          </span>
                        )}

                        {item.customEmbroideryText && (
                          <span className="text-[9.5px] font-black bg-black text-amber-300 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                            <Sparkles className="w-2 h-2" />
                            "{item.customEmbroideryText}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Quantity Stepper */}
                    <div className="flex justify-between items-center mt-2 pt-1 border-t border-gray-50">
                      <div className="text-[13px] font-black text-[#D9232D]">
                        ₹{item.unitPrice * item.quantity}
                      </div>

                      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-0.5">
                        <button
                          onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                          className="w-5 h-5 rounded bg-white shadow-2xs text-gray-700 text-xs font-bold flex items-center justify-center hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-[11px] font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                          className="w-5 h-5 rounded bg-white shadow-2xs text-gray-700 text-xs font-bold flex items-center justify-center hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Coupons Section */}
            {items.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11.5px] font-black text-gray-900 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#D9232D]" />
                    <span>🎟️ Have a coupon?</span>
                  </span>
                  {appliedCoupon && (
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-[10px] font-bold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-center justify-between text-emerald-800 text-[11.5px] font-bold">
                    <span className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Code '{appliedCoupon.code}' Applied!
                    </span>
                    <span>-₹{appliedCoupon.discount}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 bg-white text-[12px] font-bold uppercase rounded-xl px-3 py-2 border border-gray-200 focus:outline-none focus:border-[#D9232D]"
                    />
                    <button
                      disabled={isApplyingCoupon}
                      onClick={() => void handleApplyCoupon()}
                      className="bg-gray-900 text-white text-[11.5px] font-bold px-3.5 py-2 rounded-xl hover:bg-black transition-colors disabled:opacity-60"
                    >
                      {isApplyingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                )}

                {couponError && (
                  <p className="text-[10px] font-semibold text-red-600 mt-1.5">{couponError}</p>
                )}

              </div>
            )}
          </div>

          {/* Bottom Billing Breakdown & Checkout CTA */}
          {items.length > 0 && (
            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] space-y-3">
              <div className="space-y-1 text-[11.5px]">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{displayedSubtotal}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-600">
                  <span>Store Pickup</span>
                  <strong>FREE</strong>
                </div>
                <div className="flex justify-between text-[14px] font-black text-gray-900 pt-1 border-t border-gray-100">
                  <span>Grand Total</span>
                  <span className="text-[#D9232D]">₹{grandTotal}</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onProceedToCheckout(discount, appliedCoupon?.code || '', appliedCoupon ? { subtotal: appliedCoupon.subtotal, total: appliedCoupon.total } : undefined)}
                className="w-full py-3.5 bg-[#D9232D] hover:bg-[#c01d26] text-white rounded-xl text-[13px] font-black shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>100% Genuine Materials & Secure Local Order</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
