import React, { useMemo, useState } from 'react';
import { ArrowLeft, Bike, Search, ShoppingCart, SlidersHorizontal, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ProductCardErrorBoundary } from './ProductCardErrorBoundary';
import { CatalogStatus } from './CatalogStatus';
import { CartBadge } from './CartBadge';

interface ShopViewProps {
  products: Product[];
  wishlist: Product[];
  cartCount: number;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onBack: () => void;
  onSearch: (value: string) => void;
  onSelectProduct: (product: Product, productList?: Product[]) => void;
  onQuickAdd: (product: Product, event: React.MouseEvent) => void;
  onNotifyMe?: (product: Product) => void | Promise<void>;
  isQuickAddInCart: (product: Product) => boolean;
  onToggleWishlist: (product: Product, event: React.MouseEvent) => void;
  onOpenCart: () => void;
  sortLabel: string;
  activeFilterCount: number;
  onOpenSort: () => void;
  onOpenFilter: () => void;
  activeVehicleFilter?: string | null;
  onOpenVehicleFinder?: () => void;
}

const isRenderableProduct = (value: unknown): value is Product => {
  if (!value || typeof value !== 'object') return false;
  const product = value as Partial<Product>;
  return typeof product.id === 'string'
    && product.id.trim().length > 0
    && typeof product.title === 'string'
    && product.title.trim().length > 0;
};

const getProductCategory = (product: Product): string => {
  const label = typeof product.categoryLabel === 'string' ? product.categoryLabel.trim() : '';
  const category = typeof product.category === 'string' ? product.category.trim() : '';
  return label || category;
};

