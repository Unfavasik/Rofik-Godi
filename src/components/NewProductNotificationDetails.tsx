import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Gem, Heart, MapPin, Package, Share2, ShieldCheck, Star, Tag, Wrench } from 'lucide-react';
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
  const images = useMemo(() => [product.image, ...(product.additionalImages || [])].filter((image, index, all) => Boolean(image) && all.indexOf(image) === index), [product]);
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const image = images[activeImage] || product.image;
  const lowestPrice = product.price + Math.min(0, ...(product.thicknessOptions || []).map((option) => option.extraPrice));
  const features = (product.features || []).slice(0, 4);
  const featureIcons = [Gem, ShieldCheck, Package, Wrench];
  const dateLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(createdAt));
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: product.title, text: product.subtitle || product.description, url: `${window.location.origin}/product/${product.slug}` });
      else if (navigator.clipboard) await navigator.clipboard.writeText(`${window.location.origin}/product/${product.slug}`);
    } catch { /* The share sheet may be dismissed. */ }
  };

  return <main className="new-arrival-detail min-h-screen w-full bg-white text-slate-900">
    <div className="mx-auto max-w-[480px] px-4 pb-5 pt-3 sm:px-5">
      <header className="mb-3 flex items-center gap-2.5">
        <button type="button" onClick={onBack} aria-label="Back to notifications" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f2f3f7] text-slate-900"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><h1 className="truncate text-[18px] font-extrabold tracking-[-.035em]">Notification Details</h1><p className="truncate text-[11px] text-slate-500">New product added to our store</p></div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-extrabold text-[#d9232d]"><i className="h-2 w-2 rounded-full bg-[#d9232d]" />NEW</span>
      </header>

      <section className="relative overflow-hidden rounded-[25px] bg-slate-100 shadow-sm">
        <img src={image} alt={product.title} className="h-[min(54vw,250px)] min-h-[205px] w-full object-cover" onError={(event) => { if (event.currentTarget.src !== product.image) event.currentTarget.src = product.image; }} />
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#e51e35] to-[#f26b77] px-3 py-2 text-white shadow-lg"><Package className="h-5 w-5" /><span className="leading-tight"><b className="block text-xs">New Arrival</b><small className="text-[8px] font-semibold tracking-wide">JUST ADDED</small></span></div>
        <button type="button" onClick={() => setLiked((value) => !value)} aria-label={liked ? 'Remove from favorites' : 'Add to favorites'} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-800 shadow-md"><Heart className={`h-5 w-5 ${liked ? 'fill-[#d9232d] text-[#d9232d]' : ''}`} /></button>
        {images.length > 1 && <>
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-bold text-white">{activeImage + 1}/{images.length}</span>
          <div className="absolute bottom-3 right-3 flex gap-1.5"><button type="button" aria-label="Previous image" onClick={() => setActiveImage((activeImage + images.length - 1) % images.length)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-950/65 text-white"><ChevronLeft className="h-5 w-5" /></button><button type="button" aria-label="Next image" onClick={() => setActiveImage((activeImage + 1) % images.length)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-950/65 text-white"><ChevronRight className="h-5 w-5" /></button></div>
        </>}
      </section>

      {images.length > 1 && <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
        {images.slice(0, 4).map((src, index) => <button key={`${src}-${index}`} type="button" aria-label={`View product image ${index + 1}`} onClick={() => setActiveImage(index)} className={`h-[54px] min-w-[54px] flex-1 overflow-hidden rounded-xl border-2 ${activeImage === index ? 'border-[#d9232d] p-0.5' : 'border-transparent'}`}><img src={src} alt="" className="h-full w-full rounded-lg object-cover" /></button>)}
        {images.length > 4 && <button type="button" onClick={() => setActiveImage(4)} className="relative h-[54px] min-w-[54px] flex-1 overflow-hidden rounded-xl bg-slate-900"><img src={images[4]} alt="" className="h-full w-full object-cover opacity-40" /><span className="absolute inset-0 grid place-items-center text-base font-extrabold text-white">+{images.length - 4}</span></button>}
      </div>}

      <div className="mt-3 flex items-center justify-between gap-2"><span className="rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-extrabold text-[#d9232d]">{product.categoryLabel}</span><span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${product.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.inStock ? <Check className="h-3.5 w-3.5 rounded-full bg-emerald-600 p-0.5 text-white" /> : <Package className="h-3.5 w-3.5" />}{product.inStock ? 'In Stock' : 'Currently unavailable'}</span></div>
      <h2 className="mt-3 text-[20px] font-extrabold leading-tight tracking-[-.035em]">{product.title}</h2>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.45] text-slate-500">{product.subtitle || product.description}</p>

      <section className="mt-3.5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-rose-50 to-[#fff7f7] px-3.5 py-3">
        <div><span className="block text-[10px] font-medium text-slate-500">Starting from</span><strong className="text-[22px] font-extrabold leading-tight text-[#d9232d]">₹{lowestPrice.toLocaleString('en-IN')}</strong></div>
        <div className="mx-2.5 h-10 w-px bg-rose-200" />
        <div className="flex min-w-0 flex-1 items-center gap-1.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-100 text-[#d9232d]"><Tag className="h-4 w-4 fill-current" /></span><div className="min-w-0"><b className="block truncate text-xs text-[#d9232d]">{product.originalPrice > product.price ? `${Math.round((1 - product.price / product.originalPrice) * 100)}% off` : 'Special product'}</b><span className="block truncate text-[10px] text-slate-500">{product.originalPrice > product.price ? `MRP ₹${product.originalPrice.toLocaleString('en-IN')}` : 'Quality made for your ride'}</span></div><ChevronRight className="h-4 w-4 shrink-0 text-[#d9232d]" /></div>
      </section>

      {product.compatibility.length > 0 && <section className="mt-2.5 flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"><span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Fits</span><span className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-700">{product.compatibility.slice(0, 3).join(' · ')}{product.compatibility.length > 3 ? ` +${product.compatibility.length - 3} more` : ''}</span></section>}

      <section className="mt-3.5 grid grid-cols-4 gap-1.5 text-center">{features.map((feature, index) => { const Icon = featureIcons[index]; return <div key={feature} title={feature} className="min-w-0"><div className="mx-auto grid h-11 w-11 place-items-center rounded-[14px] bg-rose-50 text-[#d9232d]"><Icon className="h-5 w-5" /></div><span className="mt-1.5 line-clamp-2 block text-[9px] font-semibold leading-snug text-slate-600">{shortFeatureLabel(feature)}</span></div>; })}</section>

      <section className="mt-3.5 flex items-center gap-2.5 rounded-2xl bg-[#f8f6f7] p-2.5">
        <img src={STORE_IMAGE} alt="Rofik Godi Center storefront" className="h-[62px] w-[96px] shrink-0 rounded-xl object-cover" />
        <div className="min-w-0"><div className="flex items-center gap-1"><b className="truncate text-[13px] font-extrabold">Rofik Godi Center</b><ChevronRight className="h-3.5 w-3.5 shrink-0" /></div><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0" />Berhampore, Murshidabad</p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-600">{product.reviewCount > 0 ? <><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /><b className="text-slate-900">{product.rating.toFixed(1)}</b><span>({product.reviewCount} reviews)</span></> : <span>Recently added to our catalog</span>}</p></div>
      </section>
      <p className="mt-2 text-center text-[9px] text-slate-400">Added {dateLabel} · Live catalog information</p>

      <div className="mt-3 flex gap-2"><button type="button" onClick={() => onViewProduct(product)} disabled={!product.inStock} className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e51e35] to-[#ec1c2c] px-3 text-sm font-extrabold text-white shadow-[0_6px_14px_rgba(217,35,45,.16)] disabled:opacity-50"><Package className="h-4 w-4" />View product<ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => void share()} aria-label="Share product" className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-2xl bg-rose-50 px-3 text-xs font-extrabold text-[#d9232d]"><Share2 className="h-4 w-4" />Share</button></div>
    </div>
  </main>;
}
