import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Gem,
  Heart,
  MapPin,
  Package,
  Share2,
  ShieldCheck,
  Star,
  Tag,
  Wrench,
} from 'lucide-react';
import type { Product } from '../types';

const STORE_IMAGE = '/images/rofik-godi-store.webp';
const shortFeatureLabel = (value: string) => {
  const text = value.toLowerCase();
  if (text.includes('waterproof') || text.includes('weather-resistant')) return 'Water resistant';
  if (text.includes('stitch') || text.includes('seam')) return 'Reinforced seams';
  if (text.includes('foam') || text.includes('cushion') || text.includes('padding')) return 'Cushioned comfort';
  if (text.includes('fit') || text.includes('strap') || text.includes('velcro') || text.includes('elastic')) return 'Secure fit';
  if (text.includes('uv')) return 'UV protection';
  if (text.includes('durable') || text.includes('tear') || text.includes('heavy duty')) return 'Durable build';
  return value.length > 20 ? `${value.slice(0, 19).trim()}…` : value;
};

export function NewProductNotificationDetails({
  product,
  createdAt,
  onBack,
  onViewProduct,
}: {
  product: Product;
  createdAt: string;
  onBack: () => void;
  onViewProduct: (product: Product) => void;
}) {
  const images = useMemo(
    () => [product.image, ...(product.additionalImages || [])].filter((image, index, all) => Boolean(image) && all.indexOf(image) === index),
    [product],
  );
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const image = images[activeImage] || product.image;
  const lowestPrice = product.price + Math.min(0, ...(product.thicknessOptions || []).map((option) => option.extraPrice));
  const features = (product.features || []).slice(0, 4);
  const featureIcons = [Gem, ShieldCheck, Package, Wrench];
  const dateLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(createdAt));
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.title,
          text: product.subtitle || product.description,
          url: `${window.location.origin}/product/${product.slug}`,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${window.location.origin}/product/${product.slug}`);
      }
    } catch {
      /* The share sheet may be dismissed. */
    }
  };

  return (
    <main className="new-arrival-detail min-h-dvh w-full max-w-full overflow-x-hidden bg-[#F8FAFC] pb-[max(2rem,env(safe-area-inset-bottom))] font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[58px] w-full max-w-2xl items-center gap-3 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to notifications"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] sm:text-[21px] font-extrabold tracking-tight text-slate-900">
              Notification Details
            </h1>
            <p className="truncate text-[11.5px] font-medium text-slate-500">New product added to our store</p>
          </div>
          <span className="shrink-0 text-xs font-extrabold text-[#D9232D]">New arrival</span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-3.5 px-3 pt-4 sm:px-5 sm:pt-5">
        <section className="rounded-3xl border border-slate-200/85 bg-white p-3.5 shadow-[0_6px_20px_-10px_rgba(15,23,42,0.08)] sm:p-4">
          <div className="relative overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={image}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="h-[min(56vw,280px)] min-h-[210px] w-full object-cover"
              onError={(event) => {
                if (event.currentTarget.src !== product.image) event.currentTarget.src = product.image;
              }}
            />
            <button
              type="button"
              onClick={() => setLiked((value) => !value)}
              aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
              className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-slate-800 shadow-md backdrop-blur-xs transition active:scale-95"
            >
              <Heart className={`h-5 w-5 ${liked ? 'fill-[#D9232D] text-[#D9232D]' : ''}`} />
            </button>
            {images.length > 1 && (
              <>
                <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white">
                  {activeImage + 1}/{images.length}
                </span>
                <div className="absolute bottom-3 right-3 flex gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() => setActiveImage((activeImage + images.length - 1) % images.length)}
                    className="grid h-11 w-11 place-items-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950/85 active:scale-95"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setActiveImage((activeImage + 1) % images.length)}
                    className="grid h-11 w-11 place-items-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950/85 active:scale-95"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="no-scrollbar mt-2.5 flex max-w-full gap-2 overflow-x-auto">
              {images.slice(0, 4).map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  aria-label={`View product image ${index + 1}`}
                  onClick={() => setActiveImage(index)}
                  className={`h-[56px] min-w-[56px] flex-1 overflow-hidden rounded-xl border-2 transition ${
                    activeImage === index ? 'border-[#D9232D] p-0.5' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-lg object-cover" />
                </button>
              ))}
              {images.length > 4 && (
                <button
                  type="button"
                  onClick={() => setActiveImage(4)}
                  className="relative h-[56px] min-w-[56px] flex-1 overflow-hidden rounded-xl bg-slate-900"
                >
                  <img src={images[4]} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover opacity-40" />
                  <span className="absolute inset-0 grid place-items-center text-base font-extrabold text-white">
                    +{images.length - 4}
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="text-[#D9232D]">{product.categoryLabel}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className={`inline-flex items-center gap-1 ${product.inStock ? 'text-emerald-700' : 'text-slate-500'}`}>
              {product.inStock ? <Check className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
              <span>{product.inStock ? 'In Stock' : 'Currently unavailable'}</span>
            </span>
          </div>

          <h2 className="mt-1.5 text-[21px] sm:text-[23px] font-black leading-tight tracking-tight text-slate-950">
            {product.title}
          </h2>
          <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-slate-600">
            {product.subtitle || product.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-gradient-to-r from-[#FFF1F2] to-[#FFF8F8] px-4 py-3">
            <div className="shrink-0">
              <span className="block text-[11px] font-semibold text-slate-500">Starting from</span>
              <strong className="text-[24px] font-black leading-tight tabular-nums text-[#D9232D]">
                ₹{lowestPrice.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="hidden h-9 w-px bg-rose-200/80 min-[340px]:block" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#D9232D] shadow-2xs">
                <Tag className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <b className="block truncate text-xs font-extrabold text-[#D9232D]">
                  {product.originalPrice > product.price
                    ? `${Math.round((1 - product.price / product.originalPrice) * 100)}% off`
                    : 'Special product'}
                </b>
                <span className="block truncate text-[11px] font-medium tabular-nums text-slate-500">
                  {product.originalPrice > product.price
                    ? `MRP ₹${product.originalPrice.toLocaleString('en-IN')}`
                    : 'Quality made for your ride'}
                </span>
              </div>
            </div>
          </div>

          {product.compatibility.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-slate-200/75 bg-slate-50 px-3.5 py-2.5">
              <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Fits</span>
              <span className="min-w-0 line-clamp-2 text-[12px] font-medium leading-snug text-slate-700">
                {product.compatibility.slice(0, 3).join(' · ')}
                {product.compatibility.length > 3 ? ` +${product.compatibility.length - 3} more` : ''}
              </span>
            </div>
          )}

          {features.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {features.map((feature, index) => {
                const Icon = featureIcons[index] || ShieldCheck;
                return (
                  <div key={feature} title={feature} className="min-w-0">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-[#D9232D]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="mt-1.5 line-clamp-2 block text-[10.5px] font-semibold leading-snug text-slate-600">
                      {shortFeatureLabel(feature)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex items-center gap-3 rounded-3xl border border-slate-200/85 bg-white p-3 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.06)]">
          <img
            src={STORE_IMAGE}
            alt="Rofik Godi Center storefront"
            referrerPolicy="no-referrer"
            className="h-16 w-20 shrink-0 rounded-2xl object-cover sm:w-24"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <b className="truncate text-[13.5px] font-extrabold text-slate-900">Rofik Godi Center</b>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </div>
            <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Berhampore, Murshidabad</span>
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-600 tabular-nums">
              {product.reviewCount > 0 ? (
                <>
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                  <b className="text-slate-900">{product.rating.toFixed(1)}</b>
                  <span>({product.reviewCount} reviews)</span>
                </>
              ) : (
                <span>Added {dateLabel} · Live catalog</span>
              )}
            </p>
          </div>
        </section>

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onViewProduct(product)}
            disabled={!product.inStock}
            className="banner-cta-shine group/cta flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D9232D] via-[#E51E35] to-[#B91822] px-4 text-sm font-extrabold text-white shadow-md transition-all hover:brightness-105 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            <Package className="h-4 w-4 shrink-0" />
            <span className="truncate">View product</span>
            <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={() => void share()}
            aria-label="Share product"
            className="flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-white px-4 text-xs font-extrabold text-[#D9232D] transition-colors hover:bg-rose-50 active:scale-95"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </main>
  );
}
