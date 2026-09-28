import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  Droplets,
  Heart,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { Product } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    selectedColor: { name: string; hex: string },
    selectedStitch: string,
    selectedThickness: { label: string; extraPrice: number },
    customEmbroideryText?: string,
    quantity?: number
  ) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Product) => void;
  cartCount?: number;
  onOpenCart?: () => void;
  onOpenSearch?: () => void;
  onBuyNow?: () => void;
  onSelectProduct?: (p: Product) => void;
  onQuickAdd?: (p: Product) => void;
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

const reviewRows = [
  {
    name: 'Arman Sk', initial: 'A', tint: 'blue',
    text: 'Quality khub bhalo. Perfectly fit hoyeche amar bike a. Definitely recommend!',
    images: ['/images/premium-seat-gallery-02.webp', '/images/premium-seat-gallery-05.webp'],
  },
  {
    name: 'Sahidul Islam', initial: 'S', tint: 'violet',
    text: 'Material ta khub strong. Rain eo kono problem hoyni, value for money.',
    images: ['/images/premium-seat-gallery-03.webp', '/images/premium-seat-gallery-04.webp'],
  },
  {
    name: 'Hasan Ali', initial: 'H', tint: 'green',
    text: 'Look ta onek stylish. Install kora o khub easy chilo. Thanks Rofik Godi Centre!',
    images: ['/images/premium-seat-gallery-04.webp', '/images/premium-seat-gallery-02.webp'],
  },
];

