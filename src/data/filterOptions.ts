import type { VehicleCategory } from '../types';

export type SortOption =
  | 'manual'
  | 'popular'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'newest'
  | 'discount';

export interface FilterState {
  category: 'all' | VehicleCategory;
  priceRange: 'all' | 'under_300' | '300_600' | '600_1000' | 'above_1000' | 'custom';
  maxPrice: number;
  minRating: number;
  waterproofOnly: boolean;
  bestsellerOnly: boolean;
  inStockOnly: boolean;
  customizableOnly: boolean;
  vehicleBrand: string;
}

export const INITIAL_FILTERS: FilterState = {
  category: 'all',
  priceRange: 'all',
  maxPrice: 2000,
  minRating: 0,
  waterproofOnly: false,
  bestsellerOnly: false,
  inStockOnly: false,
  customizableOnly: false,
  vehicleBrand: 'all',
};

export const SORT_LABELS: Record<SortOption, { label: string; desc: string }> = {
  manual: { label: 'Storefront Order', desc: 'Order arranged by the store administrator' },
  popular: { label: 'Popular & Recommended', desc: 'Best selling items & top recommendations' },
  price_asc: { label: 'Price: Low to High', desc: 'Affordable budget-friendly options first' },
  price_desc: { label: 'Price: High to Low', desc: 'Premium, heavy-duty & deluxe sets first' },
  rating: { label: 'Customer Rating: High to Low', desc: 'Top rated 4.5+ star customer reviews' },
  newest: { label: 'New Arrivals', desc: 'Latest designs & 2026 models' },
  discount: { label: 'Best Discount', desc: 'Largest savings first' },
};
