import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bike,
  CarFront,
  ChevronDown,
  CircleCheck,
  FileText,
  Clock3,
  Droplets,
  Heart,
  Layers3,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  Scissors,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import { CartItem, Product } from '../types';
import {
  createDefaultCartItem,
  hasMatchingCartItem,
  resolveStitchPatternSelection,
} from '../lib/cart';
import { getProductAvailability } from '../lib/productAvailability';
import { ProductReviews } from './ProductReviews';
import { BottomSheet } from './BottomSheet';
import { getColorDetails } from '../lib/productColors';

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
  ) => void;
  onSelectProduct?: (p: Product) => void;
  onQuickAdd?: (p: Product) => void;
  onNotifyMe?: (p: Product) => void | Promise<void>;
  isAuthenticated?: boolean;
  customerId?: string;
  onRequestLogin?: () => void;
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

export const ProductDetailModal: React.FC<ProductDetailModalProps> = (props) => {
  if (!props.product) return null;
  return <ProductDetailPage key={props.product.id} {...props} product={props.product} />;
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
}) => {
  const [selectedColor, setSelectedColor] = useState(
    () =>
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
  const details = useMemo(() => getColorDetails(product, selectedColor), [product, selectedColor]);
  const [selectedStitch, setSelectedStitch] = useState<string | undefined>(() =>
    resolveStitchPatternSelection(details.stitchPatterns),
  );
  const [detailSheet, setDetailSheet] = useState<
    'features' | 'compatibility' | 'materials' | 'stitchPatterns' | null
  >(null);
  useEffect(() => {
    setSelectedStitch(resolveStitchPatternSelection(details.stitchPatterns));
    setSelectedModel('');
  }, [selectedColor, details.stitchPatterns]);
  const [selectedThickness] = useState(
    product.thicknessOptions[0] || { label: 'Standard', extraPrice: 0 },
  );
  const [vehicleType, setVehicleType] = useState('Bike');
  const [selectedModel, setSelectedModel] = useState('');
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [quantity] = useState(1);
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const notifyRequestLock = useRef(false);
  const totalPrice = (product.price + selectedThickness.extraPrice) * quantity;
  const availability = getProductAvailability(product);
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
    quantity: 1,
    selectedColor,
    selectedStitch,
    selectedThickness,
    unitPrice: product.price,
  });
  const displayOriginalPrice = product.id === 'rg-prod-01' ? 699 : product.originalPrice;
  const savings = Math.max(0, displayOriginalPrice - product.price);
  const discount = Math.round((savings / displayOriginalPrice) * 100);

  const addToCart = (buyNow = false) => {
    if (!product.inStock) return;
    if (buyNow) {
      onBuyNow?.(product, selectedColor, selectedStitch || '', selectedThickness, quantity);
      return;
    }
    onAddToCart(
      product,
      selectedColor,
      selectedStitch || '',
      selectedThickness,
      undefined,
      quantity,
    );
  };

  const shareProduct = async () => {
    try {
      if (navigator.share)
        await navigator.share({ title: product.title, url: window.location.href });
      else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href);
    } catch {
      // The share sheet can be dismissed without changing page state.
    }
  };

  const suggested = products.filter((item) => item.id !== product.id).slice(0, 4);
  const reviewsValue = (product.rating ?? 4.8).toFixed(1);
  const modelOptions = details.compatibility;
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
      accent: 'bg-rose-50 text-[#d9232d]',
      helper: 'Choose your style',
    },
  } as const;
  const preview = (items: string[]) =>
    items.slice(0, 2).join(' · ') + (items.length > 2 ? ` +${items.length - 2} more` : '');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex justify-center bg-slate-950/55 sm:p-3">
        <motion.section
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-[#fdfdfd] text-slate-950 shadow-2xl sm:h-[calc(100dvh-24px)] sm:rounded-[28px]"
          aria-label={`${product.title} product details`}
        >
          <header className="z-30 flex h-[58px] shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="Go back"
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-[12px] font-black tracking-[.045em] text-[#d9232d]">
              ROFIK GODI CENTRE
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Search products"
                onClick={onOpenSearch}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
              >
                <Search className="h-[21px] w-[21px]" />
              </button>
              <button
                type="button"
                aria-label={`Open cart, ${cartCount} items`}
                onClick={onOpenCart}
                className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
              >
                <ShoppingCart className="h-[21px] w-[21px]" />
                {cartCount > 0 && (
                  <span className="absolute right-0 top-0 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#d9232d] px-1 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </header>

          <main className="product-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5">
            <section className="relative">
              <div
                className="relative h-[340px] touch-pan-y bg-[#f1f1f2] sm:h-[365px]"
                onTouchStart={handleGalleryTouchStart}
                onTouchEnd={handleGalleryTouchEnd}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={images[activeImageIndex] ?? product.image}
                    src={images[activeImageIndex] ?? product.image}
                    alt={product.title}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.25 }}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = product.image;
                    }}
                  />
                </AnimatePresence>
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                  <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {activeImageIndex + 1}/{images.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      onClick={() => onToggleWishlist(product)}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-900 shadow-sm backdrop-blur"
                    >
                      <Heart
                        className={`h-5 w-5 ${isWishlisted ? 'fill-[#d9232d] text-[#d9232d]' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="Share product"
                      onClick={shareProduct}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-900 shadow-sm backdrop-blur"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="-mt-1 flex gap-2 overflow-x-auto bg-white px-4 py-3 no-scrollbar">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={image}
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`View product image ${index + 1}`}
                    className={`h-[66px] w-[66px] shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 transition ${activeImageIndex === index ? 'border-[#d9232d]' : 'border-transparent'}`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </section>

            <section className="px-5 pb-4 pt-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#d9232d]">
                {product.categoryLabel || 'Bike Covers'}
              </div>
              <div className="mt-1 flex items-start justify-between gap-2">
                <h1 className="text-[21px] font-extrabold leading-[1.2] tracking-[-.035em]">
                  {product.title}
                </h1>
                {(product.isBestseller ||
                  product.badge === 'Bestseller' ||
                  product.id === 'rg-prod-01') && (
                  <span className="shrink-0 rounded-full bg-[#d9232d] px-2.5 py-1 text-[10px] font-bold text-white">
                    Bestseller
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-500">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <b className="text-slate-900">{reviewsValue}</b>
                <span>({product.reviewCount} reviews)</span>
              </div>
              {details.subtitle && (
                <p className="mt-2 text-[13px] font-medium text-slate-500">{details.subtitle}</p>
              )}
              <div className="mt-4 flex items-center gap-2.5">
                <strong className="text-[30px] font-black leading-none tracking-[-.045em]">
                  ₹{totalPrice}
                </strong>
                <span className="text-[15px] text-slate-400 line-through">
                  ₹{displayOriginalPrice}
                </span>
                <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-[#d9232d]">
                  {discount}% OFF
                </span>
              </div>
              <p
                role="status"
                className={`mt-2 text-[11px] font-bold ${availability.state === 'out-of-stock' ? 'text-amber-700' : 'text-emerald-700'}`}
              >
                {availability.label}
              </p>
              {product.isWaterproof && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700">
                  <Droplets className="h-4 w-4" />
                  Waterproof
                </div>
              )}
            </section>

            <section className="border-t border-slate-100 px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-extrabold tracking-tight">Color Options</h2>
                <span className="text-[11px] text-slate-500">{selectedColor.name}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color);
                      setActiveImageIndex(0);
                    }}
                    className="min-w-0 text-center"
                  >
                    <span
                      className={`relative mx-auto block aspect-square w-full overflow-hidden rounded-xl border-2 bg-slate-100 ${selectedColor.name === color.name ? 'border-[#d9232d]' : 'border-transparent'}`}
                    >
                      <img
                        src={color.images?.[0] || defaultImages[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <span
                        className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: color.hex }}
                      />
                    </span>
                    <span className="mt-1.5 block truncate text-[9px] leading-tight text-slate-600">
                      {color.name.replace(' & ', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="border-t border-slate-100 px-5 py-4">
              <h2 className="mb-3 text-[16px] font-extrabold tracking-tight">
                Select Vehicle Type
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Bike', Icon: Bike },
                  { label: 'Toto', Icon: Truck },
                  { label: 'Scooter', Icon: Zap },
                ].map(({ label, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setVehicleType(label);
                      setSelectedModel('');
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-bold transition ${vehicleType === label ? 'border-[#d9232d] bg-rose-50 text-[#d9232d]' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {modelOptions.length > 0 && (
              <section className="border-t border-slate-100 px-5 py-4">
                <div className="mb-2 text-[16px] font-extrabold tracking-tight">
                  Select Model{' '}
                  <span className="text-[12px] font-medium text-slate-400">(Optional)</span>
                </div>
                <label className="relative block">
                  <span className="sr-only">Choose your vehicle model</span>
                  <select
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                    className="h-[48px] w-full appearance-none rounded-xl border border-slate-200 bg-white pl-12 pr-10 text-[13px] text-slate-600"
                  >
                    <option value="">Choose your {vehicleType.toLowerCase()} model</option>
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <Bike className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#d9232d]" />
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </label>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-[11px] text-[#d9232d]">
                  <CircleCheck className="h-4 w-4 shrink-0" />
                  <span>Fits the selected compatible models.</span>
                </div>
              </section>
            )}

            {(product.subtitle ||
              (['features', 'compatibility', 'materials', 'stitchPatterns'] as const).some(
                (key) => details[key].length > 0,
              )) && (
              <section className="border-t border-slate-100 px-5 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[16px] font-extrabold tracking-tight">Product details</h2>
                    <p className="text-[10px] text-slate-500">
                      Everything you need before ordering
                    </p>
                  </div>
                </div>
                {product.subtitle && (
                  <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#d9232d]">
                      Short subtitle
                    </p>
                    <p className="mt-1 text-[13px] font-semibold leading-relaxed text-slate-700">
                      {product.subtitle}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(['features', 'compatibility', 'materials', 'stitchPatterns'] as const).map(
                    (key) => {
                      if (!details[key].length) return null;
                      const { Icon, accent, helper } = detailMeta[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDetailSheet(key)}
                          className="flex min-h-[82px] items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition active:scale-[.98]"
                        >
                          <span
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accent}`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <b className="block text-[12px] font-extrabold text-slate-900">
                              {sheetLabels[key]}
                            </b>
                            <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                              {helper}
                            </span>
                            <span className="mt-1 block truncate text-[11px] text-slate-600">
                              {key === 'stitchPatterns' && selectedStitch
                                ? selectedStitch
                                : preview(details[key])}
                            </span>
                          </span>
                          <ChevronDown className="mt-1 h-4 w-4 shrink-0 -rotate-90 text-slate-400" />
                        </button>
                      );
                    },
                  )}
                </div>
              </section>
            )}

            <section className="border-t border-slate-100 px-5 py-4">
              <h2 className="mb-2 text-[16px] font-extrabold tracking-tight">Description</h2>
              <p
                className={`text-[12px] leading-[1.6] text-slate-600 ${descriptionOpen ? '' : 'line-clamp-4'}`}
              >
                {product.description}
              </p>
              <button
                type="button"
                onClick={() => setDescriptionOpen((open) => !open)}
                className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-800"
              >
                {descriptionOpen ? 'Read less' : 'Read more'}
                <ChevronDown
                  className={`h-4 w-4 transition ${descriptionOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </section>

            <section className="border-t border-slate-100 px-5 py-4">
              <h2 className="mb-2 text-[16px] font-extrabold tracking-tight">Specifications</h2>
              <div className="divide-y divide-slate-100">
                {[
                  ['Material', details.materials.join(', ')],
                  ['Waterproof', product.isWaterproof ? 'Yes' : 'Breathable'],

                  ['Suitable For', details.compatibility.join(', ')],
                  ['Package Includes', '1 Seat Cover'],
                  ['Installation', 'Easy (DIY)'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[20px_1fr_1.15fr] items-center gap-2 py-2.5 text-[11px]"
                  >
                    <span className="text-slate-500">
                      {label === 'Waterproof' ? (
                        <Droplets className="h-3.5 w-3.5" />
                      ) : label === 'Installation' ? (
                        <Wrench className="h-3.5 w-3.5" />
                      ) : (
                        <PackageCheck className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="text-slate-500">{label}</span>
                    <span className="text-right font-medium text-slate-600">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <BottomSheet
              open={detailSheet !== null}
              title={detailSheet ? sheetLabels[detailSheet] : ''}
              onClose={() => setDetailSheet(null)}
            >
              {detailSheet && (
                <div className="space-y-2">
                  {details[detailSheet].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700"
                    >
                      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {detailSheet === 'stitchPatterns' ? (
                        <label className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="stitch-pattern"
                            checked={selectedStitch === item}
                            onChange={() => {
                              setSelectedStitch(item);
                              setDetailSheet(null);
                            }}
                          />
                          {item}
                        </label>
                      ) : (
                        <span>{item}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </BottomSheet>
            <ProductReviews
              productId={product.id}
              productTitle={product.title}
              isAuthenticated={isAuthenticated}
              customerId={customerId}
              onRequestLogin={onRequestLogin || (() => undefined)}
            />

            <section className="border-t border-slate-100 px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-extrabold tracking-tight">You may also like</h2>
                <button
                  type="button"
                  onClick={() => onSelectProduct?.(suggested[0])}
                  className="text-[12px] font-bold text-[#d9232d]"
                >
                  See all
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {suggested.slice(0, 2).map((item) => (
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

            <section className="border-t border-slate-100 px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-extrabold tracking-tight">Recently viewed</h2>
                <button type="button" className="text-[12px] font-bold text-[#d9232d]">
                  See all
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {suggested.slice(2, 4).map((item) => (
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

            <section className="mx-4 mb-5 rounded-2xl bg-rose-50 px-4 py-4">
              {[
                [Truck, 'Free Delivery', 'On orders above ₹500'],
                [RotateCcw, '7 Days Easy Return', 'Hassle free returns'],
                [ShieldCheck, 'Secure Payment', '100% secure & safe'],
              ].map(([Icon, title, detail]) => (
                <div key={title as string} className="flex items-center gap-3 py-2">
                  <Icon className="h-6 w-6 shrink-0 text-[#d9232d]" />
                  <span>
                    <b className="block text-[12px]">{title as string}</b>
                    <small className="text-[10px] text-slate-500">{detail as string}</small>
                  </span>
                </div>
              ))}
            </section>
          </main>

          <footer
            className={`z-40 grid shrink-0 ${product.inStock ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5 border-t border-slate-100 bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,.08)]`}
          >
            {product.inStock ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (isSelectedConfigurationInCart) onOpenCart?.();
                    else addToCart(false);
                  }}
                  aria-label={isSelectedConfigurationInCart ? 'Go to Cart' : 'Add to cart'}
                  className="flex h-[50px] items-center justify-center gap-2 rounded-xl border border-[#d9232d] bg-white text-[13px] font-extrabold text-[#d9232d] active:scale-[.98]"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {isSelectedConfigurationInCart ? 'Go to Cart' : 'Add to Cart'}
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(true)}
                  className="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-[#d9232d] text-[13px] font-extrabold text-white shadow-sm active:scale-[.98]"
                >
                  <Zap className="h-4 w-4 fill-current" />
                  Buy Now
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!onNotifyMe || notifySubmitting}
                onClick={() => void handleNotifyMe(product)}
                aria-label="Notify me when this product is back in stock"
                className="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-[#d9232d] text-[13px] font-extrabold text-white shadow-sm disabled:opacity-50"
              >
                <Clock3 className={`h-4 w-4 ${notifySubmitting ? 'animate-spin' : ''}`} />
                {notifySubmitting ? 'Setting up…' : 'Notify me'}
              </button>
            )}
          </footer>
        </motion.section>
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
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_3px_14px_rgba(15,23,42,.045)]">
      <button type="button" onClick={onSelect} className="block h-[112px] w-full bg-slate-100">
        <img
          src={localProductImages[product.id]?.[0] ?? product.image}
          alt={product.title}
          className="h-full w-full object-cover"
        />
      </button>
      <div className="p-2.5">
        <button
          type="button"
          onClick={onSelect}
          className="block text-left text-[12px] font-bold break-words"
        >
          {product.title}
        </button>
        <p className="mt-0.5 text-[10px] text-slate-500 break-words">{product.subtitle}</p>
        <p
          className={`mt-1 text-[10px] font-bold ${availability.state === 'out-of-stock' ? 'text-amber-700' : 'text-emerald-700'}`}
        >
          {availability.label}
        </p>
        <div className="mt-2 flex items-center justify-between gap-1">
          <span className="text-[16px] font-extrabold">
            ₹{product.price}{' '}
            <small className="text-[9px] font-normal text-slate-400 line-through">
              ₹{product.originalPrice}
            </small>
          </span>
          <button
            type="button"
            disabled={!product.inStock && !isInCart && (!onNotifyMe || notifySubmitting)}
            onClick={() => {
              if (isInCart) onOpenCart?.();
              else if (product.inStock) onAdd();
              else void handleNotifyMe();
            }}
            aria-label={
              isInCart
                ? 'Go to Cart'
                : product.inStock
                  ? `Add ${product.title} to cart`
                  : 'Notify me when in stock'
            }
            title={isInCart ? 'Go to Cart' : product.inStock ? 'Add to cart' : 'Notify me'}
            className={`grid min-h-11 ${!product.inStock && !isInCart ? 'min-w-[74px] px-2 text-[9px] font-extrabold' : 'min-w-11'} place-items-center rounded-xl text-white ${isInCart ? 'bg-emerald-600' : 'bg-[#d9232d]'}`}
          >
            {isInCart ? (
              <ShoppingCart className="h-4 w-4" />
            ) : product.inStock ? (
              <Plus className="h-4 w-4" />
            ) : notifySubmitting ? (
              'Wait…'
            ) : (
              'Notify me'
            )}
          </button>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-500">
          <Star className="h-3 w-3 fill-current" />
          {product.rating} <span className="text-slate-400">({product.reviewCount})</span>
        </div>
      </div>
    </article>
  );
};
