import React, { useState } from 'react';
import { Product } from '../types';
import { Heart, Star } from 'lucide-react';
import { AddToBasket } from './ui/motion-add-to-basket';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (p: Product) => void;
  onQuickAddToCart: (p: Product, e: React.MouseEvent) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Product, e: React.MouseEvent) => void;
  isAddedJustNow?: boolean;
  layoutMode?: 'shelf' | 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onQuickAddToCart,
  isWishlisted,
  onToggleWishlist,
  isAddedJustNow = false,
  layoutMode = 'grid',
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

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
        onClick={() => onSelectProduct(product)}
        className="w-full bg-white rounded-2xl p-3 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] hover:border-gray-200 flex items-center justify-between gap-3 relative group cursor-pointer transition-all duration-200 select-none"
      >
        {/* Left: Thumbnail with Badge */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-[#F4F4F6] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
          {!imgLoaded && (
            <div className="skeleton-shimmer absolute inset-0 bg-gray-200 z-0" />
          )}

          {badgeLabel && (
            <span
              className={`absolute top-1.5 left-1.5 z-10 text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full shadow-xs ${badgeColorClass}`}
            >
              {badgeLabel}
            </span>
          )}

          <img
            src={product.image}
            alt={product.title}
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        </div>

        {/* Middle: Title, Subtitle, Rating, Price */}
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-[13.5px] font-bold text-gray-900 group-hover:text-[#D9232D] transition-colors truncate leading-tight">
            {product.title}
          </h4>

          {product.subtitle && (
            <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
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
        <div className="flex flex-col items-center justify-between self-stretch py-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => onToggleWishlist(product, e)}
            aria-label="Add to Wishlist"
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors active:scale-90"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isWishlisted ? 'text-[#D9232D] fill-[#D9232D]' : 'text-gray-400'
              }`}
            />
          </button>

          <AddToBasket
            image={product.image}
            name={product.title}
            price={product.price}
            onAdd={() => onQuickAddToCart(product, { stopPropagation: () => {} } as React.MouseEvent)}
          />
        </div>
      </article>
    );
  }

  // ----------------------------------------------------------------------
  // GRID & SHELF VIEW (Screen 2 in mockup - 2-column cards)
  // ----------------------------------------------------------------------
  return (
    <article
      onClick={() => onSelectProduct(product)}
      className={`${
        layoutMode === 'shelf' ? 'flex-shrink-0 w-[148px] sm:w-[160px]' : 'w-full'
      } bg-white rounded-2xl p-2.5 border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-gray-200 flex flex-col justify-between relative group cursor-pointer transition-all duration-200 select-none`}
    >
      {/* Card Image & Badges Container */}
      <div className="relative w-full h-[124px] sm:h-[145px] bg-[#F4F4F6] rounded-xl overflow-hidden flex items-center justify-center mb-2">
        {/* Shimmer skeleton before loaded */}
        {!imgLoaded && (
          <div className="skeleton-shimmer absolute inset-0 bg-gray-200 z-0" />
        )}

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
          aria-label="Add to Wishlist"
          className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-600 hover:text-red-500 shadow-xs transition-colors active:scale-90"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isWishlisted ? 'text-[#D9232D] fill-[#D9232D]' : 'text-gray-600'
            }`}
          />
        </button>

        {/* Product Image */}
        <img
          src={product.image}
          alt={product.title}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />

        {/* Rating overlay pill */}
        <div className="absolute bottom-1.5 left-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          <span>{product.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Product Title */}
      <h4 className="text-[12.5px] font-bold text-gray-800 leading-tight mb-0.5 line-clamp-1 group-hover:text-[#D9232D] transition-colors">
        {product.title}
      </h4>

      {/* Subtitle / Short Description */}
      {product.subtitle && (
        <p className="text-[10.5px] text-gray-400 font-medium truncate mb-1.5">
          {product.subtitle}
        </p>
      )}

      {/* Price & Action Button */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
        <div className="flex flex-col">
          <span className="text-[14.5px] font-black text-[#D9232D] leading-none">
            ₹{product.price}
          </span>
          <span className="text-[10px] text-gray-400 line-through leading-none mt-0.5">
            ₹{product.originalPrice}
          </span>
        </div>

        {/* Red Quick Add Button matching mockup (+) */}
        <AddToBasket
          image={product.image}
          name={product.title}
          price={product.price}
          onAdd={() => onQuickAddToCart(product, { stopPropagation: () => {} } as React.MouseEvent)}
        />
      </div>
    </article>
  );
};
