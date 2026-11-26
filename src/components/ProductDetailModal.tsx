import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
  Star,
  Store,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { CartItem, Product } from '../types';
import { VignetteBarBackdrop, VignettePageCurtain } from './VignetteBarBackdrop';
import {
  createDefaultCartItem,
  getCartItemUnitPrice,
  hasMatchingCartItem,
  MAX_ORDER_ITEM_QUANTITY,
  resolveStitchPatternSelection,
} from '../lib/cart';
import { getProductAvailability, isProductSellable } from '../lib/productAvailability';
import { useProductGuaranteeDate } from '../lib/productGuarantee';
import { GuaranteeTerms } from './GuaranteeTerms';
import { ProductReviews } from './ProductReviews';
import { BottomSheet } from './BottomSheet';
import { PRODUCT_IMAGE_ZOOM_TRANSITION, PRODUCT_IMAGE_ZOOM_VARIANTS } from './ProductCard';
import { getProductBadgeInfo, ProductCornerRibbon } from './ProductCornerRibbon';
import { CartBadge } from './CartBadge';
import { getColorDetails } from '../lib/productColors';
import { getBrandInitials, getBrandLogoUrl } from '../lib/brandLogos';
import { getPathForProduct } from '../lib/appRoutes';
import {
  getCachedVehicleModels,
  loadVehicleModels,
  VEHICLE_CATALOG_CHANGED_EVENT,
  type VehicleCatalogModel,
  type VehicleCatalogType,
} from '../lib/supabaseVehicleCatalog';
import { subscribePullToRefresh } from '../lib/pullToRefresh';

export interface ProductSharePayload {
  title: string;
  text: string;
  url: string;
}

export function buildProductSharePayload(
  product: Pick<Product, 'id' | 'title' | 'price'>,
  unitPrice?: number,
  origin?: string,
): ProductSharePayload {
  const effectivePrice =
    typeof unitPrice === 'number' && Number.isFinite(unitPrice) ? unitPrice : product.price;
  const formattedPrice = `₹${Number(effectivePrice || 0).toLocaleString('en-IN')}`;
  const productPath = getPathForProduct(product.id);
  const resolvedOrigin =
    origin ??
    (typeof window !== 'undefined' &&
    window.location?.origin &&
    window.location.origin !== 'null'
      ? window.location.origin
      : '');
  const url = resolvedOrigin
    ? `${resolvedOrigin.replace(/\/$/, '')}${productPath}`
    : typeof window !== 'undefined' && window.location?.href
      ? window.location.href
      : productPath;

  return {
    title: product.title,
    text: `Check out ${product.title} for ${formattedPrice} at Rofik Godi Centre`,
    url,
  };
}

export async function shareProductDetails(
  payload: ProductSharePayload,
  nav: {
    share?: (data: ShareData) => Promise<void>;
    clipboard?: { writeText?: (text: string) => Promise<void> };
  } | undefined = typeof navigator !== 'undefined' ? navigator : undefined,
): Promise<'shared' | 'copied' | 'cancelled' | 'unsupported'> {
  if (typeof nav?.share === 'function') {
    try {
      await nav.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall through to clipboard when Web Share is blocked or unavailable in the current context.
    }
  }

  if (typeof nav?.clipboard?.writeText === 'function') {
    try {
      await nav.clipboard.writeText(`${payload.text}\n${payload.url}`);
      return 'copied';
    } catch {
      return 'unsupported';
    }
  }

  return 'unsupported';
}

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
  const { product } = props;

  if (!product) return null;

  // The colour is part of the key so opening the same product with a different
  // ?color= deep link re-initialises the selection.
  return (
    <div className="fixed inset-0 z-[60] flex w-full max-w-full flex-col overflow-hidden overflow-x-hidden bg-[#F8FAFC] bg-[radial-gradient(circle_at_12%_8%,_rgba(217,35,45,0.11),_transparent_40%),radial-gradient(circle_at_88%_12%,_rgba(56,189,248,0.11),_transparent_42%),radial-gradient(circle_at_50%_78%,_rgba(148,163,184,0.12),_transparent_52%)] text-slate-900">
      <ProductDetailPage
        key={`${product.id}:${props.initialColorName ?? ''}`}
        {...props}
        product={product}
      />
    </div>
  );
};

interface InternalProductDetailPageProps extends ProductDetailModalProps {
  product: Product;
}

