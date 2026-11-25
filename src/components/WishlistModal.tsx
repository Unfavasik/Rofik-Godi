import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Product } from '../types';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  X,
  Heart,
  Trash2,
  ShoppingBag,
  ShoppingCart,
  Star,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { WishlistPageSkeleton } from './AccountPageSkeleton';
import { PRODUCT_IMAGE_ZOOM_TRANSITION, PRODUCT_IMAGE_ZOOM_VARIANTS } from './ProductCard';
import { getProductBadgeInfo, ProductCornerRibbon } from './ProductCornerRibbon';
import { CartBadge } from './CartBadge';
import { VignetteBarBackdrop, VignettePageCurtain } from './VignetteBarBackdrop';
import { getProductAvailability, isProductSellable } from '../lib/productAvailability';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  isLoading?: boolean;
  onRemoveWishlist: (p: Product) => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onMoveToCart?: (p: Product | Product[]) => void;
  isInCart: (p: Product) => boolean;
  cartCount?: number;
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
  onMoveToCart,
  isInCart,
  cartCount = 0,
  onOpenCart,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const transferTimerRef = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (transferTimerRef.current !== null) {
        window.clearTimeout(transferTimerRef.current);
      }
    };
  }, []);

  const showTransferNotice = (message: string) => {
    setTransferNotice(message);
    if (transferTimerRef.current !== null) {
      window.clearTimeout(transferTimerRef.current);
    }
    transferTimerRef.current = window.setTimeout(() => {
      setTransferNotice(null);
      transferTimerRef.current = null;
    }, 4200);
  };

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
    if (activeFilter === 'in-stock') return wishlist.filter((item) => isProductSellable(item));
    return wishlist.filter((item) => item.category === activeFilter);
  }, [wishlist, activeFilter]);

  const movableItems = useMemo(
    () => wishlist.filter((item) => isProductSellable(item)),
    [wishlist],
  );

  const totalSavedValue = useMemo(
    () => wishlist.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    [wishlist],
  );

  if (!isOpen) return null;

  const handleMoveItemToCart = (product: Product) => {
    if (!isProductSellable(product)) return;
    if (onMoveToCart) {
      onMoveToCart(product);
    } else {
      if (!isInCart(product)) {
        onAddToCart(product);
      }
      onRemoveWishlist(product);
    }
    showTransferNotice(`Moved "${product.title}" to cart`);
  };

  const handleMoveAllToCart = () => {
    if (!movableItems.length) return;
    const count = movableItems.length;
    if (onMoveToCart) {
      onMoveToCart(movableItems);
    } else {
      movableItems.forEach((product) => {
        if (!isInCart(product)) {
          onAddToCart(product);
        }
        onRemoveWishlist(product);
      });
    }
    showTransferNotice(
      count === 1
        ? `Moved "${movableItems[0].title}" to cart`
        : `Moved ${count} items to cart`,
    );
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
          {/* Edge-to-Edge Vignette Sticky Header */}
          <div className="sticky top-0 z-20 relative isolate overflow-hidden bg-[#090808] px-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
            <VignetteBarBackdrop variant="top" />
            <div className="relative z-10 flex justify-between items-center gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/14 border border-white/18 backdrop-blur-md flex items-center justify-center text-[#FF4D58] shrink-0">
                  <Heart className="w-4 h-4 fill-[#FF4D58]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-extrabold text-white leading-tight truncate">
                    Your Wishlist
                  </h3>
                  <p className="text-[10.5px] text-white/70 font-semibold tabular-nums">
                    {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
                    {wishlist.length > 0 && ` · ₹${totalSavedValue.toLocaleString('en-IN')}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onOpenCart}
                  aria-label={`Open cart, ${cartCount} items`}
                  className="relative h-9 w-9 rounded-full border border-white/18 bg-white/14 hover:bg-white/22 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
                  title="Open Cart"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <CartBadge
                    count={cartCount}
                    className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#D9232D] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#181412] shadow-xs tabular-nums"
                  />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close wishlist"
                  className="h-9 w-9 rounded-full border border-white/18 bg-white/14 hover:bg-white/22 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isLoading && wishlist.length > 0 && (
              <div className="relative z-10 mt-2.5 flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`min-h-8 shrink-0 rounded-full px-3 py-1 text-[10.5px] font-bold transition-all ${
                    activeFilter === 'all'
                      ? 'bg-white text-slate-950 shadow-2xs'
                      : 'bg-white/14 border border-white/18 text-white/85 hover:bg-white/22'
                  }`}
                >
                  All ({wishlist.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('in-stock')}
                  className={`min-h-8 shrink-0 rounded-full px-3 py-1 text-[10.5px] font-bold transition-all ${
                    activeFilter === 'in-stock'
                      ? 'bg-white text-slate-950 shadow-2xs'
                      : 'bg-white/14 border border-white/18 text-white/85 hover:bg-white/22'
                  }`}
                >
                  In Stock ({movableItems.length})
                </button>
                {categories.map(([catKey, catLabel]) => (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setActiveFilter(catKey)}
                    className={`min-h-8 shrink-0 rounded-full px-3 py-1 text-[10.5px] font-bold transition-all ${
                      activeFilter === catKey
                        ? 'bg-white text-slate-950 shadow-2xs'
                        : 'bg-white/14 border border-white/18 text-white/85 hover:bg-white/22'
                    }`}
                  >
                    {catLabel}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Instant Transfer Confirmation Banner */}
          <AnimatePresence initial={false}>
            {transferNotice && (
              <motion.div
                role="status"
                aria-live="polite"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="mx-3.5 mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/95 px-3 py-2 text-xs text-emerald-900 shadow-xs"
              >
                <span className="flex min-w-0 items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="truncate">{transferNotice}</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-extrabold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap cursor-pointer"
                >
                  View Cart
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List */}
          <div className="relative -mt-px min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto no-scrollbar bg-[#F8FAFC]">
            <VignettePageCurtain className="h-[230px] sm:h-[250px]" />
            <div className="relative z-10 px-3.5 py-3 space-y-2.5">
            {isLoading ? (
              <WishlistPageSkeleton />
            ) : wishlist.length === 0 ? (
              <div className="min-h-[340px] flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_12px_28px_-16px_rgba(9,8,8,0.22)]">
                <div className="relative mb-3">
                  <div className="w-15 h-15 rounded-2xl bg-gradient-to-br from-rose-50 via-white to-rose-100/80 border border-rose-200/70 shadow-[0_12px_28px_-12px_rgba(217,35,45,0.18)] flex items-center justify-center text-[#D9232D]">
                    <Heart className="w-7 h-7" />
                  </div>
                </div>
                <h4 className="text-[15px] font-black text-slate-900 mb-1">No items saved yet</h4>
                <p className="text-[11.5px] text-slate-500 max-w-[230px] leading-relaxed mb-4">
                  Tap the heart icon on any seat cover to save it for later and compare fitment options!
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-gradient-to-r from-[#D9232D] to-[#B91822] text-white text-[12px] font-black px-5 py-2.5 rounded-xl shadow-md shadow-red-600/20 hover:brightness-105 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Start Browsing</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {cartCount > 0 && (
                    <button
                      type="button"
                      onClick={onOpenCart}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-extrabold text-slate-800 hover:border-rose-200 hover:text-[#D9232D] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Open Cart ({cartCount})</span>
                    </button>
                  )}
                </div>
              </div>
            ) : filteredWishlist.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 text-center space-y-2">
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
              <AnimatePresence initial={false}>
                {filteredWishlist.map((p) => {
                  const availability = getProductAvailability(p);
                  const sellable = isProductSellable(p);
                  const savings =
                    p.originalPrice && p.originalPrice > p.price
                      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                      : 0;
                  const alreadyInCart = isInCart(p);
                  const badgeInfo = getProductBadgeInfo(p);

                  return (
                    <motion.div
                      key={p.id}
                      layout={!shouldReduceMotion}
                      initial="rest"
                      animate="rest"
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={shouldReduceMotion ? undefined : 'hover'}
                      className="group relative overflow-hidden bg-white/95 backdrop-blur-md rounded-xl p-2.5 border border-slate-200/80 hover:border-rose-200/90 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.07)] flex gap-2.5 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      {badgeInfo && (
                        <ProductCornerRibbon
                          label={badgeInfo.label}
                          gradientClass={badgeInfo.gradientClass}
                          size="sm"
                        />
                      )}
                      <div
                        onClick={() => {
                          onSelectProduct(p);
                          onClose();
                        }}
                        className="relative w-16 h-16 rounded-xl bg-slate-100 border border-slate-200/70 overflow-hidden flex-shrink-0 cursor-pointer"
                      >
                        <motion.img
                          src={p.image}
                          alt={p.title}
                          variants={PRODUCT_IMAGE_ZOOM_VARIANTS}
                          transition={PRODUCT_IMAGE_ZOOM_TRANSITION}
                          className="w-full h-full object-cover will-change-transform"
                        />
                        {!badgeInfo && savings > 0 && (
                          <span className="absolute bottom-1 left-1 rounded bg-[#D9232D] px-1 py-0.5 text-[8.5px] font-black text-white shadow-2xs">
                            -{savings}%
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <h4
                              onClick={() => {
                                onSelectProduct(p);
                                onClose();
                              }}
                              className="text-[12.5px] font-black text-slate-900 leading-snug line-clamp-1 cursor-pointer hover:text-[#D9232D] transition-colors"
                            >
                              {p.title}
                            </h4>
                            <button
                              type="button"
                              onClick={() => onRemoveWishlist(p)}
                              aria-label={`Remove ${p.title} from wishlist`}
                              className="grid h-8 w-8 shrink-0 place-items-center text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                                availability.state === 'out-of-stock'
                                  ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70'
                                  : availability.state === 'low-stock'
                                    ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/70'
                                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70'
                              }`}
                            >
                              {availability.label}
                            </span>
                            {alreadyInCart && sellable && (
                              <span className="text-[10px] font-bold text-emerald-700">
                                · In cart
                              </span>
                            )}
                            {p.rating > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-600">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {p.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-between items-center gap-2 mt-2 pt-1.5 border-t border-slate-100">
                          <div className="flex items-baseline gap-1.5 tabular-nums">
                            <span className="text-[14px] font-black text-[#D9232D]">₹{p.price}</span>
                            {p.originalPrice > p.price && (
                              <span className="text-[10px] font-semibold text-slate-400 line-through">
                                ₹{p.originalPrice}
                              </span>
                            )}
                          </div>
                          {sellable ? (
                            <button
                              type="button"
                              onClick={() => handleMoveItemToCart(p)}
                              aria-label={`Move ${p.title} to cart`}
                              className="banner-cta-shine group/cta min-h-9 rounded-lg bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-xs transition-all hover:brightness-105 hover:shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                              <span>Move to Cart</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              aria-label={`${p.title} is out of stock`}
                              className="min-h-9 cursor-not-allowed rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-400 flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <span>Out of Stock</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            </div>
          </div>

          {/* Sticky Bottom Bar when wishlist has items */}
          {!isLoading && wishlist.length > 0 && (
            <div className="shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-3.5 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Saved Collection
                </p>
                <p className="text-xs font-black text-slate-900 tabular-nums truncate sm:text-sm">
                  ₹{totalSavedValue.toLocaleString('en-IN')}{' '}
                  <span className="text-[10.5px] font-semibold text-slate-500">
                    ({wishlist.length} {wishlist.length === 1 ? 'item' : 'items'})
                  </span>
                </p>
              </div>
              {movableItems.length > 0 ? (
                <button
                  type="button"
                  onClick={handleMoveAllToCart}
                  className="banner-cta-shine group/cta min-h-10 shrink-0 rounded-xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-3.5 py-2 text-xs font-black text-white shadow-[0_8px_18px_-4px_rgba(217,35,45,0.38)] hover:brightness-105 hover:shadow-[0_10px_22px_-4px_rgba(217,35,45,0.48)] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ShoppingBag className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                  <span>Move All to Cart ({movableItems.length})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="banner-cta-shine group/cta min-h-10 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-black text-white shadow-sm hover:shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
