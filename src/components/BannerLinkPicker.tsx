import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ExternalLink, Loader2, Search, Store, X } from 'lucide-react';
import type { Product } from '../types';
import { getPathForProduct } from '../lib/appRoutes';
import { loadAdminProducts } from '../lib/supabaseProducts';

type LinkMode = 'shop' | 'product' | 'external';

const PRODUCT_PATH_PATTERN = /^\/(?:shop\/products|products|product)\/(.+)$/i;

function detectMode(linkUrl: string): LinkMode {
  const value = linkUrl.trim();
  if (PRODUCT_PATH_PATTERN.test(value)) return 'product';
  if (/^https?:\/\//i.test(value)) return 'external';
  return 'shop';
}

function productKeyFromLink(linkUrl: string): string | null {
  const match = linkUrl.trim().match(PRODUCT_PATH_PATTERN);
  return match ? decodeURIComponent(match[1]) : null;
}

const MODE_OPTIONS: Array<{ id: LinkMode; label: string; icon: React.ReactNode }> = [
  { id: 'shop', label: 'Shop page', icon: <Store className="h-3.5 w-3.5" /> },
  { id: 'product', label: 'Product', icon: <Search className="h-3.5 w-3.5" /> },
  { id: 'external', label: 'External link', icon: <ExternalLink className="h-3.5 w-3.5" /> },
];

/**
 * Structured banner link editor. Internal product links are always built from the
 * product's immutable id via getPathForProduct — the admin picks a product, never types a path.
 */
export const BannerLinkPicker: React.FC<{
  value: string;
  onChange: (linkUrl: string) => void;
}> = ({ value, onChange }) => {
  const mode = detectMode(value);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mode !== 'product' || products || loadFailed) return;
    let active = true;
    void loadAdminProducts()
      .then((rows) => {
        if (!active) return;
        setProducts(rows);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [mode, products, loadFailed]);

  const selectedKey = mode === 'product' ? productKeyFromLink(value) : null;
  const selectedProduct = useMemo(
    () => (products && selectedKey
      ? products.find((item) => item.id === selectedKey || item.slug === selectedKey) || null
      : null),
    [products, selectedKey],
  );

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.slug.toLowerCase().includes(needle) ||
        item.categoryLabel.toLowerCase().includes(needle),
    );
  }, [products, query]);

  const setMode = (next: LinkMode) => {
    if (next === mode) return;
    if (next === 'shop') onChange('/shop');
    if (next === 'product') onChange('');
    if (next === 'external') onChange('https://');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
      {/* Mode switcher */}
      <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200" role="tablist" aria-label="Banner link destination">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={mode === option.id}
            onClick={() => setMode(option.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10.5px] font-bold transition-colors ${
              mode === option.id
                ? 'bg-[#D9232D] text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        {mode === 'shop' && (
          <p className="text-[10.5px] leading-relaxed text-slate-500">
            The banner button opens the shop tab with the full catalog.
          </p>
        )}

        {mode === 'external' && (
          <label className="block text-[10.5px] font-bold text-slate-600">
            Website URL
            <input
              type="url"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://example.com/page"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal"
            />
            <span className="mt-1 block text-[10px] font-normal text-slate-400">
              Opens in a new tab. Must start with https://
            </span>
          </label>
        )}

        {mode === 'product' && (
          <div>
            {selectedProduct ? (
              /* Selected product summary */
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
                <img
                  src={selectedProduct.image}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-bold text-slate-800">{selectedProduct.title}</p>
                  <p className="truncate font-mono text-[10px] text-slate-500">
                    {getPathForProduct(selectedProduct.id)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  aria-label="Clear selected product"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search products by name or category…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-normal"
                    aria-label="Search products"
                  />
                </div>
                <div ref={listRef} className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {loadFailed ? (
                    <p className="p-3 text-[10.5px] text-slate-500">
                      Could not load products. Check your connection and try again.
                    </p>
                  ) : products === null ? (
                    <div className="flex items-center justify-center gap-2 p-4 text-[10.5px] font-bold text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading products…
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <p className="p-3 text-[10.5px] text-slate-500">No products match “{query}”.</p>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => onChange(getPathForProduct(product.id))}
                        className="flex w-full items-center gap-2.5 border-b border-slate-100 p-2 text-left transition-colors last:border-b-0 hover:bg-red-50/60"
                      >
                        <img
                          src={product.image}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-bold text-slate-800">
                            {product.title}
                          </span>
                          <span className="block truncate text-[10px] font-normal text-slate-400">
                            {product.categoryLabel} · ₹{product.price.toLocaleString('en-IN')}
                          </span>
                        </span>
                        <Check className="h-3.5 w-3.5 shrink-0 text-transparent" aria-hidden="true" />
                      </button>
                    ))
                  )}
                </div>
                <p className="mt-1.5 text-[10px] font-normal text-slate-400">
                  Pick a product — its link is built automatically from the product ID.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Resolved destination */}
      {mode !== 'product' && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Opens</span>
          <span className="truncate font-mono text-[10.5px] text-slate-600">
            {value.trim() || '—'}
          </span>
        </div>
      )}
    </div>
  );
};