const ProductDetailPage: React.FC<InternalProductDetailPageProps> = ({
  product,
  products,
  onSelectProduct,
  onClose,
  onAddToCart,
  cartItems = [],
  isWishlisted,
  onToggleWishlist,
  cartCount = 0,
  onOpenCart,
  onOpenSearch,
  onBuyNow,
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
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'shared' | 'copied'>('idle');
  const shareTimerRef = useRef<number | null>(null);
  const [heartPulseKey, setHeartPulseKey] = useState(0);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(shareTimerRef.current);
      }
    };
  }, []);

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
    if (images.length > 1) {
      const canAdvance =
        (deltaX < 0 && activeImageIndex < images.length - 1) ||
        (deltaX > 0 && activeImageIndex > 0);
      if (canAdvance) {
        setActiveImageIndex((current) =>
          Math.max(0, Math.min(images.length - 1, current + (deltaX < 0 ? 1 : -1))),
        );
      }
    }
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
    const refresh = () =>
      loadVehicleModels().then(({ data }) => {
        if (active) setCatalog(data);
      });
    void refresh();
    const unsubscribePtr = subscribePullToRefresh(refresh);
    window.addEventListener(VEHICLE_CATALOG_CHANGED_EVENT, refresh);
    return () => {
      active = false;
      unsubscribePtr();
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
  const [colorPreviewHighlight, setColorPreviewHighlight] = useState(false);
  const notifyRequestLock = useRef(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const gallerySectionRef = useRef<HTMLElement | null>(null);
  const colorHighlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (colorHighlightTimerRef.current !== null) {
        window.clearTimeout(colorHighlightTimerRef.current);
      }
    };
  }, []);

  const scrollToProductImage = () => {
    const container = scrollContainerRef.current;
    const gallery = gallerySectionRef.current;
    if (!gallery) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    if (container && typeof container.scrollTo === 'function') {
      const containerRect = container.getBoundingClientRect();
      const galleryRect = gallery.getBoundingClientRect();
      const isGalleryFullyVisible =
        galleryRect.top >= containerRect.top - 4 &&
        galleryRect.bottom <= containerRect.bottom + 4;

      if (!isGalleryFullyVisible) {
        const targetTop = Math.max(
          0,
          container.scrollTop + (galleryRect.top - containerRect.top) - 12,
        );
        container.scrollTo({ top: targetTop, behavior });
      }
    } else if (typeof gallery.scrollIntoView === 'function') {
      gallery.scrollIntoView({ behavior, block: 'start' });
    }
  };

  const handleSelectColor = (color: Product['colors'][number]) => {
    setSelectedColor(color);
    setActiveImageIndex(0);
    setColorPreviewHighlight(true);
    if (colorHighlightTimerRef.current !== null) {
      window.clearTimeout(colorHighlightTimerRef.current);
    }
    if (typeof window !== 'undefined') {
      colorHighlightTimerRef.current = window.setTimeout(() => {
        setColorPreviewHighlight(false);
      }, 700);
    }
    scrollToProductImage();
  };

  const normalizedEmbroidery = product.isCustomizable
    ? customEmbroideryText.trim().slice(0, MAX_EMBROIDERY_CHARS)
    : '';
  const unitPrice = getCartItemUnitPrice(product, selectedThickness, normalizedEmbroidery);
  const totalPrice = unitPrice * quantity;
  const availability = getProductAvailability(product);
  const sellable = isProductSellable(product);
  const guaranteeInfo = useProductGuaranteeDate(
    product.id,
    product.slug,
    product.guaranteeValidUntil,
  );

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
    const payload = buildProductSharePayload(product, unitPrice);
    const result = await shareProductDetails(payload);
    if (result === 'shared' || result === 'copied') {
      setShareFeedback(result);
      if (shareTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(shareTimerRef.current);
      }
      if (typeof window !== 'undefined') {
        shareTimerRef.current = window.setTimeout(() => {
          setShareFeedback('idle');
          shareTimerRef.current = null;
        }, 2000);
      }
    }
  };

  const suggested = products.filter((item) => item.id !== product.id).slice(0, 4);

  const scrollToSection = (targetId: string, offset = 20) => {
    const container = scrollContainerRef.current;
    const el =
      typeof document !== 'undefined'
        ? (document.getElementById(targetId) ||
            document.querySelector(`[data-testid="${targetId}"]`))
        : null;
    if (!el) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
    if (container && typeof container.scrollTo === 'function') {
      const containerRect = container.getBoundingClientRect();
      const targetRect = el.getBoundingClientRect();
      const top = Math.max(0, container.scrollTop + (targetRect.top - containerRect.top) - offset);
      container.scrollTo({ top, behavior });
    } else if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior, block: 'start' });
    }
  };

  const focusEmbroideryInput = () => {
    scrollToSection('pdp-custom-embroidery', 110);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        const input = document.getElementById('pdp-custom-embroidery') as HTMLInputElement | null;
        input?.focus();
      }, 220);
    }
  };

  const defaultThickness = product.thicknessOptions[0] || { label: 'Standard', extraPrice: 0 };
  const defaultStitch = resolveStitchPatternSelection(details.stitchPatterns);
  const hasCustomizations =
    selectedThickness.label !== defaultThickness.label ||
    Boolean(normalizedEmbroidery) ||
    Boolean(selectedModel) ||
    (Boolean(selectedStitch) && selectedStitch !== defaultStitch) ||
    quantity > 1;

  const resetCustomizations = () => {
    setSelectedThickness(defaultThickness);
    setSelectedStitch(defaultStitch);
    setCustomEmbroideryText('');
    setSelectedModel('');
    setQuantity(1);
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
      Icon: CircleCheck,
      accent: 'bg-slate-100 text-slate-700',
      helper: 'What makes it special',
    },
    compatibility: {
      Icon: CarFront,
      accent: 'bg-slate-100 text-slate-700',
      helper: 'Fits these vehicles',
    },
    materials: {
      Icon: Layers3,
      accent: 'bg-slate-100 text-slate-700',
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
      <div className="relative flex min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden">
        {/* Edge-to-Edge Vignette Top Sticky Header */}
        <header
          data-testid="pdp-classic-glass-topbar"
          className="relative isolate z-30 shrink-0 overflow-hidden bg-[#090808] pt-[env(safe-area-inset-top)]"
        >
          <VignetteBarBackdrop variant="top" />
          <div className="relative z-10 mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-3.5 sm:px-5">
            {/* Left: Frosted Glass Back Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Go back"
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition-all duration-180 hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.25] transition-transform duration-180 group-hover:-translate-x-0.5" />
            </button>

            {/* Right: Frosted Glass Action Controls */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                data-testid="pdp-header-share-btn"
                aria-label={`Share ${product.title}`}
                onClick={() => void shareProduct()}
                className={`inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-bold backdrop-blur-md transition-all duration-180 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  shareFeedback !== 'idle'
                    ? 'border-emerald-300/60 bg-emerald-500/25 text-emerald-100'
                    : 'border-white/18 bg-white/14 text-white hover:bg-white/22'
                }`}
              >
                {shareFeedback !== 'idle' ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-300" />
                    <span className="text-[11px] font-extrabold text-emerald-100">
                      {shareFeedback === 'shared' ? 'Shared' : 'Copied'}
                    </span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 shrink-0" />
                    <span className="hidden text-[11px] font-bold sm:inline">Share</span>
                  </>
                )}
              </button>

              {onOpenSearch && (
                <button
                  type="button"
                  aria-label="Search products"
                  onClick={onOpenSearch}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition-all duration-180 hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
                >
                  <Search className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                aria-label={`Open cart, ${cartCount} items`}
                onClick={onOpenCart}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/14 text-white backdrop-blur-md transition-all duration-180 hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
              >
                <ShoppingCart className="h-4 w-4" />
                <CartBadge
                  count={cartCount}
                  className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full border-2 border-[#181412] bg-[#D9232D] px-1 text-[9.5px] font-extrabold text-white shadow-xs tabular-nums"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Storefront Canvas */}
        <motion.main
          ref={scrollContainerRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          aria-label={`${product.title} product details`}
          className="product-scroll relative -mt-px min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#F8FAFC]"
        >
          <VignettePageCurtain className="h-[220px] sm:h-[250px]" />
          <div className="relative z-10 mx-auto w-full max-w-5xl space-y-4 px-3.5 pb-6 pt-3.5 sm:px-5 lg:space-y-5 lg:py-5">
            {/* Desktop Split Grid: Sticky Classic Glass Gallery + Contiguous Purchase Module */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-6">
              {/* Left Gallery Column */}
              <section
                ref={gallerySectionRef}
                aria-label="Product gallery"
                className="mx-auto w-full max-w-[448px] lg:sticky lg:top-5 lg:col-span-6 lg:max-w-[468px]"
              >
                <div
                  className={`classic-glass rounded-[26px] bg-gradient-to-b from-white/84 via-white/74 to-white/68 p-2.5 shadow-[0_22px_48px_-26px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.96)] transition-all duration-300 sm:p-3 ${
                    colorPreviewHighlight
                      ? 'ring-2 ring-[#D9232D]/45 shadow-[0_20px_44px_-18px_rgba(217,35,45,0.22)]'
                      : ''
                  }`}
                >
                  {/* Studio Image Stage */}
                  <div
                    data-gallery-carousel="true"
                    className="group relative aspect-square w-full touch-pan-y overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_50%_42%,_#ffffff_0%,_#f1f4f8_68%,_#e6ebf2_100%)] ring-1 ring-slate-900/[0.05]"
                    onTouchStart={handleGalleryTouchStart}
                    onTouchEnd={handleGalleryTouchEnd}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.img
                        key={images[activeImageIndex] ?? product.image}
                        src={images[activeImageIndex] ?? product.image}
                        alt={product.title}
                        initial={{ opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.985 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => setIsLightboxOpen(true)}
                        className="h-full w-full cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-[1.018]"
                        onError={(event) => {
                          event.currentTarget.src = product.image;
                        }}
                      />
                    </AnimatePresence>

                    {/* Top-Left Frosted Image Counter */}
                    <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center rounded-full border border-white/25 bg-slate-950/55 px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-white shadow-xs backdrop-blur-md tabular-nums">
                      {activeImageIndex + 1} / {images.length}
                    </span>

                    {/* Top-Right Floating Classic Glass Actions: Like & Zoom */}
                    <div
                      data-testid="pdp-gallery-floating-actions"
                      className="absolute right-2.5 top-2.5 z-10 flex flex-col items-center gap-2"
                    >
                      <button
                        type="button"
                        data-testid="pdp-gallery-like-btn"
                        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        aria-pressed={isWishlisted}
                        onClick={() => {
                          if (!isWishlisted) {
                            setHeartPulseKey((key) => key + 1);
                          }
                          onToggleWishlist(product);
                        }}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-180 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                          isWishlisted
                            ? 'border-rose-200/95 bg-rose-50/92 text-[#D9232D] shadow-[0_8px_20px_-6px_rgba(217,35,45,0.38),inset_0_1px_0_rgba(255,255,255,0.95)]'
                            : 'border-white/95 bg-white/82 text-slate-700 shadow-[0_8px_20px_-8px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.96)] hover:bg-white hover:text-[#D9232D]'
                        }`}
                      >
                        <Heart
                          key={heartPulseKey}
                          className={`h-4.5 w-4.5 shrink-0 ${
                            isWishlisted ? 'wishlist-heartbeat fill-[#D9232D] text-[#D9232D]' : ''
                          }`}
                        />
                        <span className="sr-only">{isWishlisted ? 'Liked' : 'Like'}</span>
                      </button>

                      <button
                        type="button"
                        data-testid="pdp-gallery-zoom-btn"
                        aria-label="Zoom product image"
                        onClick={() => setIsLightboxOpen(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/95 bg-white/82 text-slate-700 shadow-[0_8px_20px_-8px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-md transition-all duration-180 hover:bg-white hover:text-[#D9232D] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
                      >
                        <Expand className="h-4 w-4 shrink-0" />
                        <span className="sr-only">Zoom</span>
                      </button>
                    </div>

                    {/* Desktop Left/Right Classic Glass Gallery Arrows */}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          aria-label="Previous image"
                          disabled={activeImageIndex === 0}
                          onClick={() => setActiveImageIndex((idx) => Math.max(0, idx - 1))}
                          className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/90 bg-white/82 text-slate-800 shadow-[0_8px_20px_-8px_rgba(15,23,42,0.28)] backdrop-blur-md transition hover:bg-white hover:text-[#D9232D] disabled:opacity-30 lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
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
                          className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/90 bg-white/82 text-slate-800 shadow-[0_8px_20px_-8px_rgba(15,23,42,0.28)] backdrop-blur-md transition hover:bg-white hover:text-[#D9232D] disabled:opacity-30 lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                        >
                          <ChevronRight className="h-4.5 w-4.5" />
                        </button>
                      </>
                    )}

                    {/* Bottom Interactive Frosted Glass Controls: Dots & Jump-to-Color Chip */}
                    <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2">
                      {images.length > 1 ? (
                        <div
                          role="group"
                          aria-label="Gallery image indicators"
                          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/25 bg-slate-950/45 px-2 py-1.5 backdrop-blur-md"
                        >
                          {images.map((_, index) => (
                            <button
                              key={index}
                              type="button"
                              aria-label={`View image ${index + 1} of ${images.length}`}
                              aria-current={activeImageIndex === index ? 'true' : undefined}
                              onClick={() => setActiveImageIndex(index)}
                              className={`h-1.5 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white ${
                                activeImageIndex === index
                                  ? 'w-4.5 bg-white'
                                  : 'w-1.5 bg-white/50 hover:bg-white/80'
                              }`}
                            />
                          ))}
                        </div>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        onClick={() => scrollToSection('pdp-color-section', 18)}
                        aria-label={`Selected finish ${selectedColor.name}. Tap to change color`}
                        className="pointer-events-auto inline-flex max-w-[60%] items-center gap-1.5 rounded-full border border-white/90 bg-white/82 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-[0_6px_16px_-6px_rgba(15,23,42,0.2)] backdrop-blur-md transition-all duration-180 hover:bg-white hover:text-[#D9232D] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D]"
                      >
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-slate-900/20"
                          style={{ backgroundColor: selectedColor.hex }}
                        />
                        <span className="truncate">{selectedColor.name}</span>
                        {product.colors.length > 1 && (
                          <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Compact Centered Frosted Glass Thumbnail Rail */}
                  {images.length > 1 && (
                    <div
                      className={`mt-1.5 flex items-center gap-2.5 overflow-x-auto no-scrollbar px-2 py-2 ${
                        images.length <= 4 ? 'justify-center' : 'justify-start sm:justify-center'
                      }`}
                    >
                      {images.map((image, index) => {
                        const isActiveThumb = activeImageIndex === index;
                        return (
                          <button
                            type="button"
                            key={`${image}-${index}`}
                            onClick={() => setActiveImageIndex(index)}
                            aria-label={`View product image ${index + 1}`}
                            aria-current={isActiveThumb ? 'true' : undefined}
                            className={`relative h-14 w-14 shrink-0 rounded-2xl p-[2px] backdrop-blur-sm transition-all duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] sm:h-15 sm:w-15 ${
                              isActiveThumb
                                ? 'border-2 border-[#D9232D] bg-white shadow-[0_6px_16px_-6px_rgba(217,35,45,0.42)] opacity-100'
                                : 'border border-slate-200/80 bg-white/80 opacity-75 shadow-2xs hover:border-slate-300 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={image}
                              alt=""
                              className="h-full w-full rounded-[12px] bg-slate-100 object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Right Column: Contiguous Classic Glass Purchase & Customization Module */}
              <section
                aria-label="Configure and buy product"
                className="lg:col-span-6"
              >
                <div className="classic-glass space-y-4 rounded-[26px] bg-gradient-to-br from-white/86 via-white/76 to-white/66 p-4 shadow-[0_22px_48px_-26px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.96)] sm:p-5">
                  {/* Product Identity & Interactive Rating */}
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-500">
                      <span className="font-extrabold uppercase tracking-wider text-[#D9232D]">
                        {product.categoryLabel || 'Bike Covers'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => scrollToSection('pdp-section-reviews', 16)}
                        className="inline-flex items-center gap-1 text-slate-700 transition-colors hover:text-[#D9232D] focus-visible:outline-none focus-visible:underline tabular-nums"
                      >
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <strong>{reviewsValue}</strong>
                        <span className="text-slate-500">({product.reviewCount} reviews)</span>
                      </button>
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
                            <Droplets className="h-3 w-3 text-sky-600" />
                            Waterproof
                          </span>
                        </>
                      )}
                    </div>

                    <h1 className="mt-1.5 text-xl font-black leading-tight tracking-tight text-slate-950 [text-wrap:balance] sm:text-2xl">
                      {product.title}
                    </h1>
                    {details.subtitle && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-[13px]">
                        {details.subtitle}
                      </p>
                    )}

                    {/* Frosted Classic Glass Live Pricing & Availability */}
                    <div className="mt-3.5 rounded-2xl border border-white/95 bg-white/65 p-3.5 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                          <strong className="text-[26px] font-black leading-none tracking-tight text-slate-950 tabular-nums">
                            ₹{totalPrice}
                          </strong>
                          {savings > 0 && (
                            <>
                              <span className="text-xs font-medium text-slate-400 line-through tabular-nums sm:text-sm">
                                ₹{displayOriginalTotal}
                              </span>
                              <span className="text-[11px] font-extrabold text-[#D9232D] tabular-nums">
                                Save ₹{savings} ({discount}% OFF)
                              </span>
                            </>
                          )}
                        </div>
                        {(quantity > 1 || optionExtraPerUnit > 0) && (
                          <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                            ₹{unitPrice} / cover
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/50 pt-2 text-[11px]">
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
                        <span className="font-medium text-slate-500">
                          Free workshop fitment
                        </span>
                      </div>
                    </div>

                    {guaranteeInfo && (
                      <button
                        type="button"
                        onClick={() => scrollToSection('product-guarantee-terms', 16)}
                        className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/65 px-3.5 py-2 text-left text-[11px] font-semibold text-emerald-800 backdrop-blur-sm transition hover:bg-emerald-50/90"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>
                            Guarantee valid until{' '}
                            <strong className="font-extrabold">
                              {guaranteeInfo.validUntilLabel}
                            </strong>
                          </span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      </button>
                    )}

                    {/* Live Configuration Summary & Quick Reset Flow */}
                    <div
                      data-testid="pdp-live-config-summary"
                      className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600"
                    >
                      <p className="min-w-0 truncate font-medium">
                        <span className="font-bold text-slate-900">{selectedColor.name}</span>
                        {product.thicknessOptions.length > 0 && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>{selectedThickness.label}</span>
                          </>
                        )}
                        {selectedStitch && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>{selectedStitch}</span>
                          </>
                        )}
                        {normalizedEmbroidery && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="font-bold text-[#D9232D]">
                              “{normalizedEmbroidery}”
                            </span>
                          </>
                        )}
                        {selectedModel && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="font-semibold text-emerald-700">{selectedModel}</span>
                          </>
                        )}
                      </p>
                      {hasCustomizations && (
                        <button
                          type="button"
                          onClick={resetCustomizations}
                          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#D9232D] hover:underline focus-visible:outline-none focus-visible:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1. Color Swatches */}
                  <div id="pdp-color-section" className="border-t border-slate-200/60 pt-3.5">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <h2 className="text-xs font-extrabold text-slate-900">Color Finish</h2>
                      <span className="text-[11px] font-semibold text-slate-500">
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
                            onClick={() => handleSelectColor(color)}
                            className="group min-w-0 text-center focus-visible:outline-none"
                          >
                            <span
                              className={`relative mx-auto block aspect-square w-full overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-sm transition-all duration-180 ${
                                isSelected
                                  ? 'border-[#D9232D] ring-2 ring-[#D9232D]/25 shadow-[0_8px_18px_-8px_rgba(217,35,45,0.4)]'
                                  : 'border-white/90 shadow-2xs group-hover:-translate-y-0.5 group-hover:border-slate-300'
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
                              {isSelected && (
                                <span className="absolute left-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#D9232D] text-white shadow-xs">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </span>
                              )}
                            </span>
                            <span
                              className={`mt-1.5 block truncate text-[10.5px] leading-tight ${
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
                    <div className="border-t border-slate-200/60 pt-3.5">
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <h2 className="text-xs font-extrabold text-slate-900">
                          Foam Thickness &amp; Cushioning
                        </h2>
                        <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
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
                              className={`flex min-h-11 w-full items-center justify-between gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left backdrop-blur-sm transition-all duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                                isSelected
                                  ? 'border-[#D9232D]/70 bg-rose-50/70 text-slate-950 shadow-[0_6px_16px_-10px_rgba(217,35,45,0.35),inset_0_1px_0_rgba(255,255,255,0.9)]'
                                  : 'border-white/90 bg-white/70 text-slate-700 shadow-[0_4px_12px_-10px_rgba(15,23,42,0.18)] hover:border-slate-300/80 hover:bg-white/90'
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                <span
                                  aria-hidden="true"
                                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${
                                    isSelected
                                      ? 'border-[#D9232D] bg-[#D9232D] text-white'
                                      : 'border-slate-300 bg-white/80'
                                  }`}
                                >
                                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </span>
                                <span className="text-xs font-bold leading-snug">{option.label}</span>
                              </span>
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
                    <div className="border-t border-slate-200/60 pt-3.5">
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <h2 className="text-xs font-extrabold text-slate-900">Stitch Pattern</h2>
                        {selectedStitch && (
                          <span className="text-[11px] font-semibold text-slate-500">
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
                              className={`inline-flex min-h-10 items-center gap-1.5 rounded-2xl border px-3.5 text-xs font-bold backdrop-blur-sm transition-all duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                                isSelected
                                  ? 'border-[#D9232D]/70 bg-rose-50/80 text-[#D9232D] shadow-[0_6px_14px_-8px_rgba(217,35,45,0.35)]'
                                  : 'border-white/90 bg-white/70 text-slate-700 shadow-2xs hover:border-slate-300/80 hover:bg-white/90'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <Scissors className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span>{pattern}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Custom Name Embroidery Input + Live Stitch Crest Preview */}
                  {product.isCustomizable && (
                    <div className="border-t border-slate-200/60 pt-3.5">
                      <div className="rounded-2xl border border-white/90 bg-white/65 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md">
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
                            className="min-h-11 w-full rounded-xl border border-slate-200/90 bg-white/90 pl-3.5 pr-10 text-base font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-rose-100 sm:text-sm"
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
                          <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-3.5 py-2.5 text-white shadow-inner">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold text-slate-400">
                                Stitch crest preview (+₹150 added)
                              </p>
                              <p className="mt-0.5 truncate text-sm font-black uppercase tracking-[0.2em] text-white">
                                {normalizedEmbroidery}
                              </p>
                            </div>
                            <Scissors className="h-4 w-4 shrink-0 text-rose-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 5. Vehicle Type & Model Fitment Check */}
                  {(compatibleTypes.length > 1 || modelOptions.length > 0) && (
                    <div className="space-y-2.5 border-t border-slate-200/60 pt-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xs font-extrabold text-slate-900">
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
                        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/85 bg-slate-200/40 p-1 backdrop-blur-sm">
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
                                className={`flex min-h-9.5 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all duration-180 ${
                                  vehicleType === type
                                    ? 'border border-rose-200/80 bg-white text-[#D9232D] shadow-xs'
                                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
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
                            className="min-h-11 w-full appearance-none rounded-2xl border border-white/95 bg-white/85 pl-10 pr-9 text-base font-medium text-slate-700 shadow-2xs outline-none backdrop-blur-sm transition focus:border-[#D9232D] focus:bg-white focus:ring-2 focus:ring-rose-100 sm:text-sm"
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
                          <Bike className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#D9232D]" />
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        </label>
                      )}

                      {selectedModel && (
                        <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/75 px-3.5 py-2 text-xs font-semibold text-emerald-800 backdrop-blur-sm">
                          <span className="flex items-center gap-2">
                            <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>Verified workshop fit for {selectedModel}.</span>
                          </span>
                          <button
                            type="button"
                            aria-label="Clear selected vehicle"
                            onClick={() => setSelectedModel('')}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. Classic Glass Quantity Stepper & Desktop Action Bar */}
                  <div className="space-y-3.5 border-t border-slate-200/60 pt-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-xs font-extrabold text-slate-900">Quantity</span>
                        <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                          Total ₹{totalPrice}
                        </span>
                      </div>
                      <div className="inline-flex items-center rounded-2xl border border-white/90 bg-slate-200/45 p-1 backdrop-blur-sm">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/85 text-slate-700 shadow-2xs transition hover:bg-white hover:text-[#D9232D] disabled:opacity-35"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-9 text-center text-xs font-black text-slate-950 tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={quantity >= MAX_ORDER_ITEM_QUANTITY}
                          onClick={() =>
                            setQuantity((q) => Math.min(MAX_ORDER_ITEM_QUANTITY, q + 1))
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/85 text-slate-700 shadow-2xs transition hover:bg-white hover:text-[#D9232D] disabled:opacity-35"
                        >
                          <Plus className="h-3.5 w-3.5" />
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
                            className="flex min-h-11.5 items-center justify-center gap-2 rounded-2xl border border-[#D9232D]/85 bg-white/85 px-4 text-xs font-extrabold text-[#D9232D] shadow-[0_6px_18px_-10px_rgba(217,35,45,0.28)] backdrop-blur-sm transition-all duration-180 hover:bg-rose-50/90 active:scale-[0.98]"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span>
                              {isSelectedConfigurationInCart ? 'Go to Cart' : 'Add to Cart'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => addToCart(true)}
                            className="banner-cta-shine group/cta flex min-h-11.5 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-4 text-xs font-extrabold text-white shadow-[0_12px_26px_-10px_rgba(217,35,45,0.52)] transition-all duration-180 hover:brightness-105 active:scale-[0.98]"
                          >
                            <Zap className="h-4 w-4 fill-current transition-transform duration-180 group-hover/cta:translate-x-0.5" />
                            <span>Buy Now</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={!onNotifyMe || notifySubmitting}
                          onClick={() => void handleNotifyMe(product)}
                          aria-label="Notify me when this product is back in stock"
                          className="banner-cta-shine group/cta col-span-2 flex min-h-11.5 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] to-[#B91822] px-4 text-xs font-extrabold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
              {/* Left Info Column: Highlights Cards, Description & Embroidery Details */}
              <div className="space-y-4 lg:col-span-7">
                <section
                  id="pdp-section-description"
                  aria-labelledby="pdp-heading-description"
                  className="classic-glass rounded-[24px] bg-white/76 p-4 shadow-[0_16px_38px_-24px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-5"
                >
                  <div className="mb-3">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#D9232D]">
                      At a glance
                    </p>
                    <h2
                      id="pdp-heading-description"
                      className="mt-0.5 text-base font-extrabold tracking-tight text-slate-950"
                    >
                      Build Highlights &amp; Materials
                    </h2>
                  </div>

                  {(['features', 'compatibility', 'materials', 'stitchPatterns'] as const).some(
                    (key) => details[key].length > 0,
                  ) && (
                    <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(['features', 'compatibility', 'materials', 'stitchPatterns'] as const).map(
                        (key) => {
                          if (!details[key].length) return null;
                          const { Icon, accent, helper } = detailMeta[key];
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setDetailSheet(key)}
                              className="group flex min-h-[72px] items-start gap-2.5 rounded-2xl border border-white/90 bg-white/65 p-3 text-left shadow-[0_4px_14px_-10px_rgba(15,23,42,0.14)] backdrop-blur-sm transition-all duration-180 hover:border-rose-200/70 hover:bg-white/95 active:scale-[0.99]"
                            >
                              <span
                                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accent}`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <b className="block text-xs font-extrabold leading-tight text-slate-900">
                                  {sheetLabels[key]}
                                </b>
                                <span className="mt-0.5 block text-[10.5px] font-medium text-slate-400">
                                  {helper}
                                </span>
                                <span className="mt-1 block truncate text-[11px] leading-tight text-slate-600">
                                  {key === 'stitchPatterns' && selectedStitch
                                    ? selectedStitch
                                    : preview(details[key])}
                                </span>
                              </span>
                              <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#D9232D]" />
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-200/60 pt-3.5">
                    <h3 className="text-sm font-extrabold text-slate-950">Description</h3>
                    <p
                      className={`mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-[13px] ${
                        descriptionOpen ? '' : 'line-clamp-4'
                      }`}
                    >
                      {product.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => setDescriptionOpen((open) => !open)}
                      className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-white/95 bg-white/80 px-3 text-xs font-extrabold text-slate-800 shadow-2xs backdrop-blur-sm transition hover:bg-white hover:text-[#D9232D]"
                    >
                      <span>{descriptionOpen ? 'Read less' : 'Read more'}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition ${descriptionOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                </section>

                {/* Conditional Product-Specific Guarantee & Replacement Terms */}
                <GuaranteeTerms
                  variant="compact"
                  productId={product.id}
                  productSlug={product.slug}
                  guaranteeDate={product.guaranteeValidUntil}
                />

                {/* Dedicated Embroidery & Craft Details Section */}
                <section
                  id="pdp-section-embroidery"
                  aria-labelledby="pdp-heading-embroidery"
                  className="classic-glass rounded-[24px] bg-white/76 p-4 shadow-[0_16px_38px_-24px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2.5">
                    <div>
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#D9232D]">
                        Workshop craft
                      </p>
                      <h2
                        id="pdp-heading-embroidery"
                        className="mt-0.5 text-base font-extrabold tracking-tight text-slate-950"
                      >
                        Embroidery Details
                      </h2>
                    </div>
                    {product.isCustomizable && (
                      <button
                        type="button"
                        onClick={focusEmbroideryInput}
                        className="inline-flex min-h-9.5 items-center gap-1.5 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3 text-xs font-extrabold text-[#D9232D] backdrop-blur-sm transition hover:bg-rose-100/80"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                        <span>{normalizedEmbroidery ? 'Edit text above' : 'Add embroidery'}</span>
                      </button>
                    )}
                  </div>

                  <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/90 bg-white/65 p-3.5 backdrop-blur-sm">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-slate-500">
                        Thread &amp; Stitch Finish
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">
                        Stitched with UV-stable high-tensile nylon thread using{' '}
                        <strong className="text-slate-900">
                          {selectedStitch || details.stitchPatterns[0] || 'Double Lockstitch'}
                        </strong>{' '}
                        reinforcement so seams hold cleanly through daily rain and sun.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/90 bg-white/65 p-3.5 backdrop-blur-sm">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-slate-500">
                        {product.isCustomizable ? 'Custom Name Spec (+₹150)' : 'Signature Emblem'}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">
                        {product.isCustomizable
                          ? `Supports up to ${MAX_EMBROIDERY_CHARS} uppercase characters embroidered across the rear rider crest before workshop fitment.`
                          : 'Finished with our factory-embroidered crest and double-piped edges ready for immediate fitment.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-200/60 bg-rose-50/60 px-3.5 py-2.5 text-xs backdrop-blur-sm">
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
              <div className="space-y-4 lg:col-span-5">
                <section
                  id="pdp-section-specifications"
                  aria-labelledby="pdp-heading-specifications"
                  className="classic-glass rounded-[24px] bg-white/76 p-4 shadow-[0_16px_38px_-24px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-5"
                >
                  <div className="mb-2.5">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#D9232D]">
                      Technical breakdown
                    </p>
                    <h2
                      id="pdp-heading-specifications"
                      className="mt-0.5 text-base font-extrabold tracking-tight text-slate-950"
                    >
                      Specifications
                    </h2>
                  </div>

                  <div className="divide-y divide-slate-200/60 border-t border-slate-200/60">
                    {(
                      [
                        ['Material', details.materials.join(', ')],
                        ['Waterproof', product.isWaterproof ? 'Yes' : 'Breathable'],
                        ['Suitable For', details.compatibility.join(', ')],
                        ['Package Includes', details.packageIncludes.join(', ')],
                        ['Installation', details.installation],
                        [
                          'Guarantee',
                          guaranteeInfo
                            ? `Valid until ${guaranteeInfo.validUntilLabel} (Normal-use replacement)`
                            : '',
                        ],
                      ] as const
                    )
                      .filter(([, value]) => value.trim().length > 0)
                      .map(([label, value]) => (
                        <div
                          key={label}
                          className="grid grid-cols-[24px_minmax(72px,0.7fr)_minmax(0,1.3fr)] items-start gap-2.5 py-2.5 text-xs"
                        >
                          <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-lg border border-white/90 bg-white/75 text-slate-500 shadow-2xs">
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
                  className="classic-glass divide-y divide-slate-200/60 rounded-[24px] bg-gradient-to-br from-rose-50/70 via-white/78 to-white/72 px-4 py-2 shadow-[0_16px_38px_-24px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.95)]"
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
                    ...(guaranteeInfo
                      ? [
                          [
                            ShieldCheck,
                            `Product Replacement Guarantee (${guaranteeInfo.validUntilLabel})`,
                            `Valid until ${guaranteeInfo.validUntilLabel}: natural splitting, seam tearing or rexine peeling under normal use is replaced. Cat/animal scratches, blade cuts, fire burns & intentional damage are excluded.`,
                          ] as const,
                        ]
                      : []),
                    [
                      ShieldCheck,
                      'Razorpay Online or Pay at Workshop',
                      'Secure digital UPI/cards or settle directly at counter pickup',
                    ],
                  ].map(([Icon, title, detail]) => {
                    const TrustIcon = Icon as React.ComponentType<{ className?: string }>;
                    return (
                      <div key={title as string} className="flex items-start gap-3 py-3">
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-rose-200/70 bg-rose-50/85 text-[#D9232D]">
                          <TrustIcon className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">
                            {title as string}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
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
              className="classic-glass overflow-hidden rounded-[24px] bg-white/76 shadow-[0_16px_38px_-24px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.95)]"
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
                className="classic-glass rounded-[24px] bg-white/76 p-4 shadow-[0_16px_38px_-24px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#D9232D]">
                      Workshop picks
                    </p>
                    <h2 className="mt-0.5 text-base font-extrabold tracking-tight text-slate-950">
                      You may also like
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

        {/* Classic Glass Mobile Sticky Bottom Action Bar */}
        <footer className="classic-glass z-40 shrink-0 border-x-0 border-b-0 border-t border-white/90 bg-white/76 px-3.5 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] backdrop-blur-2xl shadow-[0_-14px_34px_-14px_rgba(15,23,42,0.16)] lg:hidden">
          {sellable ? (
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <div className="min-w-0 max-w-[30%] pr-1">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-[15px] font-black leading-none text-slate-950 tabular-nums">
                    ₹{totalPrice}
                  </p>
                  {savings > 0 && (
                    <span className="text-[10px] font-medium text-slate-400 line-through tabular-nums">
                      ₹{displayOriginalTotal}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[10px] font-semibold text-slate-500 tabular-nums">
                  {selectedColor.name} · {quantity} {quantity === 1 ? 'item' : 'items'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isSelectedConfigurationInCart) onOpenCart?.();
                  else addToCart(false);
                }}
                aria-label={isSelectedConfigurationInCart ? 'Go to Cart' : 'Add to cart'}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#D9232D]/85 bg-white/85 px-3 text-xs font-extrabold text-[#D9232D] shadow-[0_6px_16px_-10px_rgba(217,35,45,0.3)] backdrop-blur-sm transition-all duration-180 hover:bg-rose-50/90 active:scale-[0.98]"
              >
                <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {isSelectedConfigurationInCart ? 'Go to Cart' : 'Add to Cart'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => addToCart(true)}
                className="banner-cta-shine group/cta flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] px-3 text-xs font-extrabold text-white shadow-[0_10px_22px_-6px_rgba(217,35,45,0.46)] transition-all duration-180 hover:brightness-105 active:scale-[0.97]"
              >
                <Zap className="h-3.5 w-3.5 shrink-0 fill-current transition-transform duration-180 group-hover/cta:translate-x-0.5" />
                <span className="truncate">Buy Now</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!onNotifyMe || notifySubmitting}
              onClick={() => void handleNotifyMe(product)}
              aria-label="Notify me when this product is back in stock"
              className="banner-cta-shine group/cta flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] to-[#B91822] text-xs font-extrabold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.97] disabled:opacity-50"
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

        {/* Fullscreen Dark Glass Image Lightbox with Swipe & Thumbnails */}
        {isLightboxOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${product.title} enlarged gallery`}
            className="fixed inset-0 z-[80] flex flex-col bg-slate-950/92 p-4 text-white backdrop-blur-xl"
          >
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-100 backdrop-blur-md tabular-nums">
                <span>
                  {activeImageIndex + 1} / {images.length}
                </span>
                <span aria-hidden="true" className="text-white/40">
                  ·
                </span>
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-white/50"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <span>{selectedColor.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Close zoomed image"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/12 text-white backdrop-blur-md transition hover:bg-white/25"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div
              className="relative mx-auto flex min-h-0 w-full max-w-4xl flex-1 touch-pan-y items-center justify-center py-4"
              onTouchStart={handleGalleryTouchStart}
              onTouchEnd={handleGalleryTouchEnd}
            >
              <img
                src={images[activeImageIndex] ?? product.image}
                alt={product.title}
                className="max-h-full max-w-full rounded-3xl object-contain shadow-2xl"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous zoomed image"
                    disabled={activeImageIndex === 0}
                    onClick={() => setActiveImageIndex((idx) => Math.max(0, idx - 1))}
                    className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/12 text-white backdrop-blur-md transition hover:bg-white/25 disabled:opacity-30"
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
                    className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/12 text-white backdrop-blur-md transition hover:bg-white/25 disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mx-auto flex w-full max-w-4xl items-center justify-center gap-2.5 overflow-x-auto no-scrollbar px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
                {images.map((image, index) => {
                  const isActive = activeImageIndex === index;
                  return (
                    <button
                      key={`lightbox-${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`Zoom image ${index + 1}`}
                      className={`h-14 w-14 shrink-0 rounded-2xl p-[2px] transition-all duration-180 ${
                        isActive
                          ? 'border-2 border-[#D9232D] bg-white opacity-100 shadow-[0_6px_16px_-4px_rgba(217,35,45,0.5)]'
                          : 'border border-white/25 bg-white/10 opacity-60 hover:opacity-95'
                      }`}
                    >
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full rounded-[12px] object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
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
  const badgeInfo = getProductBadgeInfo(product);
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.article
      initial="rest"
      animate="rest"
      whileHover={shouldReduceMotion ? undefined : 'hover'}
      className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/90 bg-white/80 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.14)] backdrop-blur-md transition hover:border-rose-200/80 hover:bg-white"
    >
      {badgeInfo && (
        <ProductCornerRibbon
          label={badgeInfo.label}
          gradientClass={badgeInfo.gradientClass}
          size="sm"
        />
      )}
      <button
        type="button"
        onClick={onSelect}
        className="block aspect-square w-full overflow-hidden bg-slate-100"
      >
        <motion.img
          src={localProductImages[product.id]?.[0] ?? product.image}
          alt={product.title}
          variants={PRODUCT_IMAGE_ZOOM_VARIANTS}
          transition={PRODUCT_IMAGE_ZOOM_TRANSITION}
          className="h-full w-full object-cover will-change-transform"
        />
      </button>
      <div className="flex flex-1 flex-col justify-between p-2.5">
        <div>
          <button
            type="button"
            onClick={onSelect}
            className="line-clamp-2 block text-left text-[11.5px] font-extrabold leading-snug text-slate-900 hover:text-[#D9232D] sm:text-xs"
          >
            {product.title}
          </button>
          <p className="mt-0.5 line-clamp-1 text-[10.5px] leading-snug text-slate-500">
            {product.subtitle}
          </p>
        </div>

        <div className="mt-2">
          <p
            className={`text-[9.5px] font-bold ${
              availability.state === 'out-of-stock' ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {availability.label}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[13px] font-black text-slate-950 tabular-nums sm:text-sm">
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
              className={`grid min-h-9 ${
                !isProductSellable(product) && !isInCart
                  ? 'min-w-[68px] px-2 text-[10px] font-extrabold'
                  : 'min-w-9'
              } place-items-center rounded-xl text-white transition active:scale-95 ${
                isInCart ? 'bg-emerald-600' : 'bg-[#D9232D] hover:bg-[#B91822]'
              }`}
            >
              {isInCart ? (
                <ShoppingCart className="h-3.5 w-3.5" />
              ) : isProductSellable(product) ? (
                <Plus className="h-3.5 w-3.5" />
              ) : notifySubmitting ? (
                'Wait…'
              ) : (
                'Notify me'
              )}
            </button>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-amber-500 tabular-nums">
            <Star className="h-3 w-3 fill-current" />
            <span className="text-slate-700">{product.rating}</span>
            <span className="text-slate-400">({product.reviewCount})</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