export const ShopView: React.FC<ShopViewProps> = ({
  products,
  wishlist,
  cartCount,
  isLoading,
  error,
  onRetry,
  onBack,
  onSearch,
  onSelectProduct,
  onQuickAdd,
  onNotifyMe,
  isQuickAddInCart,
  onToggleWishlist,
  onOpenCart,
  sortLabel,
  activeFilterCount,
  onOpenSort,
  onOpenFilter,
  activeVehicleFilter,
  onOpenVehicleFinder,
}) => {
  const [category, setCategory] = useState('All');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const renderableProducts = useMemo(
    () => (Array.isArray(products) ? products : []).filter(isRenderableProduct),
    [products],
  );
  const categories = useMemo(() => {
    const productCategories = renderableProducts
      .map(getProductCategory)
      .filter((label) => label.length > 0);
    return ['All', ...Array.from(new Set(productCategories))];
  }, [renderableProducts]);
  const activeCategory = categories.includes(category) ? category : 'All';
  const visibleProducts = useMemo(() => {
    const filtered = activeCategory === 'All'
      ? [...renderableProducts]
      : renderableProducts.filter((product) => getProductCategory(product) === activeCategory);
    return filtered;
  }, [activeCategory, renderableProducts]);

  return (
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#f8f9fc] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-slate-800">
      <header className="flex items-center justify-between gap-2 px-3.5 pb-1.5 pt-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button onClick={onBack} aria-label="Go back" className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-none">Shop</h1>
            <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-400">Home / Shop</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => onSearch('')} aria-label="Search" className="grid min-h-10 min-w-10 place-items-center rounded-full">
            <Search className="h-4.5 w-4.5" />
          </button>
          <button aria-label="Go to Cart" onClick={onOpenCart} className="relative grid min-h-10 min-w-10 place-items-center rounded-full">
            <ShoppingCart className="h-5 w-5" />
            <CartBadge
              count={cartCount}
              showZero
              className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e61e25] px-1 text-[9.5px] font-bold text-white shadow-xs tabular-nums"
              ringColorClassName="bg-[#e61e25]/45"
            />
          </button>
        </div>
      </header>

      <div className="mt-1.5 px-3.5 sm:px-5">
        <div className="flex min-h-10 items-center rounded-full border border-slate-200/60 bg-[#f1f3f7] px-3.5 py-1">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            aria-label="Search seat covers"
            onChange={(event) => onSearch(event.target.value)}
            className="ml-2 min-h-8 w-full min-w-0 bg-transparent text-base sm:text-[13px] outline-none placeholder:text-slate-400"
            placeholder="Search seat covers, cushions..."
          />
        </div>
      </div>

      <nav aria-label="Product categories" className="no-scrollbar mt-2.5 flex max-w-full gap-1.5 overflow-x-auto px-3.5 sm:px-5">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            aria-pressed={activeCategory === item}
            className={`min-h-8 shrink-0 rounded-full px-3.5 py-1 text-[11.5px] font-semibold ${activeCategory === item ? 'bg-[#e61e25] text-white' : 'bg-[#eceef3] text-slate-700'}`}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-5">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <button type="button" onClick={onOpenSort} aria-label="Sort products" className="flex min-h-9.5 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11.5px] font-semibold">
            <ArrowUpDown className="h-3.5 w-3.5" /> {sortLabel}
          </button>
          <button type="button" onClick={onOpenFilter} aria-label="Filter products" className="flex min-h-9.5 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11.5px] font-semibold">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
            {activeFilterCount > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#e61e25] px-1 text-[9px] font-extrabold text-white">{activeFilterCount}</span>}
          </button>
          {onOpenVehicleFinder && (
            <button
              type="button"
              onClick={onOpenVehicleFinder}
              aria-label="Open Vehicle Fitment Finder"
              className={`flex min-h-9.5 items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors whitespace-nowrap ${
                activeVehicleFilter
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-[#D9232D]'
              }`}
            >
              <Bike className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="max-w-[120px] truncate">{activeVehicleFilter || 'Fitment'}</span>
            </button>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setLayout('grid')} aria-label="Grid view" aria-pressed={layout === 'grid'} className={`grid min-h-9.5 min-w-9.5 place-items-center rounded-lg ${layout === 'grid' ? 'bg-[#e61e25] text-white' : 'text-slate-500'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setLayout('list')} aria-label="List view" aria-pressed={layout === 'list'} className={`grid min-h-9.5 min-w-9.5 place-items-center rounded-lg ${layout === 'list' ? 'bg-[#e61e25] text-white' : 'text-slate-500'}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 px-3.5 sm:px-5 text-[11.5px] font-medium text-slate-500" aria-live="polite">
        {isLoading && renderableProducts.length === 0
          ? 'Loading products…'
          : error && renderableProducts.length === 0
            ? 'Products unavailable'
            : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'product' : 'products'} found`}
      </p>

      {error && <div className="px-3.5 sm:px-5 pt-2.5"><CatalogStatus state="error" onRetry={onRetry} /></div>}
      {isLoading && renderableProducts.length === 0 && <div className="px-3.5 sm:px-5 pt-2.5"><CatalogStatus state="loading" /></div>}
      {!isLoading && !error && visibleProducts.length === 0 && (
        <p className="mx-3.5 sm:mx-5 mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-600" role="status">
          No products found
        </p>
      )}
      {visibleProducts.length > 0 && (
        <section aria-label="Products Catalog" className={`px-3.5 sm:px-5 py-2 ${layout === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5' : 'grid grid-cols-1 lg:grid-cols-2 gap-2.5'}`}>
          {visibleProducts.map((product) => (
            <ProductCardErrorBoundary key={product.id} productTitle={product.title}>
              <ProductCard
                product={product}
                layoutMode={layout}
                onSelectProduct={(selected) => onSelectProduct(selected, visibleProducts)}
                onQuickAddToCart={onQuickAdd}
                onNotifyMe={onNotifyMe}
                isInCart={isQuickAddInCart(product)}
                onOpenCart={onOpenCart}
                isWishlisted={wishlist.some((item) => item.id === product.id)}
                onToggleWishlist={onToggleWishlist}
              />
            </ProductCardErrorBoundary>
          ))}
        </section>
      )}
    </main>
  );
};