const stars = (count = 5) => (
  <span className="inline-flex items-center gap-[2px] text-amber-400" aria-label={`${count} out of 5 stars`}>
    {Array.from({ length: count }, (_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
  </span>
);

export const ProductDetailModal: React.FC<ProductDetailModalProps> = (props) => {
  if (!props.product) return null;
  return <ProductDetailPage key={props.product.id} {...props} product={props.product} />;
};

const ProductDetailPage: React.FC<ProductDetailModalProps & { product: Product }> = ({
  product,
  onClose,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  cartCount = 0,
  onOpenCart,
  onOpenSearch,
  onBuyNow,
  onSelectProduct,
  onQuickAdd,
}) => {
  const images = useMemo(() => {
    const curated = localProductImages[product.id];
    return curated?.length ? curated : [product.image, ...(product.additionalImages ?? [])];
  }, [product]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedStitch, setSelectedStitch] = useState(product.stitchPatterns[0] || 'Standard');
  const [selectedThickness, setSelectedThickness] = useState(
    product.thicknessOptions[0] || { label: 'Standard', extraPrice: 0 }
  );
  const [vehicleType, setVehicleType] = useState('Bike');
  const [selectedModel, setSelectedModel] = useState('');
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [added, setAdded] = useState(false);
  const [quantity] = useState(1);
  const totalPrice = (product.price + selectedThickness.extraPrice) * quantity;
  const displayOriginalPrice = product.id === 'rg-prod-01' ? 699 : product.originalPrice;
  const savings = Math.max(0, displayOriginalPrice - product.price);
  const discount = Math.round((savings / displayOriginalPrice) * 100);

  const addToCart = (buyNow = false) => {
    onAddToCart(product, selectedColor, selectedStitch, selectedThickness, undefined, quantity);
    setAdded(true);
    if (buyNow) {
      window.setTimeout(() => {
        onClose();
        onBuyNow?.();
      }, 250);
    } else {
      window.setTimeout(() => setAdded(false), 1300);
    }
  };

  const shareProduct = async () => {
    try {
      if (navigator.share) await navigator.share({ title: product.title, url: window.location.href });
      else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href);
    } catch {
      // The share sheet can be dismissed without changing page state.
    }
  };

  const suggested = PRODUCTS.filter((item) => item.id !== product.id).slice(0, 4);
  const reviewsValue = (product.rating ?? 4.8).toFixed(1);
  const modelOptions = product.compatibility.length ? product.compatibility : ['Universal fit'];

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
            <button type="button" onClick={onClose} aria-label="Go back" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-[12px] font-black tracking-[.045em] text-[#d9232d]">ROFIK GODI CENTRE</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Search products" onClick={onOpenSearch} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100">
                <Search className="h-[21px] w-[21px]" />
              </button>
              <button type="button" aria-label={`Open cart, ${cartCount} items`} onClick={onOpenCart} className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100">
                <ShoppingCart className="h-[21px] w-[21px]" />
                {cartCount > 0 && <span className="absolute right-0 top-0 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#d9232d] px-1 text-[10px] font-bold text-white">{cartCount}</span>}
              </button>
            </div>
          </header>

          <main className="product-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5">
            <section className="relative">
              <div className="relative h-[340px] bg-[#f1f1f2] sm:h-[365px]">
                <img
                  src={images[activeImageIndex] ?? product.image}
                  alt={product.title}
                  className="h-full w-full object-cover"
                  onError={(event) => { event.currentTarget.src = product.image; }}
                />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                  <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">{activeImageIndex + 1}/{images.length}</span>
                  <div className="flex gap-2">
                    <button type="button" aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => onToggleWishlist(product)} className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-900 shadow-sm backdrop-blur">
                      <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-[#d9232d] text-[#d9232d]' : ''}`} />
                    </button>
                    <button type="button" aria-label="Share product" onClick={shareProduct} className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-900 shadow-sm backdrop-blur">
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="-mt-1 flex gap-2 overflow-x-auto bg-white px-4 py-3 no-scrollbar">
                {images.map((image, index) => (
                  <button type="button" key={image} onClick={() => setActiveImageIndex(index)} aria-label={`View product image ${index + 1}`} className={`h-[66px] w-[66px] shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 transition ${activeImageIndex === index ? 'border-[#d9232d]' : 'border-transparent'}`}>
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </section>

            <section className="px-5 pb-4 pt-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#d9232d]">{product.categoryLabel || 'Bike Covers'}</div>
              <div className="mt-1 flex items-start justify-between gap-2">
                <h1 className="text-[21px] font-extrabold leading-[1.2] tracking-[-.035em]">{product.title}</h1>
                {(product.isBestseller || product.badge === 'Bestseller' || product.id === 'rg-prod-01') && <span className="shrink-0 rounded-full bg-[#d9232d] px-2.5 py-1 text-[10px] font-bold text-white">Bestseller</span>}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-500">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <b className="text-slate-900">{reviewsValue}</b><span>({product.reviewCount} reviews)</span>
              </div>
              <div className="mt-4 flex items-center gap-2.5">
                <strong className="text-[30px] font-black leading-none tracking-[-.045em]">₹{totalPrice}</strong>
                <span className="text-[15px] text-slate-400 line-through">₹{displayOriginalPrice}</span>
                <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-[#d9232d]">{discount}% OFF</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[['Premium Quality', ShieldCheck], ['Waterproof', Droplets], ['Long Lasting', Clock3]].map(([label, Icon]) => (
                  <div key={label as string} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-white px-2 py-2 text-center text-[10px] font-semibold text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,.03)]">
                    <Icon className="h-4 w-4 shrink-0 text-slate-700" /><span>{label as string}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-slate-100 px-5 py-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-[16px] font-extrabold tracking-tight">Color Options</h2><span className="text-[11px] text-slate-500">{selectedColor.name}</span></div>
              <div className="grid grid-cols-5 gap-2">
                {product.colors.map((color, index) => (
                  <button key={color.name} type="button" onClick={() => setSelectedColor(color)} className="min-w-0 text-center">
                    <span className={`relative mx-auto block aspect-square w-full overflow-hidden rounded-xl border-2 bg-slate-100 ${selectedColor.name === color.name ? 'border-[#d9232d]' : 'border-transparent'}`}>
                      <img src={images[index % images.length]} alt="" className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow" style={{ backgroundColor: color.hex }} />
                    </span>
                    <span className="mt-1.5 block truncate text-[9px] leading-tight text-slate-600">{color.name.replace(' & ', ' ')}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="border-t border-slate-100 px-5 py-4">
              <h2 className="mb-3 text-[16px] font-extrabold tracking-tight">Select Vehicle Type</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Bike', Icon: Bike },
                  { label: 'Toto', Icon: Truck },
                  { label: 'Scooter', Icon: Zap },
                ].map(({ label, Icon }) => (
                  <button key={label} type="button" onClick={() => { setVehicleType(label); setSelectedModel(''); }} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-bold transition ${vehicleType === label ? 'border-[#d9232d] bg-rose-50 text-[#d9232d]' : 'border-slate-200 bg-white text-slate-700'}`}>
                    <Icon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>
            </section>

            <section className="border-t border-slate-100 px-5 py-4">
              <div className="mb-2 text-[16px] font-extrabold tracking-tight">Select Model <span className="text-[12px] font-medium text-slate-400">(Optional)</span></div>
              <label className="relative block">
                <span className="sr-only">Choose your vehicle model</span>
                <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} className="h-[48px] w-full appearance-none rounded-xl border border-slate-200 bg-white pl-12 pr-10 text-[13px] text-slate-600 outline-none focus:border-[#d9232d]">
                  <option value="">Choose your {vehicleType.toLowerCase()} model</option>
                  {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
                <Bike className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#d9232d]" />
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </label>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-[11px] leading-relaxed text-[#d9232d]">
                <CircleCheck className="h-4 w-4 shrink-0" />
                <span>Not sure? Don’t worry! This cover fits most models.</span>
              </div>
            </section>

            <section className="border-t border-slate-100 px-5 py-4">
              <h2 className="mb-3 text-[16px] font-extrabold tracking-tight">Key Features</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { title: 'Waterproof', detail: 'Rain & dust protection', Icon: Droplets, tone: 'blue' },
                  { title: 'Anti-Slip', detail: 'Better grip & comfort', Icon: ShieldCheck, tone: 'red' },
                  { title: 'Premium Material', detail: 'Durable & long lasting', Icon: PackageCheck, tone: 'orange' },
                  { title: 'Easy to Install', detail: 'No tools required', Icon: Wrench, tone: 'green' },
                ].map(({ title, detail, Icon, tone }) => (
                  <div key={title} className="flex min-h-[74px] items-center gap-2.5 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-[0_3px_12px_rgba(15,23,42,.035)]">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone === 'blue' ? 'bg-blue-50 text-blue-500' : tone === 'red' ? 'bg-rose-50 text-[#d9232d]' : tone === 'orange' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-600'}`}><Icon className="h-5 w-5" /></span>
                    <span><b className="block text-[11px] leading-tight">{title}</b><small className="mt-1 block text-[10px] leading-snug text-slate-500">{detail}</small></span>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-slate-100 px-5 py-4">
              <h2 className="mb-2 text-[16px] font-extrabold tracking-tight">Description</h2>
              <p className={`text-[12px] leading-[1.6] text-slate-600 ${descriptionOpen ? '' : 'line-clamp-4'}`}>
                Upgrade your bike’s look and comfort with our {product.description || 'premium seat cover, crafted from high-quality waterproof material.'} It protects your original seat from rain, dust, and heat while giving a stylish finish. Perfect fit, easy to install, and made for long-lasting everyday rides.
              </p>
              <button type="button" onClick={() => setDescriptionOpen((open) => !open)} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-800">
                {descriptionOpen ? 'Read less' : 'Read more'}<ChevronDown className={`h-4 w-4 transition ${descriptionOpen ? 'rotate-180' : ''}`} />
              </button>
            </section>

            <section className="border-t border-slate-100 px-5 py-4">
              <h2 className="mb-2 text-[16px] font-extrabold tracking-tight">Specifications</h2>
              <div className="divide-y divide-slate-100">
                {[
                  ['Material', product.materials?.[0] || 'Premium Leatherette'],
                  ['Waterproof', product.isWaterproof ? 'Yes' : 'Breathable'],
                  ['Anti-Slip', 'Yes'],
                  ['Suitable For', product.compatibility[0] || 'Most Bike Models'],
                  ['Package Includes', '1 Seat Cover'],
                  ['Installation', 'Easy (DIY)'],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[20px_1fr_1.15fr] items-center gap-2 py-2.5 text-[11px]">
                    <span className="text-slate-500">{label === 'Waterproof' ? <Droplets className="h-3.5 w-3.5" /> : label === 'Installation' ? <Wrench className="h-3.5 w-3.5" /> : <PackageCheck className="h-3.5 w-3.5" />}</span>
                    <span className="text-slate-500">{label}</span><span className="text-right font-medium text-slate-600">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-slate-100 px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[17px] font-extrabold tracking-tight">Customer Reviews</h2>
                <button type="button" onClick={() => setReviewOpen(true)} className="text-[12px] font-bold text-[#d9232d]">See all</button>
              </div>
              <div className="grid grid-cols-[105px_1fr] gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="text-center">
                  <div className="text-[38px] font-black leading-none tracking-[-.06em]">{reviewsValue}</div>
                  <div className="mt-1">{stars()}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{product.reviewCount} reviews</div>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  {[['5', '70%'], ['4', '20%'], ['3', '7%'], ['2', '2%'], ['1', '1%']].map(([number, width]) => (
                    <div key={number} className="flex items-center gap-1.5 text-[10px] text-slate-500"><span>{number} ★</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-amber-400" style={{ width }} /></span><span className="w-7 text-right">{width}</span></div>
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-2.5">
                {reviewRows.map((review) => (
                  <article key={review.name} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_2px_10px_rgba(15,23,42,.025)]">
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-10 w-10 place-items-center rounded-full text-[16px] font-bold ${review.tint === 'blue' ? 'bg-blue-100 text-blue-600' : review.tint === 'violet' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'}`}>{review.initial}</span>
                      <span className="min-w-0 flex-1"><b className="block text-[12px]">{review.name}</b><span className="mt-0.5 block">{stars()}</span></span>
                      <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">Verified Purchase</span>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600">{review.text}</p>
                    <div className="mt-2.5 flex gap-2">{review.images.map((src) => <img key={src} src={src} alt="Customer's seat cover" className="h-[58px] w-[76px] rounded-lg object-cover" />)}</div>
                  </article>
                ))}
              </div>
              <button type="button" onClick={() => setReviewOpen((open) => !open)} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 text-[13px] font-extrabold text-[#d9232d]">
                <Wrench className="h-4 w-4" />{reviewSubmitted ? 'Thanks for your review!' : 'Write a Review'}
              </button>
              {reviewOpen && !reviewSubmitted && <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 text-[12px] font-bold">How was your purchase?</div><div className="mb-2">{stars()}</div>
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="Share your experience..." rows={3} className="w-full resize-none rounded-lg border border-slate-200 p-2.5 text-[12px] outline-none focus:border-[#d9232d]" />
                <button type="button" onClick={() => { if (reviewText.trim()) setReviewSubmitted(true); }} className="mt-2 w-full rounded-lg bg-[#d9232d] py-2.5 text-[12px] font-bold text-white">Submit review</button>
              </div>}
            </section>

            <section className="border-t border-slate-100 px-5 py-5">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-[17px] font-extrabold tracking-tight">You may also like</h2><button type="button" onClick={() => onSelectProduct?.(suggested[0])} className="text-[12px] font-bold text-[#d9232d]">See all</button></div>
              <div className="grid grid-cols-2 gap-2.5">
                {suggested.slice(0, 2).map((item) => <SuggestionCard key={item.id} product={item} onAdd={() => onQuickAdd?.(item)} onSelect={() => onSelectProduct?.(item)} />)}
              </div>
            </section>

            <section className="border-t border-slate-100 px-5 py-5">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-[17px] font-extrabold tracking-tight">Recently viewed</h2><button type="button" className="text-[12px] font-bold text-[#d9232d]">See all</button></div>
              <div className="grid grid-cols-2 gap-2.5">
                {suggested.slice(2, 4).map((item) => <SuggestionCard key={item.id} product={item} onAdd={() => onQuickAdd?.(item)} onSelect={() => onSelectProduct?.(item)} />)}
              </div>
            </section>

            <section className="mx-4 mb-5 rounded-2xl bg-rose-50 px-4 py-4">
              {[
                [Truck, 'Free Delivery', 'On orders above ₹500'],
                [RotateCcw, '7 Days Easy Return', 'Hassle free returns'],
                [ShieldCheck, 'Secure Payment', '100% secure & safe'],
              ].map(([Icon, title, detail]) => (
                <div key={title as string} className="flex items-center gap-3 py-2"><Icon className="h-6 w-6 shrink-0 text-[#d9232d]" /><span><b className="block text-[12px]">{title as string}</b><small className="text-[10px] text-slate-500">{detail as string}</small></span></div>
              ))}
            </section>
          </main>

          <footer className="z-40 grid shrink-0 grid-cols-2 gap-2.5 border-t border-slate-100 bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,.08)]">
            <button type="button" onClick={() => addToCart(false)} className="flex h-[50px] items-center justify-center gap-2 rounded-xl border border-[#d9232d] bg-white text-[13px] font-extrabold text-[#d9232d] active:scale-[.98]">
              {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}{added ? 'Added to Cart' : 'Add to Cart'}
            </button>
            <button type="button" onClick={() => addToCart(true)} className="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-[#d9232d] text-[13px] font-extrabold text-white shadow-sm active:scale-[.98]">
              <Zap className="h-4 w-4 fill-current" />Buy Now
            </button>
          </footer>
        </motion.section>
      </div>
    </AnimatePresence>
  );
};

const SuggestionCard: React.FC<{ product: Product; onAdd: () => void; onSelect: () => void }> = ({ product, onAdd, onSelect }) => (
  <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_3px_14px_rgba(15,23,42,.045)]">
    <button type="button" onClick={onSelect} className="block h-[112px] w-full bg-slate-100"><img src={localProductImages[product.id]?.[0] ?? product.image} alt={product.title} className="h-full w-full object-cover" /></button>
    <div className="p-2.5">
      <button type="button" onClick={onSelect} className="block truncate text-left text-[12px] font-bold">{product.title}</button>
      <p className="mt-0.5 truncate text-[10px] text-slate-500">{product.subtitle}</p>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-[16px] font-extrabold">₹{product.price} <small className="text-[9px] font-normal text-slate-400 line-through">₹{product.originalPrice}</small></span>
        <button type="button" onClick={onAdd} aria-label={`Add ${product.title} to cart`} className="grid h-8 w-8 place-items-center rounded-full bg-[#d9232d] text-white"><Plus className="h-4 w-4" /></button>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-500"><Star className="h-3 w-3 fill-current" />{product.rating} <span className="text-slate-400">({product.reviewCount})</span></div>
    </div>
  </article>
);
