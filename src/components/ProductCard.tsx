import React, { useLayoutEffect, useRef, useState } from 'react';
import { Product } from '../types';
import { Heart, Plus, Star, ShoppingCart, ImageOff } from 'lucide-react';
import { motion } from 'motion/react';
import { getProductAvailability } from '../lib/productAvailability';
import { formatInr, useI18n } from '../lib/i18n';

const loadedImageSrcs = new Set<string>();
const formatPrice = formatInr;

const discountPercent = (product: Product) => product.originalPrice > product.price
  ? Math.round((1 - product.price / product.originalPrice) * 100)
  : 0;

interface ProductCardProps {
  product: Product;
  onSelectProduct: (p: Product) => void;
  onQuickAddToCart: (p: Product, e: React.MouseEvent) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
  onNotifyMe?: (p: Product) => void | Promise<void>;
  isInCart?: boolean;
  onOpenCart: () => void;
  layoutMode?: 'shelf' | 'grid' | 'list';
}

const ProductImage: React.FC<{ src: string | null | undefined; alt: string; variant: 'grid' | 'list' }> = ({ src, alt, variant }) => {
  const imageSrc = typeof src === 'string' ? src.trim() : '';
  const [isLoaded, setIsLoaded] = useState(() => loadedImageSrcs.has(imageSrc));
  const [hasFailed, setHasFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const image = imgRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      loadedImageSrcs.add(imageSrc);
      setIsLoaded(true);
    }
  }, [imageSrc]);

  if (!imageSrc || hasFailed) {
    return (
      <div
        className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-1 bg-[#F4F4F6] text-slate-400"
        role="img"
        aria-label={`Image unavailable for ${alt}`}
      >
        <ImageOff className={variant === 'list' ? 'h-4 w-4' : 'h-6 w-6'} aria-hidden="true" />
        <span className={variant === 'list' ? 'text-[8px]' : 'text-[9px]'}>Image unavailable</span>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && <div className="skeleton-shimmer absolute inset-0 z-0 bg-gray-200" />}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onLoad={() => {
          loadedImageSrcs.add(imageSrc);
          setIsLoaded(true);
        }}
        onError={() => setHasFailed(true)}
        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        decoding="async"
      />
    </>
  );
};

