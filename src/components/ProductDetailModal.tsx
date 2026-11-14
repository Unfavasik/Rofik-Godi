import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bike,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Droplets,
  Expand,
  Heart,
  Layers3,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  Scissors,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { CartItem, Product } from '../types';
import {
  createDefaultCartItem,
  getCartItemUnitPrice,
  hasMatchingCartItem,
  MAX_ORDER_ITEM_QUANTITY,
  resolveStitchPatternSelection,
} from '../lib/cart';
import { getProductAvailability, isProductSellable } from '../lib/productAvailability';
import { ProductReviews } from './ProductReviews';
import { BottomSheet } from './BottomSheet';
import { getColorDetails } from '../lib/productColors';
import { getBrandInitials, getBrandLogoUrl } from '../lib/brandLogos';
import {
  getCachedVehicleModels,
  loadVehicleModels,
  VEHICLE_CATALOG_CHANGED_EVENT,
  type VehicleCatalogModel,
  type VehicleCatalogType,
} from '../lib/supabaseVehicleCatalog';

interface ProductDetailModalProps {
  products: Product[];
  product: Product | null;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    selectedColor: Product['colors'][number],
    selectedStitch: string,
    selectedThickness: { label: string; extraPrice: number },
    customEmbroideryText?: string,
    quantity?: number,
  ) => void;
  cartItems?: CartItem[];
  isWishlisted: boolean;
  onToggleWishlist: (p: Product) => void;
  cartCount?: number;
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
  onBuyNow?: (
    product: Product,
    selectedColor: Product['colors'][number],
    selectedStitch: string,
    selectedThickness: { label: string; extraPrice: number },
    quantity: number,
    customEmbroideryText?: string,
  ) => void;
  onSelectProduct?: (p: Product) => void;
  onQuickAdd?: (p: Product) => void;
  onNotifyMe?: (p: Product) => void | Promise<void>;
  isAuthenticated?: boolean;
  customerId?: string;
  onRequestLogin?: () => void;
  onOpenOrderHistory?: (orderNumber?: string) => void;
  /** Colour name from a deep link (?color=…) to preselect when the page opens. */
  initialColorName?: string;
}

const localProductImages: Record<string, string[]> = {
  'rg-prod-01': [
    '/images/premium-seat-cover-hero.webp',
    '/images/premium-seat-gallery-02.webp',
    '/images/premium-seat-gallery-03.webp',
    '/images/premium-seat-gallery-04.webp',
    '/images/premium-seat-gallery-05.webp',
  ],
};

const MAX_EMBROIDERY_CHARS = 12;

export const ProductDetailModal: React.FC<ProductDetailModalProps> = (props) => {
  if (!props.product) return null;
  // The colour is part of the key so opening the same product with a different
  // ?color= deep link re-initialises the selection.
  return (
    <ProductDetailPage
      key={`${props.product.id}:${props.initialColorName ?? ''}`}
      {...props}
      product={props.product}
    />
  );
};

