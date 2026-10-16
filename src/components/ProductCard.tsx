import React, { useState } from 'react';
import { Product } from '../types';
import { Heart, Plus, Star, ShoppingCart, ImageOff } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (p: Product) => void;
  onQuickAddToCart: (p: Product, e: React.MouseEvent) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
  isInCart?: boolean;
  onOpenCart: () => void;
  layoutMode?: 'shelf' | 'grid' | 'list';
}

const ProductImage: React.FC<{ src: string | null | undefined; alt: string; variant: 'grid' | 'list' }> = ({ src, alt, variant }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const imageSrc = typeof src === 'string' ? src.trim() : '';

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
        src={imageSrc}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasFailed(true)}
        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
      />
    </>
  );
};

const ProductCardOpenButton: React.FC<{ product: Product; onSelectProduct: (p: Product) => void }> = ({ product, onSelectProduct }) => (
  <button
    type="button"
    onClick={() => onSelectProduct(product)}
    aria-label={`View ${product.title}`}
    className="absolute inset-0 z-0 m-0 appearance-none rounded-2xl border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] focus-visible:ring-offset-2"
  />
);

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onQuickAddToCart,
  isWishlisted,
  onToggleWishlist,
  isInCart = false,
  onOpenCart,
  layoutMode = 'grid',
}) => {
  // Determine badge label and color
  const badgeLabel = product.badge || (product.isBestseller ? 'Bestseller' : product.isNew ? 'New' : null);
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
        className="w-full bg-white rounded-2xl p-3 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] hover:border-gray-200 flex items-center justify-between gap-3 relative group cursor-pointer transition-all duration-200 select-none"
      >
        <ProductCardOpenButton product={product} onSelectProduct={onSelectProduct} />
        {/* Left: Thumbnail with Badge */}
        <div className="relative z-10 pointer-events-none w-20 h-20 sm:w-24 sm:h-24 bg-[#F4F4F6] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
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
          <h4 className="text-[13.5px] font-bold text-gray-900 group-hover:text-[#D9232D] transition-colors leading-tight break-words">
            {product.title}
          </h4>
          {!product.inStock && <p className="mt-1 text-[10px] font-black uppercase text-amber-700">Out of stock</p>}

          {product.subtitle && (
            <p className="text-[11px] text-gray-400 font-medium mt-0.5 break-words">
              {product.subtitle}
            </p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex items-center text-amber-500 text-[11px] font-bold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium">
              ({product.reviewCount} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-[15px] font-black text-[#D9232D] leading-none">
              ₹{product.price}
            </span>
            {product.originalPrice && (
              <span className="text-[11px] text-gray-400 line-through leading-none">
                ₹{product.originalPrice}
              </span>
            )}
          </div>
        </div>

        {/* Right: Wishlist Heart & Red Add Button */}
        <div className="relative z-10 pointer-events-none flex flex-col items-center justify-between self-stretch py-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => onToggleWishlist(product, e)}
            aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            aria-pressed={isWishlisted}
            className="pointer-events-auto w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors active:scale-90"
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
            }}
            disabled={!product.inStock && !isInCart}
            aria-label={isInCart ? 'Go to Cart' : product.inStock ? 'Add to cart' : 'Out of stock'}
            className={`pointer-events-auto w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm ${
              isInCart
                ? 'bg-emerald-600 text-white'
                : 'bg-[#D9232D] text-white hover:bg-red-700 active:scale-95'
            }`}
            title={isInCart ? 'Go to Cart' : 'Add to cart'}
          >
            {isInCart ? (
              <ShoppingCart className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4 stroke-[3]" />
            )}
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
      } bg-white rounded-2xl p-2.5 border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-gray-200 flex flex-col justify-between relative group cursor-pointer transition-all duration-200 select-none`}
    >
      <ProductCardOpenButton product={product} onSelectProduct={onSelectProduct} />
      {/* Card Image & Badges Container */}
      <div className="relative z-10 pointer-events-none w-full h-[124px] sm:h-[145px] bg-[#F4F4F6] rounded-xl overflow-hidden flex items-center justify-center mb-2">
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
          aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-pressed={isWishlisted}
          className="pointer-events-auto absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-600 hover:text-red-500 shadow-xs transition-colors active:scale-90"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isWishlisted ? 'text-[#D9232D] fill-[#D9232D]' : 'text-gray-600'
            }`}
          />
        </button>

        {/* Rating overlay pill */}
        <div className="absolute bottom-1.5 left-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          <span>{product.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Product Title */}
      <h4 className="relative z-10 pointer-events-none text-[12.5px] font-bold text-gray-800 leading-tight mb-0.5 break-words group-hover:text-[#D9232D] transition-colors">
        {product.title}
      </h4>
      {!product.inStock && <p className="relative z-10 pointer-events-none text-[10px] font-black uppercase text-amber-700">Out of stock</p>}

      {/* Subtitle / Short Description */}
      {product.subtitle && (
        <p className="relative z-10 pointer-events-none text-[10.5px] text-gray-400 font-medium mb-1.5 break-words">
          {product.subtitle}
        </p>
      )}

      {/* Price & Action Button */}
      <div className="relative z-10 pointer-events-none flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
        <div className="pointer-events-none flex flex-col">
          <span className="text-[14.5px] font-black text-[#D9232D] leading-none">
            ₹{product.price}
          </span>
          <span className="text-[10px] text-gray-400 line-through leading-none mt-0.5">
            ₹{product.originalPrice}
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
          }}
          disabled={!product.inStock && !isInCart}
          aria-label={isInCart ? 'Go to Cart' : product.inStock ? 'Add to cart' : 'Out of stock'}
          className={`pointer-events-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-xs ${
            isInCart
              ? 'bg-emerald-600 text-white'
              : 'bg-[#D9232D] text-white hover:bg-red-700 active:scale-95'
          }`}
          title={isInCart ? 'Go to Cart' : 'Add to cart'}
        >
          {isInCart ? (
            <ShoppingCart className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-4 h-4 stroke-[3]" />
          )}
        </motion.button>
      </div>
    </article>
  );
};
