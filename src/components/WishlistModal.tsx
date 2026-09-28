import React from 'react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Trash2, ShoppingBag } from 'lucide-react';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  onRemoveWishlist: (p: Product) => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  wishlist,
  onRemoveWishlist,
  onSelectProduct,
  onAddToCart,
}) => {
  if (!isOpen) return null;

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

        {/* Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden text-gray-800"
        >
          {/* Header */}
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#FEECEC] flex items-center justify-center text-[#D9232D]">
                <Heart className="w-4 h-4 fill-[#D9232D]" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-gray-900 leading-tight">Your Wishlist</h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
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

          {/* List */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
            {wishlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                  <Heart className="w-8 h-8" />
                </div>
                <h4 className="text-[15px] font-black text-gray-800 mb-1">No items saved yet</h4>
                <p className="text-[12px] text-gray-500 max-w-[200px] mb-4">
                  Tap the heart icon on any seat cover to save it for later!
                </p>
                <button
                  onClick={onClose}
                  className="bg-[#D9232D] text-white text-[12px] font-bold px-5 py-2.5 rounded-full shadow-md hover:bg-[#c01d26] transition-all"
                >
                  Start Browsing
                </button>
              </div>
            ) : (
              wishlist.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-3 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex gap-3 relative"
                >
                  <div
                    onClick={() => {
                      onSelectProduct(p);
                      onClose();
                    }}
                    className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 cursor-pointer"
                  >
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h4
                          onClick={() => {
                            onSelectProduct(p);
                            onClose();
                          }}
                          className="text-[12px] font-black text-gray-900 leading-tight line-clamp-1 cursor-pointer hover:text-[#D9232D]"
                        >
                          {p.title}
                        </h4>
                        <button
                          onClick={() => onRemoveWishlist(p)}
                          className="text-gray-400 hover:text-red-500 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-500">{p.categoryLabel}</span>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <div className="text-[13px] font-black text-[#D9232D]">₹{p.price}</div>
                      <button
                        onClick={() => {
                          onAddToCart(p);
                          onRemoveWishlist(p);
                        }}
                        className="bg-[#D9232D] hover:bg-[#c01d26] text-white text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Move to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
