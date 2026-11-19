import React from 'react';
import type { Product } from '../types';

export interface ProductBadgeInfo {
  label: string;
  gradientClass: string;
}

export function getProductBadgeInfo(
  product: Pick<Product, 'badge' | 'badgeColor' | 'isBestseller' | 'isNew'>,
  translate?: (key: 'product.bestseller' | 'product.new') => string,
): ProductBadgeInfo | null {
  const rawBadgeLabel =
    product.badge || (product.isBestseller ? 'Bestseller' : product.isNew ? 'New' : null);

  if (!rawBadgeLabel || !rawBadgeLabel.trim()) return null;

  const trimmed = rawBadgeLabel.trim();
  const label =
    trimmed === 'Bestseller'
      ? translate?.('product.bestseller') ?? 'Bestseller'
      : trimmed === 'New'
        ? translate?.('product.new') ?? 'New'
        : trimmed;

  const gradientClass = (() => {
    if (product.badgeColor === 'green' || (!product.badge && product.isNew)) {
      return 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-700 text-white';
    }
    if (product.badgeColor === 'blue') {
      return 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white';
    }
    if (product.badgeColor === 'orange') {
      return 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white';
    }
    return 'bg-gradient-to-r from-[#B91822] via-[#D9232D] to-[#E11D48] text-white';
  })();

  return { label, gradientClass };
}

interface ProductCornerRibbonProps {
  label: string;
  gradientClass: string;
  size?: 'sm' | 'md';
}

/**
 * Angled top-left corner sash pinned flush to an `overflow-hidden` card corner.
 * Works cleanly across grid, shelf, list, suggestion, and wishlist cards without
 * obscuring the center of the product photo.
 */
export const ProductCornerRibbon: React.FC<ProductCornerRibbonProps> = ({
  label,
  gradientClass,
  size = 'md',
}) => {
  const isCompact = size === 'sm';
  const isLongLabel = label.length > 9;

  return (
    <div
      data-testid="product-corner-ribbon"
      aria-hidden="false"
      className={`pointer-events-none absolute left-0 top-0 z-20 overflow-hidden ${
        isCompact ? 'h-[58px] w-[58px]' : 'h-[74px] w-[74px]'
      }`}
    >
      <span
        className={`absolute block -rotate-45 border-y border-white/25 text-center font-black uppercase tracking-[0.06em] shadow-[0_2px_8px_rgba(15,23,42,0.24)] ${gradientClass} ${
          isCompact
            ? `-left-[24px] top-[13px] w-[90px] py-[2px] leading-none ${
                isLongLabel ? 'text-[5.8px]' : 'text-[6.5px]'
              }`
            : `-left-[28px] top-[18px] w-[112px] py-[2.5px] leading-none ${
                isLongLabel ? 'text-[6.8px]' : 'text-[7.5px]'
              }`
        }`}
      >
        {label}
      </span>
    </div>
  );
};
