import React, { useMemo, useState } from 'react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Trash2, ShoppingBag, Star, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { WishlistPageSkeleton } from './AccountPageSkeleton';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  isLoading?: boolean;
  onRemoveWishlist: (p: Product) => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  isInCart: (p: Product) => boolean;
  onOpenCart: () => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  wishlist,
  isLoading = false,
  onRemoveWishlist,
  onSelectProduct,
  onAddToCart,
  isInCart,
  onOpenCart,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    wishlist.forEach((item) => {
      if (item.category && item.categoryLabel) {
        map.set(item.category, item.categoryLabel);
      }
    });
    return Array.from(map.entries());
  }, [wishlist]);

  const filteredWishlist = useMemo(() => {
    if (activeFilter === 'all') return wishlist;
    if (activeFilter === 'in-stock') return wishlist.filter((item) => item.inStock !== false);
    return wishlist.filter((item) => item.category === activeFilter);
  }, [wishlist, activeFilter]);

  const movableItems = useMemo(
    () => wishlist.filter((item) => item.inStock !== false && !isInCart(item)),
    [wishlist, isInCart],
  );

  const totalSavedValue = useMemo(
    () => wishlist.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    [wishlist],
  );

  if (!isOpen) return null;

  const handleMoveAllToCart = () => {
    movableItems.forEach((product) => {
      onAddToCart(product);
      onRemoveWishlist(product);
    });
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
          className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs"
        />

        {/* Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-full sm:max-w-[440px] bg-gradient-to-br from-[#F8FAFC] via-[#F4F6FB] to-[#FFF5F6] h-full shadow-2xl flex flex-col z-10 overflow-hidden overflow-x-hidden text-slate-800"
        >
          {/* Glassmorphic Sticky Header */}
          <div className="sticky top-0 z-20 px-4 py-3.5 border-b border-slate-200/80 bg-white/92 backdrop-blur-md shadow-[0_4px_20px_-10px_rgba(15,23,42,0.06)]">
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFE4E6] to-[#FECDD3] flex items-center justify-center text-[#D9232D] shadow-2xs ring-1 ring-inset ring-rose-200/70 shrink-0">
                  <Heart className="w-4.5 h-4.5 fill-[#D9232D]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.14em] text-[#D9232D] ring-1 ring-inset ring-rose-100">
                      <Sparkles className="h-2.5 w-2.5" /> Saved Garage
                    </span>
                  </div>
                  <h3 className="mt-0.5 text-[16px] font-black text-slate-900 leading-tight truncate">
                    Your Wishlist
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold tabular-nums">
                    {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
                    {wishlist.length > 0 && ` · ₹${totalSavedValue.toLocaleString('en-IN')}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {movableItems.length > 1 && (
                  <button
                    type="button"
                    onClick={handleMoveAllToCart}
                    className="min-h-11 rounded-xl bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 text-[10.5px] font-extrabold text-[#D9232D] border border-rose-200/80 transition-colors"
                  >
                    Move All ({movableItems.length})
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close wishlist"
                  className="min-h-11 min-w-11 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-[#D9232D] text-slate-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Pills when items exist */}
            {!isLoading && wishlist.length > 0 && (
              <div className="mt-3 flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`min-h-11 shrink-0 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-all ${
                    activeFilter === 'all'
                      ? 'bg-[#D9232D] text-white shadow-2xs'
                      : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  All ({wishlist.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('in-stock')}
                  className={`min-h-11 shrink-0 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-all ${
                    activeFilter === 'in-stock'
                      ? 'bg-[#D9232D] text-white shadow-2xs'
                      : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  In Stock ({wishlist.filter((i) => i.inStock !== false).length})
                </button>
                {categories.map(([catKey, catLabel]) => (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setActiveFilter(catKey)}
                    className={`min-h-11 shrink-0 rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-all ${
                      activeFilter === catKey
                        ? 'bg-[#D9232D] text-white shadow-2xs'
                        : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {catLabel}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
            {isLoading ? (
              <WishlistPageSkeleton />
            ) : wishlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-50 via-white to-rose-100/80 border border-rose-200/70 shadow-[0_12px_28px_-12px_rgba(217,35,45,0.18)] flex items-center justify-center text-[#D9232D]">
                    <Heart className="w-9 h-9" />
                  </div>
                </div>
                <h4 className="text-[16px] font-black text-slate-900 mb-1">No items saved yet</h4>
                <p className="text-[12px] text-slate-500 max-w-[230px] leading-relaxed mb-5">
                  Tap the heart icon on any seat cover to save it for later and compare fitment options!
                </p>
                <button
                  onClick={onClose}
                  className="bg-gradient-to-r from-[#D9232D] to-[#B91822] text-white text-[12px] font-black px-6 py-3 rounded-2xl shadow-md shadow-red-600/20 hover:brightness-105 active:scale-95 transition-all inline-flex items-center gap-1.5"
                >
                  <span>Start Browsing</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : filteredWishlist.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-8 text-center space-y-2">
                <p className="text-xs font-extrabold text-slate-700">No saved items match this filter</p>
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="text-[11px] font-bold text-[#D9232D] underline"
                >
                  Show all saved items
                </button>
              </div>
            ) : (
              filteredWishlist.map((p) => {
                const inStock = p.inStock !== false;
                const savings =
                  p.originalPrice && p.originalPrice > p.price
                    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                    : 0;
                const alreadyInCart = isInCart(p);

                return (
                  <div
                    key={p.id}
                    className="group bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/80 hover:border-rose-200/90 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)] flex gap-3.5 relative transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div
                      onClick={() => {
                        onSelectProduct(p);
                        onClose();
                      }}
                      className="relative w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200/70 overflow-hidden flex-shrink-0 cursor-pointer"
                    >
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {savings > 0 && (
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-[#D9232D] px-1.5 py-0.5 text-[9px] font-black text-white shadow-2xs">
                          -{savings}%
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-1.5">
                          <h4
                            onClick={() => {
                              onSelectProduct(p);
                              onClose();
                            }}
                            className="text-[13px] font-black text-slate-900 leading-snug line-clamp-1 cursor-pointer hover:text-[#D9232D] transition-colors"
                          >
                            {p.title}
                          </h4>
                          <button
                            onClick={() => onRemoveWishlist(p)}
                            aria-label={`Remove ${p.title} from wishlist`}
                            className="grid min-h-11 min-w-11 shrink-0 place-items-center text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {p.categoryLabel}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold ${
                              inStock
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70'
                                : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                          {p.rating > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-600">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {p.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-between items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
                        <div className="flex items-baseline gap-1.5 tabular-nums">
                          <span className="text-[15px] font-black text-[#D9232D]">₹{p.price}</span>
                          {p.originalPrice > p.price && (
                            <span className="text-[10.5px] font-semibold text-slate-400 line-through">
                              ₹{p.originalPrice}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (alreadyInCart) onOpenCart();
                            else {
                              onAddToCart(p);
                              onRemoveWishlist(p);
                            }
                          }}
                          aria-label={alreadyInCart ? 'Go to Cart' : `Move ${p.title} to cart`}
                          className={`${
                            alreadyInCart
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'banner-cta-shine group/cta bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] hover:brightness-105 hover:shadow-md'
                          } min-h-11 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all`}
                        >
                          {alreadyInCart ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <ShoppingBag className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                          )}
                          <span>{alreadyInCart ? 'Go to Cart' : 'Move to Cart'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Bottom Bar when wishlist has items */}
          {!isLoading && wishlist.length > 0 && (
            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Saved Collection
                </p>
                <p className="text-sm font-black text-slate-900 tabular-nums truncate">
                  ₹{totalSavedValue.toLocaleString('en-IN')}{' '}
                  <span className="text-[11px] font-semibold text-slate-500">
                    ({wishlist.length} {wishlist.length === 1 ? 'item' : 'items'})
                  </span>
                </p>
              </div>
              {movableItems.length > 0 ? (
                <button
                  type="button"
                  onClick={handleMoveAllToCart}
                  className="banner-cta-shine group/cta min-h-11 shrink-0 rounded-2xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-4 py-2.5 text-xs font-black text-white shadow-[0_8px_18px_-4px_rgba(217,35,45,0.38)] hover:brightness-105 hover:shadow-[0_10px_22px_-4px_rgba(217,35,45,0.48)] active:scale-95 transition-all inline-flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                  <span>Move All to Cart</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="banner-cta-shine group/cta min-h-11 shrink-0 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                  <span>Open Cart</span>
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

