import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCheck2,
  Mail,
  MapPin,
  Package,
  Phone,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { CustomerOrderRecord, Product } from '../types';
import { WORKSHOP_INFO } from '../data/products';
import { downloadOrderInvoice } from '../lib/orderInvoice';
import {
  buildGuaranteeVerificationUrl,
  buildInvoiceTermsText,
  fetchProductGuaranteeDateFromDb,
  getLocalProductGuaranteeDate,
  normalizeGuaranteeDate,
  PRODUCT_GUARANTEE_CHANGED_EVENT,
  resolveProductGuarantee,
  resolveSpecificProductGuarantee,
  useProductGuaranteePolicy,
  type ProductGuaranteePolicy,
} from '../lib/productGuarantee';

export type InvoiceStore = {
  name: string;
  address: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  gstin?: string;
};

export const AUTHORISED_SIGNATURE_SRC = '/assets/aistudio/brittany-signature_775bf19a.png';

export const DEFAULT_STORE: InvoiceStore = {
  name: WORKSHOP_INFO.name,
  address: WORKSHOP_INFO.address,
  phone: WORKSHOP_INFO.phone,
  whatsapp: WORKSHOP_INFO.whatsapp,
  email: WORKSHOP_INFO.email,
  // GSTIN is not configured in the repository, so it is intentionally left blank.
  gstin: '',
};

const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateLabel = (v: string) => {
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime())
    ? 'Date unavailable'
    : parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

function resolveOrderItemImage(
  item: CustomerOrderRecord['order_items'][number],
  productsById: Map<string, Product>,
): string | null {
  if (typeof item.image_url === 'string' && item.image_url.trim()) {
    return item.image_url.trim();
  }
  const product = item.product_id ? productsById.get(item.product_id) : undefined;
  if (!product) return null;
  const colorName = String(item.color || '').trim().toLowerCase();
  if (colorName && Array.isArray(product.colors)) {
    const matchedColor = product.colors.find(
      (entry) => String(entry.name || '').trim().toLowerCase() === colorName,
    );
    const colorImg = matchedColor?.images?.find((src) => typeof src === 'string' && src.trim());
    if (colorImg) return colorImg.trim();
  }
  return typeof product.image === 'string' && product.image.trim() ? product.image.trim() : null;
}

const InvoiceItemThumb: React.FC<{ src: string | null; alt: string }> = ({ src, alt }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src && failedSrc !== src);

  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50 text-slate-300 shadow-2xs sm:h-13 sm:w-13">
      <Package className="h-4 w-4" aria-hidden="true" />
      {showImage && src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
};

