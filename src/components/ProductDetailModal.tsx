import React, { useState } from 'react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Star,
  ShieldCheck,
  Droplets,
  Truck,
  Heart,
  ShoppingBag,
  CheckCircle2,
  Sparkles,
  Scissors,
  Check,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    selectedColor: { name: string; hex: string },
    selectedStitch: string,
    selectedThickness: { label: string; extraPrice: number },
    customEmbroideryText?: string,
    quantity?: number
  ) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
}) => {
  if (!product) return null;

  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedStitch, setSelectedStitch] = useState(product.stitchPatterns[0] || 'Standard');
  const [selectedThickness, setSelectedThickness] = useState(
    product.thicknessOptions[0] || { label: 'Standard', extraPrice: 0 }
  );
  const [embroideryText, setEmbroideryText] = useState('');
  const [activeImage, setActiveImage] = useState(product.image);
  const [quantity, setQuantity] = useState(1);
  const [isSuccessAdded, setIsSuccessAdded] = useState(false);

  const imagesList = [product.image, ...(product.additionalImages || [])];
  const totalPrice = (product.price + selectedThickness.extraPrice + (embroideryText.trim() ? 150 : 0)) * quantity;

  const handleAdd = () => {
    onAddToCart(
      product,
      selectedColor,
      selectedStitch,
      selectedThickness,
      embroideryText.trim() || undefined,
      quantity
    );
    setIsSuccessAdded(true);
    setTimeout(() => {
      setIsSuccessAdded(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="relative w-full max-w-[480px] max-h-[92vh] sm:max-h-[85vh] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col z-10 overflow-hidden"
        >
          {/* Header Bar */}
          <div className="sticky top-0 z-20 flex justify-between items-center px-5 py-3.5 bg-white/95 backdrop-blur-md border-b border-gray-100">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-[#D9232D] uppercase">
                {product.categoryLabel}
              </span>
              <h3 className="text-[15px] font-black text-gray-900 leading-tight">
                {product.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleWishlist(product)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isWishlisted ? 'text-[#D9232D] fill-[#D9232D]' : 'text-gray-600'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="overflow-y-auto px-5 py-4 space-y-5 no-scrollbar pb-28">
            {/* Image Showcase & Gallery */}
            <div className="space-y-2.5">
              <div className="relative w-full h-[210px] bg-gradient-to-b from-gray-100 to-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center">
                <img
                  src={activeImage}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />

                {/* Live Color / Embroidery Tag preview */}
                {embroideryText.trim() && (
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs text-amber-300 border border-amber-400/40 text-[10.5px] font-black px-2.5 py-1 rounded-md shadow-md tracking-wider uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>EMBROIDERY: "{embroideryText}"</span>
                  </div>
                )}

                {/* Rating badge */}
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{product.rating}</span>
                  <span className="text-gray-400 text-[9px]">({product.reviewCount})</span>
                </div>
              </div>

              {/* Thumbnails */}
              {imagesList.length > 1 && (
                <div className="flex gap-2">
                  {imagesList.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(img)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        activeImage === img ? 'border-[#D9232D] scale-105' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price & Features highlights */}
            <div className="flex justify-between items-baseline border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-[#D9232D]">
                    ₹{product.price + selectedThickness.extraPrice + (embroideryText.trim() ? 150 : 0)}
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    ₹{product.originalPrice + selectedThickness.extraPrice}
                  </span>
                  <span className="text-[11px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                    Save ₹{product.originalPrice - product.price}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">Includes all taxes & warranty</p>
              </div>

              {/* Stock Status */}
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                In Stock & Ready
              </span>
            </div>

            {/* Color Accent Picker */}
            <div>
              <label className="text-[12px] font-extrabold text-gray-900 block mb-2">
                1. Select Color Trim & Rexine Finish: <span className="text-[#D9232D]">{selectedColor.name}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => {
                  const isSel = selectedColor.name === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11.5px] font-semibold transition-all ${
                        isSel
                          ? 'border-[#D9232D] bg-[#FEECEC]/50 text-gray-900 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-gray-400"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                      {isSel && <Check className="w-3 h-3 text-[#D9232D]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stitch Pattern Customizer */}
            {product.stitchPatterns.length > 0 && (
              <div>
                <label className="text-[12px] font-extrabold text-gray-900 block mb-2">
                  2. Choose Stitching Pattern:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {product.stitchPatterns.map((pat) => {
                    const isSel = selectedStitch === pat;
                    return (
                      <button
                        key={pat}
                        type="button"
                        onClick={() => setSelectedStitch(pat)}
                        className={`p-2 rounded-xl border text-left text-[11.5px] font-bold flex items-center justify-between transition-all ${
                          isSel
                            ? 'border-[#D9232D] bg-[#FEECEC]/40 text-[#D9232D]'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <span>{pat}</span>
                        {isSel && <Check className="w-3.5 h-3.5 text-[#D9232D]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Foam Cushion Thickness Options */}
            <div>
              <label className="text-[12px] font-extrabold text-gray-900 block mb-2">
                3. Foam & Cushioning Density:
              </label>
              <div className="space-y-1.5">
                {product.thicknessOptions.map((th) => {
                  const isSel = selectedThickness.label === th.label;
                  return (
                    <button
                      key={th.label}
                      type="button"
                      onClick={() => setSelectedThickness(th)}
                      className={`w-full p-2.5 rounded-xl border text-left text-[12px] font-medium flex items-center justify-between transition-all ${
                        isSel
                          ? 'border-[#D9232D] bg-[#FEECEC]/40 text-gray-900 font-bold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <span>{th.label}</span>
                      <span className="text-[11px] font-bold text-[#D9232D]">
                        {th.extraPrice === 0 ? 'Standard Included' : `+₹${th.extraPrice}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Name / Number Embroidery Option */}
            {product.isCustomizable && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-800" />
                  <span className="text-[12px] font-black text-amber-900">
                    Custom Name & Number Embroidery (+₹150)
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mb-2">
                  Get your name, rider handle, or lucky number stitched on the rear edge!
                </p>
                <input
                  type="text"
                  maxLength={14}
                  value={embroideryText}
                  onChange={(e) => setEmbroideryText(e.target.value.toUpperCase())}
                  placeholder="e.g. RIDER-07 / SUBHASH"
                  className="w-full bg-white text-gray-900 text-[12px] font-bold tracking-wider uppercase rounded-xl px-3 py-2 border border-amber-300 focus:outline-none focus:border-[#D9232D] placeholder-gray-400"
                />
              </div>
            )}

            {/* Verified Fitment Compatibility */}
            <div>
              <h4 className="text-[12px] font-extrabold text-gray-900 mb-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Guaranteed Fit For:</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {product.compatibility.map((model) => (
                  <span
                    key={model}
                    className="bg-gray-100 text-gray-700 text-[10.5px] font-semibold px-2 py-0.5 rounded-md border border-gray-200"
                  >
                    {model}
                  </span>
                ))}
              </div>
            </div>

            {/* Detailed Features list */}
            <div>
              <h4 className="text-[12px] font-extrabold text-gray-900 mb-2">Product Specifications:</h4>
              <ul className="space-y-1.5 text-[11.5px] text-gray-600">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D9232D] font-bold">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-2.5 text-center text-[10.5px] text-gray-600">
              <div className="flex flex-col items-center">
                <Droplets className="w-4 h-4 text-blue-600 mb-1" />
                <span className="font-bold text-gray-800">100% Water Guard</span>
                <span className="text-[9px] text-gray-400">All-weather tested</span>
              </div>
              <div className="flex flex-col items-center border-x border-gray-200">
                <ShieldCheck className="w-4 h-4 text-[#D9232D] mb-1" />
                <span className="font-bold text-gray-800">1-Year Warranty</span>
                <span className="text-[9px] text-gray-400">Tear & stitch guard</span>
              </div>
              <div className="flex flex-col items-center">
                <Truck className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="font-bold text-gray-800">24-Hr Dispatch</span>
                <span className="text-[9px] text-gray-400">Express delivery</span>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-0 z-30 p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
            {/* Quantity Selector */}
            <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 rounded-lg bg-white shadow-xs text-gray-700 font-bold flex items-center justify-center hover:bg-gray-100 active:scale-95"
              >
                -
              </button>
              <span className="w-8 text-center text-[13px] font-bold text-gray-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded-lg bg-white shadow-xs text-gray-700 font-bold flex items-center justify-center hover:bg-gray-100 active:scale-95"
              >
                +
              </button>
            </div>

            {/* Total Price & Add Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleAdd}
              disabled={isSuccessAdded}
              className={`flex-1 py-3 px-4 rounded-xl text-[13px] font-extrabold flex items-center justify-center gap-2 shadow-md transition-all ${
                isSuccessAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#D9232D] hover:bg-[#c01d26] text-white active:scale-95'
              }`}
            >
              {isSuccessAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Cart · ₹{totalPrice}</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
