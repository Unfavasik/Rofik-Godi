import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ExternalLink, Loader2, Search, Store, X } from 'lucide-react';
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
  // Colour deep links look like /shop/products/<id>?color=Red — the key is the
  // path portion only.
  const match = linkUrl.trim().split('?')[0].match(PRODUCT_PATH_PATTERN);
  return match ? decodeURIComponent(match[1]) : null;
}

function colorNameFromLink(linkUrl: string): string | null {
  const search = linkUrl.trim().split('?')[1];
  return search ? new URLSearchParams(search).get('color') : null;
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
  // Mode is held in state: clearing a product link sets the value to '', which
  // detectMode() would classify as "shop" and snap the tab back mid-edit.
  const [mode, setMode] = useState<LinkMode>(() => detectMode(value));
  useEffect(() => {
    const next = detectMode(value);
    // Only follow the value when it clearly points at another mode; an empty
    // value stays in the current mode so the product search remains visible.
    if (value.trim() && next !== mode) setMode(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState('');
  // Product awaiting a colour choice: products with several colours get a
  // second step where the admin picks which colour the banner opens.
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
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

  const switchMode = (next: LinkMode) => {
    if (next === mode) return;
    setMode(next);
    setPendingProduct(null);
    if (next === 'shop') onChange('/shop');
    if (next === 'product') onChange('');
    if (next === 'external') onChange('https://');
  };

  const handleProductTap = (product: Product) => {
    if ((product.colors?.length ?? 0) > 1) {
      setPendingProduct(product);
      return;
    }
    onChange(getPathForProduct(product.id));
  };

  const handleColorTap = (product: Product, colorName: string) => {
    setPendingProduct(null);
    onChange(`${getPathForProduct(product.id)}?color=${encodeURIComponent(colorName)}`);
  };

  const selectedColorName = mode === 'product' ? colorNameFromLink(value) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
      {/* Mode switcher */}
      <div className="flex flex-wrap sm:flex-nowrap gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200" role="tablist" aria-label="Banner link destination">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={mode === option.id}
            onClick={() => switchMode(option.id)}
            className={`flex min-h-10 min-w-[90px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
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
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base sm:text-xs font-normal"
            />
            <span className="mt-1 block text-[10px] font-normal text-slate-400">
              Opens in a new tab. Must start with https://
            </span>
          </label>
        )}

        {mode === 'product' && (
          <div>
            {pendingProduct ? (
              /* Colour chooser — second step for multi-colour products */
              <div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
                  <button
                    type="button"
                    onClick={() => setPendingProduct(null)}
                    aria-label="Back to product list"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <img
                    src={pendingProduct.image}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-slate-800">{pendingProduct.title}</p>
                    <p className="text-[10px] font-normal text-slate-400">Choose a colour for the banner link</p>
                  </div>
                </div>
                <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {pendingProduct.colors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => handleColorTap(pendingProduct, color.name)}
                      className="flex min-h-11 w-full items-center gap-2.5 border-b border-slate-100 p-2 text-left transition-colors last:border-b-0 hover:bg-red-50/60"
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full ring-1 ring-slate-200"
                        style={{ backgroundColor: color.hex }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-800">
                        {color.name}
                      </span>
                      <Check className="h-3.5 w-3.5 shrink-0 text-transparent" aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] font-normal text-slate-400">
                  The banner opens this product with the chosen colour preselected.
                </p>
              </div>
            ) : selectedProduct ? (
              /* Selected product summary */
              <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
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
                  {selectedColorName && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full ring-1 ring-slate-300"
                        style={{
                          backgroundColor:
                            selectedProduct.colors?.find((color) => color.name === selectedColorName)?.hex || '#cbd5e1',
                        }}
                        aria-hidden="true"
                      />
                      {selectedColorName}
                    </p>
                  )}
                </div>
                {(selectedProduct.colors?.length ?? 0) > 1 && (
                  <button
                    type="button"
                    onClick={() => setPendingProduct(selectedProduct)}
                    className="min-h-10 shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-[#D9232D] ring-1 ring-emerald-200"
                  >
                    Change colour
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange('')}
                  aria-label="Clear selected product"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
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
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base sm:text-xs font-normal"
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
                        onClick={() => handleProductTap(product)}
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
                  Pick a product — products with several colours ask for a colour next.
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