// Indian numbering: crore / lakh / thousand
export function amountInWords(amount: number): string {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const two = (n: number) =>
    n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`;
  const three = (n: number) =>
    `${n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : ''}${n % 100 ? two(n % 100) : ''}`;
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const totalPaise = Math.round(safeAmount * 100);
  let rupees = Math.floor(totalPaise / 100);
  const totalRupees = rupees;
  const paise = totalPaise % 100;
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rupees) parts.push(three(rupees));
  const main = parts.length ? `${parts.join(' ')} ${totalRupees === 1 ? 'Rupee' : 'Rupees'}` : '';
  const paiseText = paise ? `${main ? ' and ' : ''}${two(paise)} Paise` : '';
  return `${main}${paiseText} Only`;
}

const PRINT_CSS = `
@page { size: A4; margin: 0; }
@media print {
  body * { visibility: hidden !important; }
  #invoice-sheet, #invoice-sheet * { visibility: visible !important; }
  #invoice-sheet { position: absolute; left: 0; top: 0; width: 210mm; min-height: 297mm; box-shadow: none !important; margin: 0 !important; border: none !important; border-radius: 0 !important; }
  .no-print { display: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export const InvoiceTemplate: React.FC<{
  order: CustomerOrderRecord;
  products?: Product[];
  store?: InvoiceStore;
  pickupToken?: string;
  guaranteePolicy?: ProductGuaranteePolicy;
  onClose?: () => void;
}> = ({
  order,
  products = [],
  store = DEFAULT_STORE,
  pickupToken,
  guaranteePolicy,
  onClose,
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);
  const [signatureFailed, setSignatureFailed] = useState(false);
  const liveGuaranteePolicy = useProductGuaranteePolicy();
  const activeGuaranteePolicy = guaranteePolicy ?? liveGuaranteePolicy;
  const paid = order.payment_status?.toUpperCase() === 'PAID';
  const payAtStore = order.payment_method?.toLowerCase() === 'pay_at_store';
  const items = useMemo(() => order.order_items || [], [order.order_items]);
  const lineTotal = (i: CustomerOrderRecord['order_items'][number]) => i.unit_price * i.quantity;

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      if (product.id) map.set(product.id, product);
      if (product.slug) map.set(product.slug, product);
    }
    return map;
  }, [products]);

  const findMatchingProduct = useMemo(() => {
    return (item: CustomerOrderRecord['order_items'][number]): Product | undefined => {
      if (item.product_id && productsById.has(item.product_id)) {
        return productsById.get(item.product_id);
      }
      const normalizedName = String(item.product_name || '').trim().toLowerCase();
      if (!normalizedName) return undefined;
      return products.find(
        (product) => String(product.title || '').trim().toLowerCase() === normalizedName,
      );
    };
  }, [products, productsById]);

  const [dbGuaranteeByKey, setDbGuaranteeByKey] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let active = true;
    const syncLocalAndDbGuarantees = async () => {
      const nextMap: Record<string, string | null> = {};
      await Promise.all(
        items.map(async (item, idx) => {
          const matched = findMatchingProduct(item);
          const productId = matched?.id || item.product_id || null;
          const productSlug = matched?.slug || null;
          const fallbackDate = normalizeGuaranteeDate(matched?.guaranteeValidUntil);
          const key = `${productId || productSlug || item.product_name || idx}`;
          const localVal = getLocalProductGuaranteeDate(productId, productSlug);
          if (localVal !== undefined) {
            nextMap[key] = localVal;
          }
          const dbDate = await fetchProductGuaranteeDateFromDb({
            productId,
            productSlug,
            fallbackDate,
          });
          nextMap[key] = dbDate;
        }),
      );
      if (active) {
        setDbGuaranteeByKey(nextMap);
      }
    };

    void syncLocalAndDbGuarantees();

    const handleChanged = () => {
      void syncLocalAndDbGuarantees();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleChanged);
      window.addEventListener('storage', handleChanged);
    }
    return () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener(PRODUCT_GUARANTEE_CHANGED_EVENT, handleChanged);
        window.removeEventListener('storage', handleChanged);
      }
    };
  }, [items, findMatchingProduct]);

  const enrichedItems = useMemo(
    () =>
      items.map((item, idx) => {
        const matched = findMatchingProduct(item);
        const productId = matched?.id || item.product_id || null;
        const productSlug = matched?.slug || null;
        const key = `${productId || productSlug || item.product_name || idx}`;
        const localOverride = getLocalProductGuaranteeDate(productId, productSlug);
        const rawGuaranteeDate =
          Object.prototype.hasOwnProperty.call(dbGuaranteeByKey, key)
            ? dbGuaranteeByKey[key]
            : localOverride !== undefined
              ? localOverride
              : normalizeGuaranteeDate(matched?.guaranteeValidUntil);

        return {
          ...item,
          resolvedImage: resolveOrderItemImage(item, productsById),
          itemGuarantee: resolveSpecificProductGuarantee(rawGuaranteeDate),
          rawGuaranteeDate: normalizeGuaranteeDate(rawGuaranteeDate),
        };
      }),
    [items, findMatchingProduct, dbGuaranteeByKey, productsById],
  );

  const productOverrideDate = useMemo(() => {
    for (const item of enrichedItems) {
      if (item.rawGuaranteeDate) return item.rawGuaranteeDate;
    }
    return null;
  }, [enrichedItems]);

  const guaranteeInfo = useMemo(
    () =>
      resolveProductGuarantee(activeGuaranteePolicy, {
        referenceDate: order.created_at,
        productOverrideDate,
      }),
    [activeGuaranteePolicy, order.created_at, productOverrideDate],
  );

  const invoiceTerms = useMemo(() => buildInvoiceTermsText(guaranteeInfo), [guaranteeInfo]);
  const guaranteeVerificationUrl = useMemo(
    () =>
      buildGuaranteeVerificationUrl({
        orderNumber: order.order_number,
        orderSlug: order.order_slug,
        validUntilIso: guaranteeInfo.validUntilIso,
      }),
    [order.order_number, order.order_slug, guaranteeInfo.validUntilIso],
  );

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number);
      setCopiedOrderNo(true);
      window.setTimeout(() => setCopiedOrderNo(false), 1800);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const orderWithImages: CustomerOrderRecord = {
        ...order,
        order_items: items.map((item, idx) => ({
          ...item,
          image_url: enrichedItems[idx]?.resolvedImage ?? item.image_url,
        })),
      };
      const exported = await downloadOrderInvoice(orderWithImages, order.customer_name, {
        allowAnyStatus: true,
        guaranteePolicy: activeGuaranteePolicy,
        productOverrideDate,
      });
      if (exported) {
        setDownloaded(true);
        window.setTimeout(() => setDownloaded(false), 2000);
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const totalUnits = useMemo(
    () => enrichedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [enrichedItems],
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-[#E9EEF5] via-[#EEF2F7] to-[#E5EBF3] px-2.5 py-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>

      {/* Executive Studio Action Bar */}
      <div className="no-print sticky top-2.5 z-20 mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/90 bg-white/90 px-3 py-2.5 shadow-[0_14px_34px_-14px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Close</span>
            </button>
          ) : null}

          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-900 text-white sm:grid">
              <FileCheck2 className="h-4 w-4 text-rose-400" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[11px] font-black uppercase tracking-wider text-slate-900">
                  Official Invoice
                </p>
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ${
                    paid
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {paid ? 'Paid' : 'Pending'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyOrderNumber()}
                title="Copy invoice number"
                className="group mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-500 tabular-nums transition hover:text-slate-900"
              >
                <span className="truncate">#{order.order_number}</span>
                {copiedOrderNo ? (
                  <Check className="h-3 w-3 shrink-0 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={downloadingPdf}
            onClick={() => void handleDownloadPdf()}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-800 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
          >
            {downloaded ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700">Saved PDF</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 text-slate-600" />
                <span>{downloadingPdf ? 'Saving PDF…' : 'Download PDF'}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#D9232D] to-[#B91C1C] px-4 py-2 text-xs font-extrabold text-white shadow-[0_8px_20px_-6px_rgba(217,35,45,0.55)] transition hover:brightness-105 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Executive Workshop Invoice Sheet */}
      <article
        id="invoice-sheet"
        className="mx-auto flex min-h-0 w-full max-w-full flex-col overflow-hidden rounded-[22px] border border-slate-200/95 bg-white text-slate-900 shadow-[0_28px_70px_-24px_rgba(15,23,42,0.22),0_4px_16px_-4px_rgba(15,23,42,0.06)] sm:min-h-[297mm] sm:max-w-[210mm] sm:rounded-[24px] print:rounded-none print:border-0"
      >
        {/* Signature Top Brand Rule */}
        <div className="h-2 w-full shrink-0 bg-gradient-to-r from-slate-950 via-[#D9232D] to-[#9F1239]" />

        {/* Executive Letterhead */}
        <header className="relative border-b border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-rose-50/25 px-4 py-5 sm:px-9 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            {/* Workshop Identity */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3.5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#D9232D] text-white shadow-[0_10px_22px_-8px_rgba(15,23,42,0.45)] sm:h-13 sm:w-13">
                  <span className="font-mono text-sm font-black tracking-tighter">RGC</span>
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-rose-200/80 bg-rose-50/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#D9232D]">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span>Custom Seat Cover Workshop</span>
                  </div>
                  <h1 className="mt-1.5 text-xl font-black tracking-tight text-slate-950 break-words sm:text-2xl">
                    {store.name}
                  </h1>
                </div>
              </div>

              <div className="mt-3.5 space-y-1.5 text-[11.5px] text-slate-600">
                <p className="flex items-start gap-2 max-w-[360px] leading-relaxed break-words">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
                  <span>{store.address}</span>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{store.phone}</span>
                  </span>
                  {store.email ? (
                    <span className="inline-flex items-center gap-1.5 break-all">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>{store.email}</span>
                    </span>
                  ) : null}
                </div>
                {store.gstin ? (
                  <p className="font-mono text-[11px] font-semibold text-slate-500">
                    GSTIN: {store.gstin}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Invoice Document Box */}
            <div className="w-full shrink-0 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-2xs sm:w-[248px] sm:p-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                    Tax &amp; Workshop Receipt
                  </p>
                  <p className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    Invoice
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wider shadow-2xs ${
                    paid
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {paid ? 'PAID' : (order.payment_status || 'PENDING').toUpperCase()}
                </span>
              </div>

              <dl className="mt-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-slate-400">Receipt No.</dt>
                  <dd className="font-mono font-extrabold text-slate-900 tabular-nums">
                    {order.order_number}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-slate-400">Issued</dt>
                  <dd className="font-semibold text-slate-700 tabular-nums">
                    {dateLabel(order.created_at)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-slate-400">Mode</dt>
                  <dd className="font-extrabold text-[#D9232D]">Workshop Pickup</dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1 px-4 py-5 sm:px-9 sm:py-6">
          {/* 3-Column Party, Workshop Pickup & Payment Metadata Ledger */}
          <section className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/90 bg-[#F8FAFC] text-xs shadow-2xs sm:grid-cols-3 sm:divide-x sm:divide-slate-200/80">
            {/* 01. Billed To */}
            <div className="min-w-0 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Billed to
                </p>
                <span className="font-mono text-[10px] font-bold text-slate-300">01</span>
              </div>
              <p className="mt-1.5 text-[13.5px] font-black text-slate-950 break-words">
                {order.customer_name}
              </p>
              <p className="mt-0.5 font-mono text-[11.5px] font-semibold text-slate-600 tabular-nums break-words">
                {order.customer_phone || '-'}
              </p>
              {order.vehicle_model ? (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-[10.5px] font-bold text-slate-800 shadow-2xs break-words">
                  <Wrench className="h-3 w-3 shrink-0 text-[#D9232D]" />
                  <span>Vehicle: {order.vehicle_model}</span>
                </div>
              ) : null}
            </div>

            {/* 02. Workshop Pickup */}
            <div className="min-w-0 border-t border-slate-200/80 p-3.5 sm:border-t-0 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Workshop pickup (No online delivery)
                </p>
                <span className="font-mono text-[10px] font-bold text-slate-300">02</span>
              </div>
              <p className="mt-1.5 text-[13.5px] font-black text-slate-950 break-words">
                {order.pickup_store || store.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                {pickupToken
                  ? 'Collect in person with your pickup code · Free on-spot seat fitment'
                  : 'Collect in person at the pickup store · Free on-spot seat fitment'}
              </p>
            </div>

            {/* 03. Payment */}
            <div className="min-w-0 border-t border-slate-200/80 p-3.5 text-left sm:border-t-0 sm:p-4 sm:text-right">
              <div className="flex items-center justify-between gap-2 sm:flex-row-reverse">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Payment
                </p>
                <span className="font-mono text-[10px] font-bold text-slate-300">03</span>
              </div>
              <p className="mt-1.5 text-[13.5px] font-black text-slate-950">
                {payAtStore
                  ? paid
                    ? 'Paid at store'
                    : 'Pay at store'
                  : paid
                    ? 'Paid online'
                    : 'Pay online'}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                {paid
                  ? 'Settlement complete'
                  : payAtStore
                    ? 'Collect at handover'
                    : 'Awaiting settlement'}
              </p>
              <p className="mt-1.5 inline-flex items-center rounded-md bg-slate-200/75 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                Status: {String(order.status || 'NEW').replace(/_/g, ' ')}
              </p>
            </div>
          </section>

          {/* Official Workshop Guarantee Certificate */}
          {guaranteeInfo.enabled && (
            <section
              aria-label="Product guarantee validity"
              data-testid="invoice-guarantee-card"
              className="mt-4 overflow-hidden rounded-2xl border border-emerald-300/90 bg-white text-xs shadow-[0_12px_30px_-16px_rgba(5,150,105,0.22)]"
            >
              {/* Certificate Top Rule */}
              <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700" />

              {/* Certificate Header Band */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/45 px-3.5 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-2xs ring-4 ring-emerald-100/80">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[9.5px] font-black uppercase tracking-[0.14em] text-emerald-700">
                        Official Workshop Guarantee Certificate
                      </p>
                      <span className="hidden rounded bg-emerald-100/90 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-emerald-800 sm:inline-block">
                        Verified Seal
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-black tracking-tight text-slate-950 sm:text-[13.5px]">
                      Replacement Guarantee:{' '}
                      <span className="text-emerald-800">
                        Valid until {guaranteeInfo.validUntilLabel}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/90 bg-white px-2.5 py-1 text-[10.5px] font-extrabold text-emerald-900 tabular-nums shadow-2xs">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Expires {guaranteeInfo.validUntilLabel}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-2xs ${
                      guaranteeInfo.isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        guaranteeInfo.isActive ? 'bg-emerald-200' : 'bg-slate-400'
                      }`}
                    />
                    <span>{guaranteeInfo.isActive ? 'Guarantee Active' : 'Guarantee Expired'}</span>
                  </span>
                </div>
              </div>

              {/* Covered vs. Excluded + Dynamic QR Verification Seal */}
              <div className="grid grid-cols-1 gap-2.5 bg-slate-50/45 p-3 sm:grid-cols-12 sm:gap-3 sm:p-3.5">
                <div className="grid grid-cols-1 gap-2.5 sm:col-span-9 sm:grid-cols-2 sm:gap-3">
                  {/* Covered Panel */}
                  <div className="flex flex-col justify-between rounded-xl border border-emerald-200/85 border-l-4 border-l-emerald-600 bg-white p-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-black text-emerald-900">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>Covered Under Normal Everyday Use</span>
                        </p>
                        <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                          Free Replace
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-600">
                        Free workshop replacement before{' '}
                        <strong className="font-extrabold text-slate-900">
                          {guaranteeInfo.validUntilLabel}
                        </strong>{' '}
                        for natural splitting/cracking, seam tearing, or rexine/leatherette surface
                        peeling.
                      </p>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1 border-t border-emerald-100/80 pt-2">
                      {['Natural Cracking', 'Seam Tearing', 'Rexine Peeling'].map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200/70 bg-emerald-50/70 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-800"
                        >
                          <Check className="h-2.5 w-2.5 text-emerald-600" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Void / Excluded Panel */}
                  <div className="flex flex-col justify-between rounded-xl border border-rose-200/85 border-l-4 border-l-[#D9232D] bg-white p-3 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-black text-rose-900">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
                          <span>Guarantee Void / Strictly Excluded</span>
                        </p>
                        <span className="shrink-0 rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#D9232D]">
                          Not Covered
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-600">
                        <XCircle
                          aria-hidden="true"
                          className="mr-1 inline h-3 w-3 align-text-bottom text-[#D9232D]"
                        />
                        Not valid for cat or animal scratches, bilet / blade or sharp-object cuts,
                        fire or burn damage, or intentional misuse.
                      </p>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1 border-t border-rose-100/80 pt-2">
                      {['Cat Scratches', 'Bilet / Blade Cuts', 'Fire / Burn', 'Self-Damage'].map(
                        (tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200/70 bg-rose-50/60 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-800"
                          >
                            <XCircle className="h-2.5 w-2.5 text-[#D9232D]" />
                            <span>{tag}</span>
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Dynamic QR Verification Seal */}
                <div
                  data-testid="guarantee-certificate-qr"
                  className="flex flex-row items-center justify-between gap-3 rounded-xl border border-emerald-200/85 bg-white p-2.5 shadow-2xs sm:col-span-3 sm:flex-col sm:justify-center sm:p-3 sm:text-center"
                >
                  <div className="shrink-0 rounded-xl border border-emerald-200/90 bg-white p-2 shadow-2xs">
                    <QRCodeSVG
                      value={guaranteeVerificationUrl}
                      size={64}
                      level="M"
                      includeMargin={false}
                      title={`Verify guarantee and invoice for order ${order.order_number}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1 sm:flex-initial">
                    <p className="text-[9.5px] font-black uppercase tracking-wider text-emerald-800">
                      Scan to Verify
                    </p>
                    <p className="mt-0.5 text-[9px] font-medium leading-tight text-slate-500">
                      Original Invoice &amp; Guarantee
                    </p>
                    <a
                      href={guaranteeVerificationUrl}
                      data-testid="guarantee-verification-link"
                      className="mt-1 inline-flex items-center gap-1 rounded-md border border-emerald-200/80 bg-emerald-50/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-900 tabular-nums transition hover:bg-emerald-100"
                    >
                      <span className="truncate">#{order.order_number}</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Itemized Order Schedule (Zero horizontal scroll on mobile) */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Itemized Order Schedule
              </p>
              <span className="font-mono text-[10.5px] font-bold text-slate-500 tabular-nums">
                {enrichedItems.length} {enrichedItems.length === 1 ? 'Item' : 'Items'} · {totalUnits}{' '}
                {totalUnits === 1 ? 'Unit' : 'Units'}
              </span>
            </div>

            <div className="w-full overflow-hidden rounded-2xl border border-slate-200/95 shadow-2xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-[10.5px] font-extrabold uppercase tracking-wider text-white">
                    <th className="hidden w-9 py-3 pl-3.5 sm:table-cell">#</th>
                    <th className="py-3 pl-3.5 sm:pl-2">Item Description</th>
                    <th className="hidden py-3 text-right sm:table-cell">Price</th>
                    <th className="w-12 py-3 text-center">Qty</th>
                    <th className="py-3 pr-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 bg-white">
                  {enrichedItems.map((item, index) => {
                    const specs = [
                      item.color ? `Colour: ${item.color}` : '',
                      item.selected_thickness ? `Thickness: ${item.selected_thickness}` : '',
                      item.selected_stitch ? `Stitch: ${item.selected_stitch}` : '',
                      item.custom_embroidery_text ? `Embroidery: ${item.custom_embroidery_text}` : '',
                    ].filter(Boolean);
                    return (
                      <tr key={index} className="align-middle transition-colors hover:bg-slate-50/60">
                        <td className="hidden py-3.5 pl-3.5 font-mono text-[11px] font-bold text-slate-400 tabular-nums sm:table-cell">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3.5 pl-3.5 pr-2 sm:pl-2 sm:pr-3">
                          <div className="flex items-start gap-3">
                            <InvoiceItemThumb
                              src={item.resolvedImage}
                              alt={item.product_name || 'Ordered item'}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] font-black text-slate-950 break-words leading-snug">
                                {item.product_name}
                              </p>
                              {specs.length > 0 ? (
                                <p className="mt-1 text-[10.5px] font-medium text-slate-500">
                                  {specs.join(' · ')}
                                </p>
                              ) : null}
                              <p className="mt-1 font-mono text-[10.5px] font-semibold text-slate-400 tabular-nums sm:hidden">
                                {money(item.unit_price)} × {item.quantity}
                              </p>
                              {item.itemGuarantee ? (
                                <p className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-emerald-200/90 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                  <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-600" />
                                  <span>
                                    Guarantee until {item.itemGuarantee.validUntilLabel}
                                  </span>
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="hidden py-3.5 text-right font-mono text-[11.5px] font-semibold text-slate-700 tabular-nums whitespace-nowrap sm:table-cell">
                          {money(item.unit_price)}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="inline-flex min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11.5px] font-extrabold text-slate-800 tabular-nums">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3.5 pr-3.5 text-right font-mono text-[12.5px] font-black text-slate-950 tabular-nums whitespace-nowrap">
                          {money(lineTotal(item))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Ledger, Amount in Words & Pickup Voucher */}
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-start sm:gap-5">
            {/* Left Column: Amount in Words + Optional Pickup Code */}
            <div className="space-y-3.5 sm:col-span-7">
              <div className="rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-3.5 text-xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Amount in words
                </p>
                <p className="mt-1 text-xs font-extrabold leading-relaxed text-slate-900 break-words">
                  {amountInWords(order.total)}
                </p>
              </div>

              {pickupToken ? (
                <div className="rounded-2xl border-2 border-dashed border-[#D9232D]/60 bg-gradient-to-r from-rose-50/70 via-white to-rose-50/50 p-3.5 text-center shadow-2xs">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Pickup code
                  </p>
                  <p className="mt-1 font-mono text-xl font-black tracking-[0.22em] text-[#D9232D] break-all sm:text-2xl">
                    {pickupToken}
                  </p>
                  <p className="mt-1 text-[10.5px] font-semibold text-slate-500">
                    Show this code at the store
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-[10.5px] font-bold text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Free Workshop Seat Fitment</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Quality Checked Before Handover</span>
                  </span>
                </div>
              )}
            </div>

            {/* Right Column: Financial Summary Card */}
            <div className="w-full overflow-hidden rounded-2xl border border-slate-200/95 bg-[#F8FAFC] text-xs shadow-2xs sm:col-span-5">
              <div className="space-y-2 p-3.5 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Subtotal</span>
                  <span className="font-mono font-bold text-slate-800 tabular-nums">
                    {money(order.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Workshop Fitment</span>
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-emerald-700">
                    Complimentary
                  </span>
                </div>
                {order.discount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Discount</span>
                    <span className="font-mono font-extrabold text-emerald-700 tabular-nums">
                      - {money(order.discount)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-baseline justify-between border-t border-slate-200/90 bg-slate-900 px-3.5 py-3 text-white sm:px-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Total
                </span>
                <span className="font-mono text-lg font-black text-white tabular-nums">
                  {money(order.total)}
                </span>
              </div>

              {!paid && payAtStore ? (
                <div className="flex items-center justify-between border-t border-amber-200/80 bg-amber-50 px-3.5 py-2 text-[11px] font-extrabold text-amber-900 sm:px-4">
                  <span>Balance due at store</span>
                  <span className="font-mono tabular-nums">{money(order.total)}</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Workshop Terms & Guarantee Policy + Authorised Signature Footer */}
        <footer className="border-t border-slate-200/95 bg-gradient-to-b from-slate-50/90 to-slate-100/75 px-4 py-4 text-[10.5px] leading-relaxed text-slate-600 sm:px-9 sm:py-5">
          <div
            data-testid="invoice-terms-policy-card"
            className="overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-2xs"
          >
            {/* Dark Executive Policy Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-3.5 py-2.5 text-white sm:px-4">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/10 text-rose-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-black tracking-tight text-white">
                  Workshop Terms &amp; Guarantee Policy
                </p>
              </div>
              <span className="rounded-lg bg-[#D9232D] px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-white shadow-2xs">
                Store Pickup Only · No Online Delivery
              </span>
            </div>

            {/* 2x2 Structured Policy Clauses Grid */}
            <div className="grid grid-cols-1 gap-2.5 bg-slate-50/60 p-3 sm:grid-cols-2 sm:p-3.5">
              {invoiceTerms.clauses.map((clause, idx) => {
                const badgeMeta = [
                  {
                    tag: 'In-Store Handover',
                    accent: 'border-l-[#D9232D]',
                    numBg: 'bg-rose-50 text-[#D9232D] border-rose-200/80',
                    tagBg: 'bg-rose-50 text-rose-800',
                  },
                  {
                    tag: 'Standard OEM Fit',
                    accent: 'border-l-amber-500',
                    numBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
                    tagBg: 'bg-amber-50 text-amber-800',
                  },
                  {
                    tag: '7-Day Inspection',
                    accent: 'border-l-sky-600',
                    numBg: 'bg-sky-50 text-sky-800 border-sky-200/80',
                    tagBg: 'bg-sky-50 text-sky-800',
                  },
                  {
                    tag: 'Warranty Rules',
                    accent: 'border-l-emerald-600',
                    numBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
                    tagBg: 'bg-emerald-50 text-emerald-800',
                  },
                ][idx % 4];

                return (
                  <div
                    key={clause.number}
                    className={`flex flex-col justify-between rounded-xl border border-slate-200/90 border-l-4 ${badgeMeta.accent} bg-white p-3 shadow-2xs`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-black text-slate-950 leading-snug">
                          <span
                            className={`inline-flex h-5 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-[10px] font-black ${badgeMeta.numBg}`}
                          >
                            {clause.number}.
                          </span>
                          <span>{clause.title}</span>
                        </p>
                        <span
                          className={`hidden shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide sm:inline-block ${badgeMeta.tagBg}`}
                        >
                          {badgeMeta.tag}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">
                        {clause.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-start justify-between gap-4 border-t border-slate-200/90 pt-3.5 sm:flex-row sm:items-end">
            <div className="min-w-0 text-[11px] text-slate-500">
              <p className="font-extrabold text-slate-900">
                Thank you for shopping with {store.name}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Visit our Berhampore workshop with this receipt or your Order ID for pickup &amp;
                complimentary seat installation.
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <div className="mb-1 flex h-12 w-40 items-end justify-start border-b border-slate-400 pb-1 sm:justify-end">
                {!signatureFailed && (
                  <img
                    src={AUTHORISED_SIGNATURE_SRC}
                    alt={`Authorised signature for ${store.name}`}
                    onError={() => setSignatureFailed(true)}
                    className="max-h-10 w-auto max-w-[152px] object-contain"
                  />
                )}
              </div>
              <p className="font-bold text-slate-800">Authorised signature</p>
              <p className="text-[10px] font-medium text-slate-400">For {store.name}</p>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
};

export default InvoiceTemplate;
