import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search, ShoppingCart, SlidersHorizontal, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { ProductCardErrorBoundary } from './ProductCardErrorBoundary';
import { CatalogStatus } from './CatalogStatus';

interface ShopViewProps {
  products: Product[];
  wishlist: Product[];
  cartCount: number;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onBack: () => void;
  onSearch: (value: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, event: React.MouseEvent) => void;
  onNotifyMe?: (product: Product) => void | Promise<void>;
  isQuickAddInCart: (product: Product) => boolean;
  onToggleWishlist: (product: Product, event: React.MouseEvent) => void;
  onOpenCart: () => void;
  sortLabel: string;
  activeFilterCount: number;
  onOpenSort: () => void;
  onOpenFilter: () => void;
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
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#FFFCF4] pb-[max(2rem,env(safe-area-inset-bottom))] text-[#2B1611]">
      <header className="flex items-center justify-between gap-2 bg-[#6B352A] text-[#FFFCF4] px-4 pb-3 pt-4 sm:px-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          <button onClick={onBack} aria-label="Go back" className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full hover:bg-[#53271E]">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-none text-[#FFFCF4]">Shop</h1>
            <p className="mt-1 truncate text-[11px] font-medium text-[#FFF1A6]/85">Home / Shop</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => onSearch('')} aria-label="Search" className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[#53271E]">
            <Search className="h-5 w-5" />
          </button>
          <button aria-label="Go to Cart" onClick={onOpenCart} className="relative grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[#53271E]">
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6115] text-[10px] font-extrabold text-[#1F0E0A]">
              {cartCount}
            </span>
          </button>
        </div>
      </header>

      <div className="mt-3 px-4 sm:px-5">
        <div className="flex min-h-11 items-center rounded-full border border-[#E8D8C4] bg-white px-4 py-1.5 shadow-2xs">
          <Search className="h-5 w-5 shrink-0 text-[#8C6F66]" />
          <input
            aria-label="Search seat covers"
            onChange={(event) => onSearch(event.target.value)}
            className="ml-2 min-h-9 w-full min-w-0 bg-transparent text-base sm:text-[13px] text-[#2B1611] outline-none placeholder:text-[#8C6F66]"
            placeholder="Search seat covers, cushions..."
          />
        </div>
      </div>

      <nav aria-label="Product categories" className="no-scrollbar mt-3.5 flex max-w-full gap-2 overflow-x-auto px-4 sm:px-5">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            aria-pressed={activeCategory === item}
            className={`min-h-10 shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${activeCategory === item ? 'bg-[#6B352A] text-[#FFFCF4]' : 'bg-[#FFF8D6] text-[#6B352A] border border-[#E8D8C4]'}`}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5">
        <div className="flex min-w-0 flex-wrap gap-2">
          <button type="button" onClick={onOpenSort} aria-label="Sort products" className="flex min-h-11 items-center gap-1 rounded-full border border-[#E8D8C4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2B1611]">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#6B352A]" /> {sortLabel}
          </button>
          <button type="button" onClick={onOpenFilter} aria-label="Filter products" className="flex min-h-11 items-center gap-1 rounded-full border border-[#E8D8C4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2B1611]">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#6B352A]" /> Filter
            {activeFilterCount > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#6B352A] px-1 text-[9px] font-extrabold text-[#FFFCF4]">{activeFilterCount}</span>}
          </button>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setLayout('grid')} aria-label="Grid view" aria-pressed={layout === 'grid'} className={`grid min-h-11 min-w-11 place-items-center rounded-lg ${layout === 'grid' ? 'bg-[#6B352A] text-[#FFFCF4]' : 'text-[#7A5B52]'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setLayout('list')} aria-label="List view" aria-pressed={layout === 'list'} className={`grid min-h-11 min-w-11 place-items-center rounded-lg ${layout === 'list' ? 'bg-[#6B352A] text-[#FFFCF4]' : 'text-[#7A5B52]'}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-3 px-5 text-xs font-medium text-[#7A5B52]" aria-live="polite">
        {isLoading && renderableProducts.length === 0
          ? 'Loading products…'
          : error && renderableProducts.length === 0
            ? 'Products unavailable'
            : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'product' : 'products'} found`}
      </p>

      {error && <div className="px-4 pt-3"><CatalogStatus state="error" onRetry={onRetry} /></div>}
      {isLoading && renderableProducts.length === 0 && <div className="px-4 pt-3"><CatalogStatus state="loading" /></div>}
      {!isLoading && !error && visibleProducts.length === 0 && (
        <p className="mx-4 mt-4 rounded-2xl border border-[#E8D8C4] bg-white px-5 py-8 text-center text-sm text-[#6B4C44]" role="status">
          No products found
        </p>
      )}
      {visibleProducts.length > 0 && (
        <section aria-label="Products Catalog" className={`px-4 py-2 ${layout === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}`}>
          {visibleProducts.map((product) => (
            <ProductCardErrorBoundary key={product.id} productTitle={product.title}>
              <ProductCard
                product={product}
                layoutMode={layout}
                onSelectProduct={onSelectProduct}
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