const ProductDetailPage: React.FC<ProductDetailModalProps & { product: Product }> = ({
  product,
  products,
  onClose,
  onAddToCart,
  cartItems = [],
  isWishlisted,
  onToggleWishlist,
  cartCount = 0,
  onOpenCart,
  onOpenSearch,
  onBuyNow,
  onSelectProduct,
  onQuickAdd,
  onNotifyMe,
  isAuthenticated = false,
  customerId,
  onRequestLogin,
  onOpenOrderHistory,
  initialColorName,
}) => {
  const [selectedColor, setSelectedColor] = useState(
    () =>
      (initialColorName
        ? product.colors?.find((color) => color.name === initialColorName)
        : null) ||
      product.colors?.[0] || {
        name: 'Standard',
        hex: '#111827',
        bgClass: 'bg-slate-900',
        images: [],
      },
  );
  const defaultImages = useMemo(() => {
    const curated = localProductImages[product.id];
    return curated?.length ? curated : [product.image, ...(product.additionalImages ?? [])];
  }, [product]);
  const images = useMemo(() => {
    const colorImages = selectedColor.images?.filter(Boolean) ?? [];
    return colorImages.length ? colorImages : defaultImages;
  }, [defaultImages, selectedColor]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [heartPulseKey, setHeartPulseKey] = useState(0);

  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const handleGalleryTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    swipeStartX.current = event.touches[0]?.clientX ?? null;
    swipeStartY.current = event.touches[0]?.clientY ?? null;
  };
  const handleGalleryTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const deltaX = event.changedTouches[0]?.clientX - swipeStartX.current;
    const deltaY = event.changedTouches[0]?.clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    setActiveImageIndex((current) =>
      Math.max(0, Math.min(images.length - 1, current + (deltaX < 0 ? 1 : -1))),
    );
  };

  useEffect(() => {
    product.colors
      .flatMap((color) => color.images || [])
      .filter(Boolean)
      .forEach((src) => {
        const image = new Image();
        image.src = src;
      });
  }, [product.colors]);

  useEffect(() => {
    setActiveImageIndex((current) => Math.min(current, Math.max(0, images.length - 1)));
  }, [images.length]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLightboxOpen(false);
      else if (event.key === 'ArrowRight') {
        setActiveImageIndex((current) => Math.min(images.length - 1, current + 1));
      } else if (event.key === 'ArrowLeft') {
        setActiveImageIndex((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [images.length, isLightboxOpen]);

  const details = useMemo(() => getColorDetails(product, selectedColor), [product, selectedColor]);
  const [selectedStitch, setSelectedStitch] = useState<string | undefined>(() =>
    resolveStitchPatternSelection(details.stitchPatterns),
  );
  const [detailSheet, setDetailSheet] = useState<
    'features' | 'compatibility' | 'materials' | 'stitchPatterns' | null
  >(null);
  const [selectedThickness, setSelectedThickness] = useState(
    () => product.thicknessOptions[0] || { label: 'Standard', extraPrice: 0 },
  );
  const [customEmbroideryText, setCustomEmbroideryText] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [vehicleType, setVehicleType] = useState<VehicleCatalogType | ''>('');
  const [selectedModel, setSelectedModel] = useState('');
  const [catalog, setCatalog] = useState<VehicleCatalogModel[]>(getCachedVehicleModels());

  useEffect(() => {
    let active = true;
    void loadVehicleModels().then(({ data }) => {
      if (active) setCatalog(data);
    });
    const refresh = () =>
      void loadVehicleModels().then(({ data }) => {
        if (active) setCatalog(data);
      });
    window.addEventListener(VEHICLE_CATALOG_CHANGED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(VEHICLE_CATALOG_CHANGED_EVENT, refresh);
    };
  }, []);

  const catalogTypeByModel = useMemo(
    () => new Map(catalog.map((model) => [model.name, model.type])),
    [catalog],
  );
  // Vehicle types this product (or the selected colour) actually fits, derived
  // from its compatible model list instead of a hardcoded global selector.
  const compatibleTypes = useMemo(() => {
    const types = new Set<VehicleCatalogType>();
    details.compatibility.forEach((name) => {
      const type = catalogTypeByModel.get(name);
      if (type) types.add(type);
    });
    return Array.from(types);
  }, [details.compatibility, catalogTypeByModel]);

  useEffect(() => {
    setSelectedStitch(resolveStitchPatternSelection(details.stitchPatterns));
    setSelectedModel('');
    setVehicleType((current) =>
      current && compatibleTypes.includes(current) ? current : compatibleTypes[0] || '',
    );
  }, [selectedColor, details.stitchPatterns, compatibleTypes]);

  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const notifyRequestLock = useRef(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const normalizedEmbroidery = product.isCustomizable
    ? customEmbroideryText.trim().slice(0, MAX_EMBROIDERY_CHARS)
    : '';
  const unitPrice = getCartItemUnitPrice(product, selectedThickness, normalizedEmbroidery);
  const totalPrice = unitPrice * quantity;
  const availability = getProductAvailability(product);
  const sellable = isProductSellable(product);

  const handleNotifyMe = async (target: Product) => {
    if (notifyRequestLock.current || !onNotifyMe) return;
    notifyRequestLock.current = true;
    setNotifySubmitting(true);
    try {
      await onNotifyMe(target);
    } catch (error) {
      console.error('Could not set up the stock alert.', error);
    } finally {
      notifyRequestLock.current = false;
      setNotifySubmitting(false);
    }
  };

  const isSelectedConfigurationInCart = hasMatchingCartItem(cartItems, {
    cartItemId: `selected-${product.id}`,
    product,
    quantity,
    selectedColor,
    selectedStitch,
    selectedThickness,
    customEmbroideryText: normalizedEmbroidery || undefined,
    unitPrice,
  });

  const baseOriginalPrice = product.id === 'rg-prod-01' ? 699 : product.originalPrice;
  const optionExtraPerUnit = Math.max(0, unitPrice - product.price);
  const displayOriginalUnitPrice = Math.max(baseOriginalPrice + optionExtraPerUnit, unitPrice);
  const displayOriginalTotal = displayOriginalUnitPrice * quantity;
  const savings = Math.max(0, displayOriginalTotal - totalPrice);
  const discount =
    displayOriginalTotal > 0 ? Math.round((savings / displayOriginalTotal) * 100) : 0;

  const addToCart = (buyNow = false) => {
    if (!sellable) return;
    if (buyNow) {
      onBuyNow?.(
        product,
        selectedColor,
        selectedStitch || '',
        selectedThickness,
        quantity,
        normalizedEmbroidery || undefined,
      );
      return;
    }
    onAddToCart(
      product,
      selectedColor,
      selectedStitch || '',
      selectedThickness,
      normalizedEmbroidery || undefined,
      quantity,
    );
  };

  const shareProduct = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, url: window.location.href });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedShareLink(true);
        window.setTimeout(() => setCopiedShareLink(false), 2000);
      }
    } catch {
      // The share sheet can be dismissed without changing page state.
    }
  };

  const suggested = products.filter((item) => item.id !== product.id).slice(0, 4);

  const focusEmbroideryInput = () => {
    const container = scrollContainerRef.current;
    const input =
      typeof document !== 'undefined'
        ? (document.getElementById('pdp-custom-embroidery') as HTMLInputElement | null)
        : null;
    if (!input) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const top = Math.max(0, container.scrollTop + (inputRect.top - containerRect.top) - 110);
      container.scrollTo({ top, behavior });
    } else {
      input.scrollIntoView({ behavior, block: 'center' });
    }
    window.setTimeout(() => input.focus(), 220);
  };
  const reviewsValue = (product.rating ?? 4.8).toFixed(1);
  // Only filter by the chosen vehicle type when this product fits more than
  // one type; models missing from the catalog stay visible for every type.
  const modelOptions =
    compatibleTypes.length > 1
      ? details.compatibility.filter((name) => {
          const type = catalogTypeByModel.get(name);
          return !type || type === vehicleType;
        })
      : details.compatibility;

  const sheetLabels = {
    features: 'Features',
    compatibility: 'Compatible vehicles',
    materials: 'Materials',
    stitchPatterns: 'Stitch patterns',
  } as const;
  const detailMeta = {
    features: {
      Icon: Sparkles,
      accent: 'bg-amber-50 text-amber-600',
      helper: 'What makes it special',
    },
    compatibility: {
      Icon: CarFront,
      accent: 'bg-blue-50 text-blue-600',
      helper: 'Fits these vehicles',
    },
    materials: {
      Icon: Layers3,
      accent: 'bg-emerald-50 text-emerald-600',
      helper: 'Build and finish',
    },
    stitchPatterns: {
      Icon: Scissors,
      accent: 'bg-rose-50 text-[#D9232D]',
      helper: 'Choose your style',
    },
  } as const;

  const preview = (items: string[]) =>
    items.slice(0, 2).join(' · ') + (items.length > 2 ? ` +${items.length - 2} more` : '');

  const compatibleCatalogModels = useMemo(() => {
    const names = new Set(details.compatibility);
    return catalog
      .filter((model) => names.has(model.name))
      .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
  }, [catalog, details.compatibility]);

  const compatibleModelGroups = useMemo(() => {
    const byBrand = new Map<string, VehicleCatalogModel[]>();
    compatibleCatalogModels.forEach((model) => {
      const models = byBrand.get(model.brand) || [];
      models.push(model);
      byBrand.set(model.brand, models);
    });
    return Array.from(byBrand.entries()).map(([brand, models]) => ({ brand, models }));
  }, [compatibleCatalogModels]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex w-full max-w-full flex-col overflow-hidden overflow-x-hidden bg-[#F8FAFC] text-slate-900">
        {/* Top Sticky Header */}
        <header className="z-30 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Go back"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 transition-colors hover:bg-rose-50 hover:text-[#D9232D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] active:scale-95"
              >
                <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-xs font-black tracking-wide text-[#D9232D]">
                  ROFIK GODI CENTRE
                </p>
                <p className="hidden truncate text-[11px] font-medium text-slate-500 sm:block">
                  {product.categoryLabel || 'Seat Covers'} · {product.title}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Share product"
                onClick={() => void shareProduct()}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white px-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
              >
                {copiedShareLink ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </button>

              {onOpenSearch && (
                <button
                  type="button"
                  aria-label="Search products"
                  onClick={onOpenSearch}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}

              <button
                type="button"
                aria-label={`Open cart, ${cartCount} items`}
                onClick={onOpenCart}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#D9232D] px-1 text-[10px] font-extrabold text-white tabular-nums shadow-xs">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Storefront Canvas */}
        <motion.main
          ref={scrollContainerRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          aria-label={`${product.title} product details`}
          className="product-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        >
          <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-8 pt-4 sm:px-6 lg:py-7">
            {/* Desktop Split Grid: Sticky Left Gallery + Contiguous Right Purchase Module */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
              {/* Left Gallery Column */}
              <section
                aria-label="Product gallery"
                className="space-y-3 lg:sticky lg:top-6 lg:col-span-7"
              >
                <div className="rounded-3xl border border-slate-200/80 bg-white p-2.5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.14)] sm:p-3.5">
                  <div
                    className="group relative aspect-square w-full touch-pan-y overflow-hidden rounded-2xl bg-slate-100"
                    onTouchStart={handleGalleryTouchStart}
                    onTouchEnd={handleGalleryTouchEnd}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.img
                        key={images[activeImageIndex] ?? product.image}
                        src={images[activeImageIndex] ?? product.image}
                        alt={product.title}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setIsLightboxOpen(true)}
                        className="h-full w-full cursor-zoom-in object-cover"
                        onError={(event) => {
                          event.currentTarget.src = product.image;
                        }}
                      />
                    </AnimatePresence>

                    {/* Desktop Left/Right Gallery Arrows (hover-revealed to keep image clear) */}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          aria-label="Previous image"
                          disabled={activeImageIndex === 0}
                          onClick={() => setActiveImageIndex((idx) => Math.max(0, idx - 1))}
                          className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm backdrop-blur-xs transition hover:bg-white disabled:opacity-30 lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                        >
                          <ChevronLeft className="h-4.5 w-4.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Next image"
                          disabled={activeImageIndex === images.length - 1}
                          onClick={() =>
                            setActiveImageIndex((idx) => Math.min(images.length - 1, idx + 1))
                          }
                          className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm backdrop-blur-xs transition hover:bg-white disabled:opacity-30 lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                        >
                          <ChevronRight className="h-4.5 w-4.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Clean Gallery Utility Bar (keeps product image 100% unobstructed) */}
                  <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 items-center rounded-xl bg-slate-100 px-2.5 text-[11px] font-extrabold text-slate-600 tabular-nums">
                        {activeImageIndex + 1} / {images.length}
                      </span>
                      <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">
                        Tap photo to expand
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        aria-pressed={isWishlisted}
                        onClick={() => {
                          if (!isWishlisted) {
                            setHeartPulseKey((key) => key + 1);
                          }
                          onToggleWishlist(product);
                        }}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                          isWishlisted
                            ? 'border-rose-200 bg-rose-50 text-[#D9232D]'
                            : 'border-slate-200/90 bg-slate-50/90 text-slate-700 hover:border-rose-200 hover:bg-rose-50/60 hover:text-[#D9232D]'
                        }`}
                      >
                        <Heart
                          key={heartPulseKey}
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isWishlisted ? 'wishlist-heartbeat fill-[#D9232D] text-[#D9232D]' : ''
                          }`}
                        />
                        <span>{isWishlisted ? 'Liked' : 'Like'}</span>
                      </button>

                      <button
                        type="button"
                        aria-label="Zoom product image"
                        onClick={() => setIsLightboxOpen(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
                      >
                        <Expand className="h-3.5 w-3.5 shrink-0" />
                        <span>Zoom</span>
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Rail */}
                  {images.length > 1 && (
                    <div className="mt-2.5 flex gap-2.5 overflow-x-auto no-scrollbar pb-0.5">
                      {images.map((image, index) => (
                        <button
                          type="button"
                          key={`${image}-${index}`}
                          onClick={() => setActiveImageIndex(index)}
                          aria-label={`View product image ${index + 1}`}
                          aria-current={activeImageIndex === index ? 'true' : undefined}
                          className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-100 transition sm:h-[72px] sm:w-[72px] ${
                            activeImageIndex === index
                              ? 'border-[#D9232D] ring-2 ring-rose-100'
                              : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img src={image} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Right Column: Contiguous Purchase & Customization Module */}
              <section
                aria-label="Configure and buy product"
                className="lg:col-span-5"
              >
                <div className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.16)] sm:p-6">
                  {/* Product Identity & Rating */}
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">
                      <span className="font-extrabold uppercase tracking-wider text-[#D9232D]">
                        {product.categoryLabel || 'Bike Covers'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-slate-700 tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <strong>{reviewsValue}</strong>
                        <span className="text-slate-500">({product.reviewCount} reviews)</span>
                      </span>
                      {(product.isBestseller ||
                        product.badge === 'Bestseller' ||
                        product.id === 'rg-prod-01') && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-slate-800">Bestseller</span>
                        </>
                      )}
                      {product.isWaterproof && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <Droplets className="h-3.5 w-3.5 text-sky-600" />
                            Waterproof
                          </span>
                        </>
                      )}
                    </div>

                    <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-950 [text-wrap:balance] sm:text-[26px]">
                      {product.title}
                    </h1>
                    {details.subtitle && (
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                        {details.subtitle}
                      </p>
                    )}

                    {/* Live Pricing & Availability */}
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <strong className="text-3xl font-black tracking-tight text-slate-950 tabular-nums">
                          ₹{totalPrice}
                        </strong>
                        {savings > 0 && (
                          <>
                            <span className="text-sm font-medium text-slate-400 line-through tabular-nums">
                              ₹{displayOriginalTotal}
                            </span>
                            <span className="text-xs font-extrabold text-[#D9232D] tabular-nums">
                              Save ₹{savings} ({discount}% OFF)
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <p
                          role="status"
                          className={`inline-flex items-center gap-1.5 font-bold ${
                            availability.state === 'out-of-stock'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          <CircleCheck className="h-3.5 w-3.5 shrink-0" />
                          <span>{availability.label}</span>
                        </p>
                        {(quantity > 1 || optionExtraPerUnit > 0) && (
                          <span className="font-semibold text-slate-500 tabular-nums">
                            ₹{unitPrice} per cover
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1. Color Swatches */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <h2 className="text-sm font-extrabold text-slate-900">Color Finish</h2>
                      <span className="text-xs font-semibold text-slate-500">
                        {selectedColor.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {product.colors.map((color) => {
                        const isSelected = selectedColor.name === color.name;
                        return (
                          <button
                            key={color.name}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => {
                              setSelectedColor(color);
                              setActiveImageIndex(0);
                            }}
                            className="group min-w-0 text-center focus-visible:outline-none"
                          >
                            <span
                              className={`relative mx-auto block aspect-square w-full overflow-hidden rounded-2xl border-2 bg-slate-100 transition ${
                                isSelected
                                  ? 'border-[#D9232D] ring-2 ring-rose-100'
                                  : 'border-slate-200/70 group-hover:border-slate-300'
                              }`}
                            >
                              <img
                                src={color.images?.[0] || defaultImages[0]}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              <span
                                className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs"
                                style={{ backgroundColor: color.hex }}
                              />
                            </span>
                            <span
                              className={`mt-1.5 block truncate text-[10px] leading-tight ${
                                isSelected ? 'font-bold text-[#D9232D]' : 'text-slate-600'
                              }`}
                            >
                              {color.name.replace(' & ', ' ')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Foam Thickness & Cushioning Upgrade Selector */}
                  {product.thicknessOptions.length > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <h2 className="text-sm font-extrabold text-slate-900">
                          Foam Thickness &amp; Cushioning
                        </h2>
                        <span className="text-xs font-semibold text-slate-500">
                          {selectedThickness.extraPrice > 0
                            ? `+₹${selectedThickness.extraPrice}`
                            : 'Included'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {product.thicknessOptions.map((option) => {
                          const isSelected = selectedThickness.label === option.label;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => setSelectedThickness(option)}
                              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                                isSelected
                                  ? 'border-[#D9232D] bg-rose-50/70 text-slate-950'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span className="text-xs font-bold leading-snug">{option.label}</span>
                              <span
                                className={`shrink-0 text-xs font-extrabold tabular-nums ${
                                  isSelected ? 'text-[#D9232D]' : 'text-slate-500'
                                }`}
                              >
                                {option.extraPrice > 0 ? `+₹${option.extraPrice}` : 'Base'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Inline Stitch Pattern Selector */}
                  {details.stitchPatterns.length > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <h2 className="text-sm font-extrabold text-slate-900">Stitch Pattern</h2>
                        {selectedStitch && (
                          <span className="text-xs font-semibold text-slate-500">
                            {selectedStitch}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {details.stitchPatterns.map((pattern) => {
                          const isSelected = selectedStitch === pattern;
                          return (
                            <button
                              key={pattern}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => setSelectedStitch(pattern)}
                              className={`inline-flex min-h-11 items-center gap-1.5 rounded-2xl border px-3.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                                isSelected
                                  ? 'border-[#D9232D] bg-rose-50 text-[#D9232D]'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <Scissors className="h-3.5 w-3.5 shrink-0" />
                              <span>{pattern}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Custom Name Embroidery Input */}
                  {product.isCustomizable && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="pdp-custom-embroidery"
                            className="text-xs font-extrabold text-slate-900"
                          >
                            Custom Name Embroidery (Optional · +₹150)
                          </label>
                          <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                            {normalizedEmbroidery.length}/{MAX_EMBROIDERY_CHARS}
                          </span>
                        </div>
                        <div className="relative mt-2">
                          <input
                            id="pdp-custom-embroidery"
                            type="text"
                            value={customEmbroideryText}
                            maxLength={MAX_EMBROIDERY_CHARS}
                            onChange={(event) => setCustomEmbroideryText(event.target.value)}
                            placeholder="e.g. ASIK 07 (leave blank for standard)"
                            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-11 text-base font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:ring-2 focus:ring-rose-100 sm:text-sm"
                          />
                          {customEmbroideryText && (
                            <button
                              type="button"
                              aria-label="Clear embroidery text"
                              onClick={() => setCustomEmbroideryText('')}
                              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {normalizedEmbroidery && (
                          <p className="mt-2 text-xs font-semibold text-[#D9232D]">
                            Stitch preview: &ldquo;{normalizedEmbroidery}&rdquo; (+₹150 workshop
                            embroidery added)
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 5. Vehicle Type & Model Fitment Check */}
                  {(compatibleTypes.length > 1 || modelOptions.length > 0) && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-extrabold text-slate-900">
                          Vehicle Fitment Check{' '}
                          <span className="font-medium text-slate-400">(Optional)</span>
                        </h2>
                        {details.compatibility.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setDetailSheet('compatibility')}
                            className="text-xs font-bold text-[#D9232D] hover:underline"
                          >
                            View all {details.compatibility.length}
                          </button>
                        )}
                      </div>

                      {compatibleTypes.length > 1 && (
                        <div className="grid grid-cols-2 gap-2">
                          {compatibleTypes.map((type) => {
                            const label =
                              type === 'bike' ? 'Bike' : type === 'scooter' ? 'Scooter' : 'Toto';
                            const Icon = type === 'bike' ? Bike : Zap;
                            return (
                              <button
                                key={type}
                                type="button"
                                aria-pressed={vehicleType === type}
                                onClick={() => {
                                  setVehicleType(type);
                                  setSelectedModel('');
                                }}
                                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border px-3 text-xs font-bold transition ${
                                  vehicleType === type
                                    ? 'border-[#D9232D] bg-rose-50 text-[#D9232D]'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {modelOptions.length > 0 && (
                        <label className="relative block">
                          <span className="sr-only">Choose your vehicle model</span>
                          <select
                            value={selectedModel}
                            onChange={(event) => setSelectedModel(event.target.value)}
                            className="min-h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-base font-medium text-slate-700 outline-none transition focus:border-[#D9232D] focus:ring-2 focus:ring-rose-100 sm:text-sm"
                          >
                            <option value="">
                              Choose your {vehicleType === 'scooter' ? 'scooter' : 'vehicle'} model
                            </option>
                            {modelOptions.map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                          </select>
                          <Bike className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#D9232D]" />
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        </label>
                      )}

                      {selectedModel && (
                        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                          <CircleCheck className="h-4 w-4 shrink-0" />
                          <span>Verified workshop fit for {selectedModel}.</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* 6. Quantity Stepper & Desktop Action Bar */}
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-extrabold text-slate-900">Quantity</span>
                      <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-[#F8FAFC] p-1">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-white disabled:opacity-35"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-10 text-center text-sm font-black text-slate-950 tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={quantity >= MAX_ORDER_ITEM_QUANTITY}
                          onClick={() =>
                            setQuantity((q) => Math.min(MAX_ORDER_ITEM_QUANTITY, q + 1))
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-white disabled:opacity-35"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Desktop Purchase Buttons */}
                    <div className="hidden gap-2.5 lg:grid lg:grid-cols-2">
                      {sellable ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (isSelectedConfigurationInCart) onOpenCart?.();
                              else addToCart(false);
                            }}
                            aria-label={
                              isSelectedConfigurationInCart ? 'Go to Cart' : 'Add to cart'
                            }
                            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#D9232D] bg-white px-4 text-sm font-extrabold text-[#D9232D] transition hover:bg-rose-50/70 active:scale-[0.98]"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span>
                              {isSelectedConfigurationInCart ? 'Go to Cart' : 'Add to Cart'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => addToCart(true)}
                            className="banner-cta-shine group/cta flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-4 text-sm font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(217,35,45,0.45)] transition-all hover:brightness-105 active:scale-[0.98]"
                          >
                            <Zap className="h-4 w-4 fill-current transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                            <span>Buy Now</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={!onNotifyMe || notifySubmitting}
                          onClick={() => void handleNotifyMe(product)}
                          aria-label="Notify me when this product is back in stock"
                          className="banner-cta-shine group/cta col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-4 text-sm font-extrabold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                        >
                          <Clock3
                            className={`h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5 ${
                              notifySubmitting ? 'animate-spin' : ''
                            }`}
                          />
                          {notifySubmitting ? 'Setting up…' : 'Notify me'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Below-the-Fold Storefront Information Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
              {/* Left Info Column: Highlights Cards, Description & Embroidery Details */}
              <div className="space-y-6 lg:col-span-7">
                <section
                  id="pdp-section-description"
                  aria-labelledby="pdp-heading-description"
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.12)] sm:p-6"
                >
                  <div className="mb-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#D9232D]">
                      At a glance
                    </p>
                    <h2
                      id="pdp-heading-description"
                      className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-950"
                    >
                      Build Highlights &amp; Materials
                    </h2>
                  </div>

                  {(['features', 'compatibility', 'materials', 'stitchPatterns'] as const).some(
                    (key) => details[key].length > 0,
                  ) && (
                    <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {(['features', 'compatibility', 'materials', 'stitchPatterns'] as const).map(
                        (key) => {
                          if (!details[key].length) return null;
                          const { Icon, accent, helper } = detailMeta[key];
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setDetailSheet(key)}
                              className="group flex min-h-[86px] items-start gap-3 rounded-2xl border border-slate-200/80 bg-[#F8FAFC]/60 p-3.5 text-left transition hover:border-slate-300 hover:bg-white active:scale-[0.99]"
                            >
                              <span
                                className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${accent}`}
                              >
                                <Icon className="h-[19px] w-[19px]" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <b className="block text-[13px] font-extrabold leading-tight text-slate-900">
                                  {sheetLabels[key]}
                                </b>
                                <span className="mt-1 block text-[11px] font-medium text-slate-400">
                                  {helper}
                                </span>
                                <span className="mt-1.5 block truncate text-xs leading-tight text-slate-600">
                                  {key === 'stitchPatterns' && selectedStitch
                                    ? selectedStitch
                                    : preview(details[key])}
                                </span>
                              </span>
                              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-base font-extrabold text-slate-950">Description</h3>
                    <p
                      className={`mt-2 text-sm leading-relaxed text-slate-600 ${
                        descriptionOpen ? '' : 'line-clamp-4'
                      }`}
                    >
                      {product.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDescriptionOpen((open) => !open)}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-800 transition hover:bg-slate-50"
                    >
                      <span>{descriptionOpen ? 'Read less' : 'Read more'}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition ${descriptionOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                </section>

                {/* Dedicated Embroidery & Craft Details Section */}
                <section
                  id="pdp-section-embroidery"
                  aria-labelledby="pdp-heading-embroidery"
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.12)] sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#D9232D]">
                        Workshop craft
                      </p>
                      <h2
                        id="pdp-heading-embroidery"
                        className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-950"
                      >
                        Embroidery Details
                      </h2>
                    </div>
                    {product.isCustomizable && (
                      <button
                        type="button"
                        onClick={focusEmbroideryInput}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-extrabold text-[#D9232D] transition hover:bg-rose-100/70"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                        <span>{normalizedEmbroidery ? 'Edit text above' : 'Add embroidery'}</span>
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/75 bg-[#F8FAFC] p-3.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                        Thread &amp; Stitch Finish
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                        Stitched with UV-stable high-tensile nylon thread using{' '}
                        <strong className="text-slate-900">
                          {selectedStitch || details.stitchPatterns[0] || 'Double Lockstitch'}
                        </strong>{' '}
                        reinforcement so seams hold cleanly through daily rain and sun.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200/75 bg-[#F8FAFC] p-3.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                        {product.isCustomizable ? 'Custom Name Spec (+₹150)' : 'Signature Emblem'}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                        {product.isCustomizable
                          ? `Supports up to ${MAX_EMBROIDERY_CHARS} uppercase characters embroidered across the rear rider crest before workshop fitment.`
                          : 'Finished with our factory-embroidered crest and double-piped edges ready for immediate fitment.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Scissors className="h-4 w-4 shrink-0 text-[#D9232D]" />
                      <span>
                        Selected finish:{' '}
                        <strong className="text-slate-950">
                          {selectedColor.name} · {selectedThickness.label}
                        </strong>
                      </span>
                    </div>
                    {product.isCustomizable && (
                      <span className="font-extrabold text-[#D9232D] tabular-nums">
                        {normalizedEmbroidery
                          ? `Text: “${normalizedEmbroidery}” (+₹150)`
                          : 'Standard finish (No embroidery text)'}
                      </span>
                    )}
                  </div>
                </section>
              </div>

              {/* Right Info Column: Specifications & Workshop Guarantees */}
              <div className="space-y-6 lg:col-span-5">
                <section
                  id="pdp-section-specifications"
                  aria-labelledby="pdp-heading-specifications"
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.12)] sm:p-6"
                >
                  <div className="mb-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#D9232D]">
                      Technical breakdown
                    </p>
                    <h2
                      id="pdp-heading-specifications"
                      className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-950"
                    >
                      Specifications
                    </h2>
                  </div>

                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {(
                      [
                        ['Material', details.materials.join(', ')],
                        ['Waterproof', product.isWaterproof ? 'Yes' : 'Breathable'],
                        ['Suitable For', details.compatibility.join(', ')],
                        ['Package Includes', details.packageIncludes.join(', ')],
                        ['Installation', details.installation],
                      ] as const
                    )
                      .filter(([, value]) => value.trim().length > 0)
                      .map(([label, value]) => (
                        <div
                          key={label}
                          className="grid grid-cols-[24px_minmax(72px,0.7fr)_minmax(0,1.3fr)] items-start gap-2.5 py-3 text-xs"
                        >
                          <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-lg bg-slate-100 text-slate-500">
                            {label === 'Waterproof' ? (
                              <Droplets className="h-3.5 w-3.5" />
                            ) : label === 'Installation' ? (
                              <Wrench className="h-3.5 w-3.5" />
                            ) : (
                              <PackageCheck className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <span className="min-w-0 font-semibold text-slate-500">{label}</span>
                          <span className="min-w-0 break-words text-right font-semibold leading-relaxed text-slate-800">
                            {value}
                          </span>
                        </div>
                      ))}
                  </div>
                </section>

                <section
                  aria-label="Workshop guarantees"
                  className="divide-y divide-rose-100 rounded-3xl border border-rose-100 bg-rose-50/75 px-5 py-2"
                >
                  {[
                    [
                      Store,
                      'Workshop Pickup & Free Fitment',
                      'Collect at our Berhampore workshop with complimentary on-spot fitment',
                    ],
                    [
                      RotateCcw,
                      '7-Day Defect Replacement',
                      'Unused standard covers with stitching issues replaced hassle-free',
                    ],
                    [
                      ShieldCheck,
                      'Razorpay Online or Pay at Workshop',
                      'Secure digital UPI/cards or settle directly at counter pickup',
                    ],
                  ].map(([Icon, title, detail]) => {
                    const TrustIcon = Icon as React.ComponentType<{ className?: string }>;
                    return (
                      <div key={title as string} className="flex items-start gap-3 py-3.5">
                        <TrustIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#D9232D]" />
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">
                            {title as string}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                            {detail as string}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </section>
              </div>
            </div>

            {/* Verified Customer Reviews */}
            <div
              id="pdp-section-reviews"
              className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.12)]"
            >
              <ProductReviews
                productId={product.id}
                productTitle={product.title}
                isAuthenticated={isAuthenticated}
                customerId={customerId}
                onRequestLogin={onRequestLogin || (() => undefined)}
                onOpenOrderHistory={onOpenOrderHistory}
              />
            </div>

            {/* Related Seat Covers & Accessories */}
            {suggested.length > 0 && (
              <section
                id="pdp-section-related"
                aria-label="You may also like"
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.12)] sm:p-6"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#D9232D]">
                      Workshop picks
                    </p>
                    <h2 className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-950">
                      You may also like
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                  {suggested.map((item) => (
                    <SuggestionCard
                      key={item.id}
                      product={item}
                      isInCart={hasMatchingCartItem(
                        cartItems,
                        createDefaultCartItem(item, `${item.id}-suggestion`),
                      )}
                      onAdd={() => onQuickAdd?.(item)}
                      onNotifyMe={() => onNotifyMe?.(item)}
                      onOpenCart={onOpenCart}
                      onSelect={() => onSelectProduct?.(item)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </motion.main>

        {/* Mobile Sticky Bottom Action Bar */}
        <footer className="z-40 shrink-0 border-t border-slate-200/80 bg-white/95 px-4 py-2.5 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md shadow-[0_-4px_20px_rgba(15,23,42,0.06)] lg:hidden">
          {sellable ? (
            <div className="mx-auto flex max-w-2xl items-center gap-2.5">
              <div className="min-w-0 pr-1">
                <p className="text-base font-black leading-none text-slate-950 tabular-nums">
                  ₹{totalPrice}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500 tabular-nums">
                  {quantity} {quantity === 1 ? 'item' : 'items'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isSelectedConfigurationInCart) onOpenCart?.();
                  else addToCart(false);
                }}
                aria-label={isSelectedConfigurationInCart ? 'Go to Cart' : 'Add to cart'}
                className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#D9232D] bg-white px-3 text-xs font-extrabold text-[#D9232D] active:scale-[0.98]"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {isSelectedConfigurationInCart ? 'Go to Cart' : 'Add to Cart'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => addToCart(true)}
                className="banner-cta-shine group/cta flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-3 text-xs font-extrabold text-white shadow-[0_8px_18px_-4px_rgba(217,35,45,0.38)] transition-all hover:brightness-105 active:scale-[0.97]"
              >
                <Zap className="h-4 w-4 shrink-0 fill-current transition-transform duration-200 group-hover/cta:translate-x-0.5" />
                <span className="truncate">Buy Now</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!onNotifyMe || notifySubmitting}
              onClick={() => void handleNotifyMe(product)}
              aria-label="Notify me when this product is back in stock"
              className="banner-cta-shine group/cta flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] to-[#B91822] text-sm font-extrabold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.97] disabled:opacity-50"
            >
              <Clock3
                className={`h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5 ${
                  notifySubmitting ? 'animate-spin' : ''
                }`}
              />
              {notifySubmitting ? 'Setting up…' : 'Notify me'}
            </button>
          )}
        </footer>

        {/* Extended Details Bottom Sheet */}
        <BottomSheet
          open={detailSheet !== null}
          title={detailSheet ? sheetLabels[detailSheet] : ''}
          onClose={() => setDetailSheet(null)}
        >
          {detailSheet &&
            (detailSheet === 'compatibility' ? (
              <div className="space-y-3">
                {compatibleModelGroups.length > 0 ? (
                  compatibleModelGroups.map(({ brand, models }) => {
                    const logoUrl = getBrandLogoUrl(brand);
                    return (
                      <section
                        key={brand}
                        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-3.5 py-3">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt=""
                              className="h-7 w-9 shrink-0 object-contain"
                            />
                          ) : (
                            <span className="grid h-7 w-9 shrink-0 place-items-center rounded-lg bg-[#FCEBEB] text-[9px] font-black text-[#D9232D]">
                              {getBrandInitials(brand)}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-[13px] font-extrabold text-slate-900">
                              {brand}
                            </h3>
                            <p className="text-[10px] font-medium text-slate-400">
                              {models.length} {models.length === 1 ? 'model' : 'models'} compatible
                            </p>
                          </div>
                          <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                        </div>
                        <div className="divide-y divide-slate-100">
                          {models.map((model) => (
                            <div key={model.id} className="flex items-center gap-3 px-3.5 py-2.5">
                              {model.image ? (
                                <img
                                  src={model.image}
                                  alt={`${model.brand} ${model.name}`}
                                  loading="lazy"
                                  className="h-12 w-[68px] shrink-0 rounded-xl bg-slate-50 object-cover"
                                />
                              ) : (
                                <span className="grid h-12 w-[68px] shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400">
                                  <Bike className="h-5 w-5" />
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-extrabold text-slate-800">
                                  {model.name}
                                </p>
                                <p className="mt-0.5 text-[10px] font-medium capitalize text-slate-400">
                                  {model.type}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })
                ) : (
                  <div className="space-y-2">
                    {details.compatibility.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700"
                      >
                        <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {details[detailSheet].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700"
                  >
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {detailSheet === 'stitchPatterns' ? (
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="radio"
                          name="stitch-pattern"
                          checked={selectedStitch === item}
                          onChange={() => {
                            setSelectedStitch(item);
                            setDetailSheet(null);
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    ) : (
                      <span>{item}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </BottomSheet>

        {/* Fullscreen Image Lightbox */}
        {isLightboxOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${product.title} enlarged gallery`}
            className="fixed inset-0 z-[80] flex flex-col bg-slate-950/95 p-4 text-white backdrop-blur-sm"
          >
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
              <span className="text-xs font-bold text-slate-300 tabular-nums">
                {activeImageIndex + 1} / {images.length} · {selectedColor.name}
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Close zoomed image"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mx-auto flex min-h-0 w-full max-w-4xl flex-1 items-center justify-center py-4">
              <img
                src={images[activeImageIndex] ?? product.image}
                alt={product.title}
                className="max-h-full max-w-full rounded-2xl object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous zoomed image"
                    disabled={activeImageIndex === 0}
                    onClick={() => setActiveImageIndex((idx) => Math.max(0, idx - 1))}
                    className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next zoomed image"
                    disabled={activeImageIndex === images.length - 1}
                    onClick={() =>
                      setActiveImageIndex((idx) => Math.min(images.length - 1, idx + 1))
                    }
                    className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

const SuggestionCard: React.FC<{
  product: Product;
  isInCart: boolean;
  onAdd: () => void;
  onNotifyMe?: () => void | Promise<void>;
  onOpenCart?: () => void;
  onSelect: () => void;
}> = ({ product, isInCart, onAdd, onNotifyMe, onOpenCart, onSelect }) => {
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const notifyRequestLock = useRef(false);
  const availability = getProductAvailability(product);
  const handleNotifyMe = async () => {
    if (notifyRequestLock.current || !onNotifyMe) return;
    notifyRequestLock.current = true;
    setNotifySubmitting(true);
    try {
      await onNotifyMe();
    } catch (error) {
      console.error('Could not set up the stock alert.', error);
    } finally {
      notifyRequestLock.current = false;
      setNotifySubmitting(false);
    }
  };
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_16px_-12px_rgba(15,23,42,0.1)] transition hover:border-slate-300">
      <button
        type="button"
        onClick={onSelect}
        className="block aspect-square w-full overflow-hidden bg-slate-100"
      >
        <img
          src={localProductImages[product.id]?.[0] ?? product.image}
          alt={product.title}
          className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
        />
      </button>
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <button
            type="button"
            onClick={onSelect}
            className="block text-left text-xs font-extrabold leading-snug text-slate-900 hover:text-[#D9232D] sm:text-[13px]"
          >
            {product.title}
          </button>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
            {product.subtitle}
          </p>
        </div>

        <div className="mt-3">
          <p
            className={`text-[10px] font-bold ${
              availability.state === 'out-of-stock' ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {availability.label}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-black text-slate-950 tabular-nums sm:text-base">
              ₹{product.price}{' '}
              {product.originalPrice > product.price && (
                <small className="text-[10px] font-medium text-slate-400 line-through">
                  ₹{product.originalPrice}
                </small>
              )}
            </span>
            <button
              type="button"
              disabled={
                !isProductSellable(product) && !isInCart && (!onNotifyMe || notifySubmitting)
              }
              onClick={() => {
                if (isInCart) onOpenCart?.();
                else if (isProductSellable(product)) onAdd();
                else void handleNotifyMe();
              }}
              aria-label={
                isInCart
                  ? 'Go to Cart'
                  : isProductSellable(product)
                    ? `Add ${product.title} to cart`
                    : 'Notify me when in stock'
              }
              title={
                isInCart
                  ? 'Go to Cart'
                  : isProductSellable(product)
                    ? 'Add to cart'
                    : 'Notify me'
              }
              className={`grid min-h-11 ${
                !isProductSellable(product) && !isInCart
                  ? 'min-w-[74px] px-2.5 text-[10px] font-extrabold'
                  : 'min-w-11'
              } place-items-center rounded-xl text-white transition active:scale-95 ${
                isInCart ? 'bg-emerald-600' : 'bg-[#D9232D] hover:bg-[#B91822]'
              }`}
            >
              {isInCart ? (
                <ShoppingCart className="h-4 w-4" />
              ) : isProductSellable(product) ? (
                <Plus className="h-4 w-4" />
              ) : notifySubmitting ? (
                'Wait…'
              ) : (
                'Notify me'
              )}
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-500 tabular-nums">
            <Star className="h-3 w-3 fill-current" />
            <span className="text-slate-700">{product.rating}</span>
            <span className="text-slate-400">({product.reviewCount})</span>
          </div>
        </div>
      </div>
    </article>
  );
};