const ProductCardOpenButton: React.FC<{ product: Product; onSelectProduct: (p: Product) => void }> = ({ product, onSelectProduct }) => {
  const { t } = useI18n();
  return <button
    type="button"
    onClick={() => onSelectProduct(product)}
    aria-label={t('product.view', { title: product.title })}
    className="absolute inset-0 z-0 m-0 appearance-none rounded-2xl border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] focus-visible:ring-offset-2"
  />;
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onQuickAddToCart,
  isWishlisted,
  onToggleWishlist,
  isInCart = false,
  onOpenCart,
  onNotifyMe,
  layoutMode = 'grid',
}) => {
  const { t } = useI18n();
  const availability = getProductAvailability(product);
  const availabilityLabel = availability.state === 'out-of-stock' ? t('product.outOfStock') : t('product.inStock');
  const availabilityClass = availability.state === 'out-of-stock' ? 'text-amber-700' : 'text-emerald-700';
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const notifyRequestLock = useRef(false);
  const handleNotifyMe = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (notifyRequestLock.current || !onNotifyMe) return;
    notifyRequestLock.current = true;
    setNotifySubmitting(true);
    try {
      await onNotifyMe(product);
    } catch (error) {
      console.error('Could not set up the stock alert.', error);
    } finally {
      notifyRequestLock.current = false;
      setNotifySubmitting(false);
    }
  };
  // Determine badge label and color
  const rawBadgeLabel = product.badge || (product.isBestseller ? 'Bestseller' : product.isNew ? 'New' : null);
  const badgeLabel = rawBadgeLabel === 'Bestseller' ? t('product.bestseller') : rawBadgeLabel === 'New' ? t('product.new') : rawBadgeLabel;
  const badgeColorClass = (() => {
    if (product.badgeColor === 'green' || (!product.badge && product.isNew)) return 'bg-emerald-600 text-white';
    if (product.badgeColor === 'blue') return 'bg-blue-600 text-white';
    if (product.badgeColor === 'orange') return 'bg-amber-600 text-white';
    return 'bg-[#D9232D] text-white'; // default red
  })();

  // ----------------------------------------------------------------------
  // LIST VIEW (Screen 3 in mockup - horizontal rows)
  // ----------------------------------------------------------------------
  if (layoutMode === 'list') {
    return (
      <article
        className="w-full bg-white rounded-2xl p-2.5 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] hover:border-gray-200 flex items-center justify-between gap-2.5 relative group cursor-pointer transition-all duration-200 select-none"
      >
        <ProductCardOpenButton product={product} onSelectProduct={onSelectProduct} />
        {/* Left: Thumbnail with Badge */}
        <div className="relative z-10 pointer-events-none w-[72px] h-[72px] sm:w-20 sm:h-20 bg-[#F4F4F6] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
          <ProductImage src={product.image} alt={product.title} variant="list" />

          {badgeLabel && (
            <span
              className={`absolute top-1.5 left-1.5 z-10 text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full shadow-xs ${badgeColorClass}`}
            >
              {badgeLabel}
            </span>
          )}

        </div>

        {/* Middle: Title, Subtitle, Rating, Price */}
        <div className="relative z-10 pointer-events-none flex-1 min-w-0 pr-1">
          <h4 className="line-clamp-2 text-[12px] font-bold text-gray-900 group-hover:text-[#D9232D] transition-colors leading-tight break-words">
            {product.title}
          </h4>
          <p className={`mt-1 text-[10px] font-bold ${availabilityClass}`}>{availabilityLabel}</p>

          {product.subtitle && (
            <p className="line-clamp-1 text-[10px] text-gray-500 font-medium mt-0.5 break-words">
              {product.subtitle}
            </p>
          )}

          {/* Rating */}
          {product.reviewCount > 0 && <div className="flex items-center gap-1.5 mt-1">
            <div className="flex items-center text-amber-500 text-[11px] font-bold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium">
              ({t('product.reviews', { count: product.reviewCount })})
            </span>
          </div>}

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-[15px] font-black text-[#D9232D] leading-none">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-[11px] text-gray-400 line-through leading-none">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Wishlist Heart & Red Add Button */}
        <div className="relative z-10 pointer-events-none flex flex-col items-center justify-between self-stretch py-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => onToggleWishlist(product, e)}
            aria-label={isWishlisted ? t('product.removeFromWishlist') : t('product.addToWishlist')}
            aria-pressed={isWishlisted}
            className="pointer-events-auto grid min-h-11 min-w-11 place-items-center rounded-full text-gray-400 hover:text-red-500 transition-colors active:scale-90"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isWishlisted ? 'text-[#D9232D] fill-[#D9232D]' : 'text-gray-400'
              }`}
            />
          </button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (isInCart) onOpenCart();
              else if (product.inStock) onQuickAddToCart(product, event);
              else void handleNotifyMe(event);
            }}
            disabled={!product.inStock && !isInCart && (!onNotifyMe || notifySubmitting)}
            aria-label={isInCart ? t('product.goToCart') : product.inStock ? t('product.addToCart') : t('product.notifyMe')}
            title={isInCart ? t('product.goToCart') : product.inStock ? t('product.addToCart') : t('product.notifyMe')}
            className={`pointer-events-auto ${!product.inStock && !isInCart ? 'min-h-11 min-w-[78px] px-2 text-[9px] font-extrabold' : 'h-11 w-11'} rounded-xl flex items-center justify-center transition-all shadow-sm ${
              isInCart
                ? 'bg-emerald-600 text-white'
                : 'bg-[#D9232D] text-white hover:bg-red-700 active:scale-95'
            }`}
          >
            {isInCart ? (
              <ShoppingCart className="w-4 h-4" />
            ) : product.inStock ? (
              <Plus className="w-4 h-4 stroke-[3]" />
            ) : t('product.notifyShort')}
          </motion.button>
        </div>
      </article>
    );
  }

  // ----------------------------------------------------------------------
  // GRID & SHELF VIEW (Screen 2 in mockup - 2-column cards)
  // ----------------------------------------------------------------------
  return (
    <article
      className={`${
        layoutMode === 'shelf' ? 'flex-shrink-0 w-[148px] sm:w-[160px]' : 'w-full'
      } bg-white rounded-2xl p-2 border border-gray-100 shadow-[0_3px_12px_rgba(0,0,0,0.035)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-gray-200 flex flex-col justify-between relative group cursor-pointer transition-all duration-200 select-none`}
    >
      <ProductCardOpenButton product={product} onSelectProduct={onSelectProduct} />
      {/* Card Image & Badges Container */}
      <div className="relative z-10 pointer-events-none w-full h-[112px] sm:h-[132px] bg-[#F4F4F6] rounded-xl overflow-hidden flex items-center justify-center mb-1.5">
        <ProductImage src={product.image} alt={product.title} variant="grid" />

        {/* Dynamic Badge (Bestseller, New, Gel, Waterproof, etc.) */}
        {badgeLabel && (
          <span
            className={`absolute top-2 left-2 z-10 text-[8.5px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow-xs ${badgeColorClass}`}
          >
            {badgeLabel}
          </span>
        )}

        {/* Wishlist Heart */}
        <button
          type="button"
          onClick={(e) => onToggleWishlist(product, e)}
          aria-label={isWishlisted ? t('product.removeFromWishlist') : t('product.addToWishlist')}
          aria-pressed={isWishlisted}
          className="pointer-events-auto absolute top-1 right-1 z-10 grid min-h-11 min-w-11 place-items-center rounded-full bg-white/90 backdrop-blur-xs text-gray-600 hover:text-red-500 shadow-xs transition-colors active:scale-90"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isWishlisted ? 'text-[#D9232D] fill-[#D9232D]' : 'text-gray-600'
            }`}
          />
        </button>

        {/* Rating overlay pill */}
        {product.reviewCount > 0 && <div className="absolute bottom-1.5 left-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          <span>{product.rating.toFixed(1)}</span>
        </div>}
      </div>

      {/* Product Title */}
      <h4 className="relative z-10 pointer-events-none line-clamp-2 min-h-[29px] text-[12px] font-bold text-gray-800 leading-[1.2] mb-0.5 break-words group-hover:text-[#D9232D] transition-colors">
        {product.title}
      </h4>
      <p className={`relative z-10 pointer-events-none text-[10px] font-bold ${availabilityClass}`}>{availabilityLabel}</p>

      {/* Subtitle / Short Description */}
      {product.subtitle && (
        <p className="relative z-10 pointer-events-none line-clamp-1 text-[10px] text-gray-500 font-medium mb-1 break-words">
          {product.subtitle}
        </p>
      )}

      {/* Price & Action Button */}
      <div className="relative z-10 pointer-events-none flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
        <div className="pointer-events-none flex flex-col">
          <span className="text-[14px] font-black text-[#D9232D] leading-none">
            {formatPrice(product.price)}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="text-[9px] text-gray-400 line-through leading-none">{formatPrice(product.originalPrice)}</span>
            {discountPercent(product) > 0 && <span className="text-[9px] font-bold leading-none text-emerald-700">{t('product.savePercent', { percent: discountPercent(product) })}</span>}
          </span>
        </div>

        {/* Red Quick Add Button matching mockup (+) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (isInCart) onOpenCart();
              else if (product.inStock) onQuickAddToCart(product, event);
              else void handleNotifyMe(event);
            }}
          disabled={!product.inStock && !isInCart && (!onNotifyMe || notifySubmitting)}
          aria-label={isInCart ? t('product.goToCart') : product.inStock ? t('product.addToCart') : t('product.notifyMe')}
          title={isInCart ? t('product.goToCart') : product.inStock ? t('product.addToCart') : t('product.notifyMe')}
          className={`pointer-events-auto ${!product.inStock && !isInCart ? 'min-h-11 min-w-[82px] px-1.5 text-[9px] font-extrabold' : 'h-11 w-11'} rounded-lg flex items-center justify-center transition-all shadow-xs ${
            isInCart
              ? 'bg-emerald-600 text-white'
              : 'bg-[#D9232D] text-white hover:bg-red-700 active:scale-95'
          }`}
        >
          {isInCart ? (
            <ShoppingCart className="w-3.5 h-3.5" />
          ) : product.inStock ? (
            <Plus className="w-4 h-4 stroke-[3]" />
          ) : t('product.notifyShort')}
        </motion.button>
      </div>
    </article>
  );
};
