import React, { useLayoutEffect, useRef, useState } from 'react';
import { Product } from '../types';
import { Heart, Plus, Star, ShoppingCart, ImageOff } from 'lucide-react';
import { motion } from 'motion/react';
import { getProductAvailability, isProductSellable } from '../lib/productAvailability';
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
        className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-1 bg-[#FFF8E8] text-[#8C6F66]"
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
      {!isLoaded && <div className="skeleton-shimmer absolute inset-0 z-0 bg-[#F3E7D5]" />}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onLoad={() => {
          loadedImageSrcs.add(imageSrc);
          setIsLoaded(true);
        }}
        onError={() => setHasFailed(true)}
        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
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
    className="absolute inset-0 z-0 m-0 appearance-none rounded-2xl border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] focus-visible:ring-offset-2"
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
  const cardSubtitle = product.subtitle || product.colors[0]?.subtitle;
  const sellable = isProductSellable(product);
  const trackedSoldOut = product.inStock && product.stockQuantity != null && product.stockQuantity <= 0;
  const availabilityLabel =
    availability.state === 'out-of-stock'
      ? trackedSoldOut ? t('product.soldOut') : t('product.outOfStock')
      : availability.state === 'low-stock'
        ? availability.label
        : t('product.inStock');
  const availabilityClass = availability.state === 'in-stock' ? 'text-[#6B352A]' : 'text-[#B45309]';
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [heartPulseKey, setHeartPulseKey] = useState(0);
  const notifyRequestLock = useRef(false);
  const handleWishlistClick = (event: React.MouseEvent) => {
    if (!isWishlisted) {
      setHeartPulseKey((key) => key + 1);
    }
    onToggleWishlist(product, event);
  };
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
    if (product.badgeColor === 'green' || (!product.badge && product.isNew)) return 'bg-[#FFF1A6] text-[#6B352A] border border-[#E5C95C]';
    if (product.badgeColor === 'blue') return 'bg-[#8D5A47] text-[#FFFCF4]';
    if (product.badgeColor === 'orange') return 'bg-[#FF6115] text-[#1F0E0A]';
    return 'bg-[#6B352A] text-[#FFFCF4]';
  })();

  // ----------------------------------------------------------------------
  // LIST VIEW (Screen 3 in mockup - horizontal rows)
  // ----------------------------------------------------------------------
  if (layoutMode === 'list') {
    return (
      <article
        className="w-full bg-white rounded-2xl p-2.5 border border-[#EAE0D0] shadow-[0_2px_12px_rgba(107,53,42,0.04)] hover:border-[#6B352A]/40 md:hover:-translate-y-1 md:hover:scale-[1.015] md:hover:shadow-[0_14px_30px_-8px_rgba(107,53,42,0.14),0_4px_12px_-2px_rgba(107,53,42,0.08)] flex items-center justify-between gap-2.5 relative group cursor-pointer transition-all duration-300 ease-out will-change-transform select-none"
      >
        <ProductCardOpenButton product={product} onSelectProduct={onSelectProduct} />
        {/* Left: Thumbnail with Badge */}
        <div className="relative z-10 pointer-events-none w-[72px] h-[72px] sm:w-20 sm:h-20 bg-[#FFF8E8] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
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
          <h4 className="line-clamp-2 text-[12px] font-bold text-[#2B1611] group-hover:text-[#6B352A] transition-colors leading-tight break-words">
            {product.title}
          </h4>
          <p className={`mt-1 text-[10px] font-bold ${availabilityClass}`}>{availabilityLabel}</p>

          {cardSubtitle && (
            <p className="line-clamp-1 text-[10px] text-[#7A5B52] font-medium mt-0.5 break-words">
              {cardSubtitle}
            </p>
          )}

          {/* Rating */}
          {product.reviewCount > 0 && <div className="flex items-center gap-1.5 mt-1">
            <div className="flex items-center text-amber-600 text-[11px] font-bold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500 mr-0.5" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-[10px] text-[#8C6F66] font-medium">
              ({t('product.reviews', { count: product.reviewCount })})
            </span>
          </div>}

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-[15px] font-black text-[#6B352A] leading-none">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-[11px] text-[#8C6F66] line-through leading-none">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Wishlist Heart & Clay Add Button */}
        <div className="relative z-10 pointer-events-none flex flex-col items-center justify-between self-stretch py-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleWishlistClick}
            aria-label={isWishlisted ? t('product.removeFromWishlist') : t('product.addToWishlist')}
            aria-pressed={isWishlisted}
            className="pointer-events-auto grid min-h-11 min-w-11 place-items-center rounded-full text-[#8C6F66] hover:text-[#6B352A] transition-colors active:scale-90"
          >
            <Heart
              key={heartPulseKey}
              className={`w-4 h-4 transition-colors ${
                isWishlisted
                  ? 'wishlist-heartbeat text-[#6B352A] fill-[#6B352A]'
                  : 'text-[#8C6F66]'
              }`}
            />
          </button>

          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (isInCart) onOpenCart();
              else if (sellable) onQuickAddToCart(product, event);
              else void handleNotifyMe(event);
            }}
            disabled={!sellable && !isInCart && (!onNotifyMe || notifySubmitting)}
            aria-label={isInCart ? t('product.goToCart') : sellable ? t('product.addToCart') : t('product.notifyMe')}
            title={isInCart ? t('product.goToCart') : sellable ? t('product.addToCart') : t('product.notifyMe')}
            className={`pointer-events-auto ${!sellable && !isInCart ? 'min-h-11 min-w-[78px] px-2 text-[9px] font-extrabold' : 'h-11 w-11'} rounded-xl flex items-center justify-center transition-all shadow-sm ${
              isInCart
                ? 'bg-[#FF6115] text-[#1F0E0A] hover:bg-[#E8520A]'
                : 'banner-cta-shine bg-[#6B352A] text-[#FFFCF4] hover:bg-[#53271E] hover:shadow-md active:scale-95'
            }`}
          >
            {isInCart ? (
              <ShoppingCart className="w-4 h-4" />
            ) : sellable ? (
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
      } bg-white rounded-2xl p-2 border border-[#EAE0D0] shadow-[0_3px_12px_rgba(107,53,42,0.04)] hover:border-[#6B352A]/40 md:hover:-translate-y-1.5 md:hover:scale-[1.025] md:hover:shadow-[0_18px_36px_-10px_rgba(107,53,42,0.16),0_6px_16px_-4px_rgba(107,53,42,0.09)] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out will-change-transform select-none`}
    >
      <ProductCardOpenButton product={product} onSelectProduct={onSelectProduct} />
      {/* Card Image & Badges Container (1:1 800x800 ratio) */}
      <div className="relative z-10 pointer-events-none w-full aspect-square bg-[#FFF8E8] rounded-xl overflow-hidden flex items-center justify-center mb-1.5">
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
          onClick={handleWishlistClick}
          aria-label={isWishlisted ? t('product.removeFromWishlist') : t('product.addToWishlist')}
          aria-pressed={isWishlisted}
          className="pointer-events-auto absolute top-1 right-1 z-10 grid min-h-11 min-w-11 place-items-center rounded-full bg-[#FFFCF4]/92 backdrop-blur-xs text-[#6B4C44] hover:text-[#6B352A] shadow-xs transition-colors active:scale-90"
        >
          <Heart
            key={heartPulseKey}
            className={`w-3.5 h-3.5 transition-colors ${
              isWishlisted
                ? 'wishlist-heartbeat text-[#6B352A] fill-[#6B352A]'
                : 'text-[#6B4C44]'
            }`}
          />
        </button>

        {/* Rating overlay pill */}
        {product.reviewCount > 0 && <div className="absolute bottom-1.5 left-2 bg-[#2B1611]/75 backdrop-blur-xs text-[#FFFCF4] text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 fill-[#FFF1A6] text-[#FFF1A6]" />
          <span>{product.rating.toFixed(1)}</span>
        </div>}
      </div>

      {/* Product Title */}
      <h4 className="relative z-10 pointer-events-none line-clamp-2 min-h-[29px] text-[12px] font-bold text-[#2B1611] leading-[1.2] mb-0.5 break-words group-hover:text-[#6B352A] transition-colors">
        {product.title}
      </h4>
      <p className={`relative z-10 pointer-events-none text-[10px] font-bold ${availabilityClass}`}>{availabilityLabel}</p>

      {/* Subtitle / Short Description */}
      {cardSubtitle && (
        <p className="relative z-10 pointer-events-none line-clamp-1 text-[10px] text-[#7A5B52] font-medium mb-1 break-words">
          {cardSubtitle}
        </p>
      )}

      {/* Price & Action Button */}
      <div className="relative z-10 pointer-events-none flex items-center justify-between mt-auto pt-1 border-t border-[#F4EAE0]">
        <div className="pointer-events-none flex flex-col">
          <span className="text-[14px] font-black text-[#6B352A] leading-none">
            {formatPrice(product.price)}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="text-[9px] text-[#8C6F66] line-through leading-none">{formatPrice(product.originalPrice)}</span>
            {discountPercent(product) > 0 && <span className="text-[9px] font-bold leading-none text-[#B45309]">{t('product.savePercent', { percent: discountPercent(product) })}</span>}
          </span>
        </div>

        {/* Clay Brown Quick Add Button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (isInCart) onOpenCart();
              else if (sellable) onQuickAddToCart(product, event);
              else void handleNotifyMe(event);
            }}
          disabled={!sellable && !isInCart && (!onNotifyMe || notifySubmitting)}
          aria-label={isInCart ? t('product.goToCart') : sellable ? t('product.addToCart') : t('product.notifyMe')}
          title={isInCart ? t('product.goToCart') : sellable ? t('product.addToCart') : t('product.notifyMe')}
          className={`pointer-events-auto ${!sellable && !isInCart ? 'min-h-11 min-w-[82px] px-1.5 text-[9px] font-extrabold' : 'h-11 w-11'} rounded-lg flex items-center justify-center transition-all shadow-xs ${
            isInCart
              ? 'bg-[#FF6115] text-[#1F0E0A] hover:bg-[#E8520A]'
              : 'banner-cta-shine bg-[#6B352A] text-[#FFFCF4] hover:bg-[#53271E] hover:shadow-md active:scale-95'
          }`}
        >
          {isInCart ? (
            <ShoppingCart className="w-3.5 h-3.5" />
          ) : sellable ? (
            <Plus className="w-4 h-4 stroke-[3]" />
          ) : t('product.notifyShort')}
        </motion.button>
      </div>
    </article>
  );
};
