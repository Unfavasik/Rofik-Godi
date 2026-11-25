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
  Wrench,
  XCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { CustomerOrderRecord, Product } from '../types';
import { WORKSHOP_INFO } from '../data/products';
import { downloadOrderInvoice, resolveOrderItemImageUrl } from '../lib/orderInvoice';
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

const InvoiceItemThumb: React.FC<{ src: string | null; alt: string }> = ({ src, alt }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src && failedSrc !== src);

  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-slate-300 shadow-xs sm:h-13 sm:w-13">
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
          resolvedImage: resolveOrderItemImageUrl(item, products),
          itemGuarantee: resolveSpecificProductGuarantee(rawGuaranteeDate),
          rawGuaranteeDate: normalizeGuaranteeDate(rawGuaranteeDate),
        };
      }),
    [items, findMatchingProduct, dbGuaranteeByKey, products],
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
        products,
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
    <div className="min-h-screen overflow-x-hidden bg-[#F6F7FA] px-2 py-3 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>

      {/* Crisp Single-Row Sticky Action Bar */}
      <div className="no-print sticky top-2 z-20 mx-auto mb-3.5 flex max-w-[210mm] items-center justify-between gap-2 rounded-full border border-[#E2E8F0] bg-white/95 px-2.5 py-1.5 shadow-[0_10px_28px_-14px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:mb-5 sm:px-3.5 sm:py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8.5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[11px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950 active:scale-[0.98] sm:h-9 sm:px-3.5 sm:text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Close</span>
            </button>
          ) : null}

          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#FFF1F2] to-[#FFE4E6] text-[#BE123C] sm:grid">
              <FileCheck2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                <p className="hidden truncate font-bold text-slate-900 sm:block">Official Invoice</p>
                <span aria-hidden="true" className="hidden text-slate-300 sm:inline">
                  ·
                </span>
                <span
                  className={`shrink-0 font-bold ${
                    paid ? 'text-[#047857]' : 'text-[#B45309]'
                  }`}
                >
                  {paid ? 'Paid' : 'Pending'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyOrderNumber()}
                title="Copy invoice number"
                className="group flex max-w-full items-center gap-1 font-mono text-[10px] font-semibold text-slate-500 tabular-nums transition hover:text-[#BE123C] sm:text-[11px]"
              >
                <span className="truncate">#{order.order_number}</span>
                {copiedOrderNo ? (
                  <Check className="h-2.5 w-2.5 shrink-0 text-[#059669]" />
                ) : (
                  <Copy className="h-2.5 w-2.5 shrink-0 opacity-60 group-hover:opacity-100" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            disabled={downloadingPdf}
            onClick={() => void handleDownloadPdf()}
            className="inline-flex h-8.5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#FECDD3] bg-[#FFF5F6] px-2.5 text-[11px] font-bold text-[#BE123C] transition hover:border-[#FDA4AF] hover:bg-[#FFE4E6] active:scale-[0.98] disabled:opacity-60 sm:h-9 sm:px-3.5 sm:text-xs"
          >
            {downloaded ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#047857]" />
                <span className="text-[#047857]">Saved PDF</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>{downloadingPdf ? 'Saving PDF…' : 'Download PDF'}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-8.5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#D9232D] to-[#BE123C] px-3 text-[11px] font-bold text-white shadow-[0_8px_18px_-6px_rgba(217,35,45,0.48)] transition hover:brightness-105 active:scale-[0.98] sm:h-9 sm:px-4 sm:text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Elevated Porcelain Paper Invoice Sheet */}
      <article
        id="invoice-sheet"
        className="mx-auto flex min-h-0 w-full max-w-full flex-col overflow-hidden rounded-[22px] border border-[#E2E8F0] bg-white text-slate-800 shadow-[0_22px_56px_-24px_rgba(15,23,42,0.14)] sm:min-h-[297mm] sm:max-w-[210mm] sm:rounded-[26px] print:rounded-none print:border-0 print:shadow-none"
      >
        {/* Signature Crimson-to-Teal Top Accent Ribbon */}
        <div className="h-2 w-full shrink-0 bg-gradient-to-r from-[#B91C1C] via-[#E11D48] to-[#0D9488]" />

        {/* Airy Workshop Letterhead + Aligned Receipt Strip */}
        <header className="border-b border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white px-4 py-5 sm:px-9 sm:py-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#D9232D] to-[#9F1239] text-white shadow-[0_8px_18px_-8px_rgba(217,35,45,0.55)] sm:h-11 sm:w-11">
                <span className="font-mono text-xs font-black tracking-tight">RGC</span>
              </div>
              <div className="min-w-0">
                <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-[#D9232D] sm:text-[10.5px]">
                  Custom Seat Cover Workshop
                </p>
                <h1 className="mt-0.5 text-[15.5px] leading-tight font-extrabold tracking-tight text-slate-950 break-words sm:text-2xl">
                  {store.name}
                </h1>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="hidden text-[10px] font-semibold text-slate-400 sm:block">
                Tax &amp; Workshop Receipt
              </p>
              <div className="flex items-center justify-end gap-1.5 sm:mt-0.5 sm:gap-2">
                <span className="text-[15px] font-extrabold tracking-tight text-slate-900 sm:text-xl">
                  Invoice
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
                    paid
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-amber-300 bg-amber-50 text-amber-800'
                  }`}
                >
                  {paid ? 'PAID' : (order.payment_status || 'PENDING').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-600">
            <span className="inline-flex items-start gap-1.5 leading-snug">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9232D]" />
              <span>{store.address}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
              <Phone className="h-3 w-3 shrink-0 text-[#059669]" />
              <span>{store.phone}</span>
            </span>
            {store.email ? (
              <span className="inline-flex items-center gap-1.5 font-medium break-all">
                <Mail className="h-3 w-3 shrink-0 text-[#BE123C]" />
                <span>{store.email}</span>
              </span>
            ) : null}
            {store.gstin ? (
              <span className="font-mono text-[10.5px] font-medium text-stone-500">
                GSTIN: {store.gstin}
              </span>
            ) : null}
          </div>

          {/* Clean Tinted 3-Cell Receipt Metadata Strip */}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-3 text-[11px] sm:grid-cols-3 sm:px-4">
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold text-slate-400">Receipt No.</dt>
              <dd className="mt-0.5 truncate font-mono font-bold text-slate-900 tabular-nums">
                {order.order_number}
              </dd>
            </div>
            <div className="min-w-0 text-right sm:text-left">
              <dt className="text-[10px] font-semibold text-slate-400">Issued</dt>
              <dd className="mt-0.5 font-semibold text-slate-700 tabular-nums">
                {dateLabel(order.created_at)}
              </dd>
            </div>
            <div className="col-span-2 flex items-center justify-between border-t border-[#E2E8F0] pt-2 sm:col-span-1 sm:block sm:border-t-0 sm:pt-0 sm:text-right">
              <dt className="text-[10px] font-semibold text-slate-400">Mode</dt>
              <dd className="font-bold text-[#BE123C] sm:mt-0.5">Workshop Pickup</dd>
            </div>
          </dl>
        </header>

        <div className="min-w-0 flex-1 space-y-5 px-4 py-5 sm:px-9 sm:py-6">
          {/* Balanced Party, Payment & Pickup Ledger */}
          <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]/80 text-xs">
            <div className="grid grid-cols-2 divide-x divide-[#E2E8F0] sm:grid-cols-3">
              {/* Billed To */}
              <div className="min-w-0 p-3.5 sm:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Billed to
                </p>
                <p className="mt-1 text-[13px] font-bold text-slate-950 break-words">
                  {order.customer_name}
                </p>
                <p className="mt-0.5 font-mono text-[11px] font-medium text-slate-600 tabular-nums break-words">
                  {order.customer_phone || '-'}
                </p>
              </div>

              {/* Payment */}
              <div className="min-w-0 p-3.5 text-right sm:order-3 sm:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Payment
                </p>
                <p
                  className={`mt-1 text-[13px] font-bold ${
                    paid ? 'text-[#047857]' : 'text-slate-950'
                  }`}
                >
                  {payAtStore
                    ? paid
                      ? 'Paid at store'
                      : 'Pay at store'
                    : paid
                      ? 'Paid online'
                      : 'Pay online'}
                </p>
                <p className="mt-0.5 text-[10.5px] text-slate-500">
                  {paid
                    ? 'Settlement complete'
                    : payAtStore
                      ? 'Collect at handover'
                      : 'Awaiting settlement'}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  Status: {String(order.status || 'NEW').replace(/_/g, ' ')}
                </p>
              </div>

              {/* Workshop Pickup */}
              <div className="col-span-2 min-w-0 border-t border-[#E2E8F0] bg-white/75 p-3.5 sm:order-2 sm:col-span-1 sm:border-t-0 sm:bg-transparent sm:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#BE123C]/85">
                  Workshop pickup (No online delivery)
                </p>
                <p className="mt-1 text-[13px] font-bold text-slate-950 break-words">
                  {order.pickup_store || store.name}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">
                  {pickupToken
                    ? 'Collect in person with your pickup code · Free on-spot seat fitment'
                    : 'Collect in person at the pickup store · Free on-spot seat fitment'}
                </p>
              </div>
            </div>

            {order.vehicle_model ? (
              <div className="flex items-center gap-2 border-t border-[#E2E8F0] bg-[#FFF5F6]/70 px-3.5 py-2.5 text-[11px] font-bold text-slate-800 sm:px-4">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#FFE4E6] text-[#BE123C]">
                  <Wrench className="h-3 w-3" />
                </span>
                <span className="truncate">Vehicle: {order.vehicle_model}</span>
              </div>
            ) : null}
          </section>

          {/* Itemized Order Schedule */}
          <section>
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <p className="text-xs font-extrabold text-slate-900">Itemized Order Schedule</p>
              <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums">
                {enrichedItems.length} {enrichedItems.length === 1 ? 'Item' : 'Items'} · {totalUnits}{' '}
                {totalUnits === 1 ? 'Unit' : 'Units'}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
              {/* Desktop Aligned Column Header */}
              <div className="hidden grid-cols-[2.25rem_minmax(0,1fr)_5.5rem_3.25rem_6rem] items-center border-b border-[#E2E8F0] bg-[#F1F5F9] px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 sm:grid">
                <span>#</span>
                <span>Item Description</span>
                <span className="text-right">Price</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Amount</span>
              </div>

              <div className="divide-y divide-[#F1F5F9]">
                {enrichedItems.map((item, index) => {
                  const specs = [
                    item.color ? `Colour: ${item.color}` : '',
                    item.selected_thickness ? `Thickness: ${item.selected_thickness}` : '',
                    item.selected_stitch ? `Stitch: ${item.selected_stitch}` : '',
                    item.custom_embroidery_text ? `Embroidery: ${item.custom_embroidery_text}` : '',
                  ].filter(Boolean);

                  return (
                    <div
                      key={index}
                      className="p-3.5 transition-colors hover:bg-[#F8FAFC] sm:grid sm:grid-cols-[2.25rem_minmax(0,1fr)_5.5rem_3.25rem_6rem] sm:items-center sm:px-4 sm:py-3.5"
                    >
                      <span className="hidden font-mono text-[11px] font-bold text-slate-400 tabular-nums sm:block">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div className="min-w-0 sm:pr-3">
                        <div className="flex items-start gap-3">
                          <InvoiceItemThumb
                            src={item.resolvedImage}
                            alt={item.product_name || 'Ordered item'}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-bold leading-snug text-slate-950 break-words">
                                {item.product_name}
                              </p>
                              <span className="shrink-0 font-mono text-[13px] font-extrabold text-slate-950 tabular-nums sm:hidden">
                                {money(lineTotal(item))}
                              </span>
                            </div>

                            {specs.length > 0 ? (
                              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                {specs.join(' · ')}
                              </p>
                            ) : null}

                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10.5px] font-medium text-slate-400 tabular-nums sm:hidden">
                                {money(item.unit_price)} × {item.quantity}
                              </span>
                              {item.itemGuarantee ? (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                                  <ShieldCheck className="h-3 w-3 shrink-0 text-[#059669]" />
                                  <span>
                                    Guarantee until {item.itemGuarantee.validUntilLabel}
                                  </span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <span className="hidden text-right font-mono text-[11.5px] font-medium text-slate-600 tabular-nums whitespace-nowrap sm:block">
                        {money(item.unit_price)}
                      </span>
                      <div className="hidden text-center sm:block">
                        <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[11.5px] font-bold text-slate-700 tabular-nums">
                          {item.quantity}
                        </span>
                      </div>
                      <span className="hidden text-right font-mono text-[12.5px] font-extrabold text-slate-950 tabular-nums whitespace-nowrap sm:block">
                        {money(lineTotal(item))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Unified Totals Summary (with Amount in Words) & Pickup Voucher */}
          <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-12 sm:items-start sm:gap-4">
            {/* Financial Summary + Amount in Words */}
            <div className="flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs sm:order-2 sm:col-span-6">
              <div className="space-y-2 p-3.5 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {money(order.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Workshop Fitment</span>
                  <span className="text-[11px] font-bold text-[#047857]">Complimentary</span>
                </div>
                {order.discount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Discount</span>
                    <span className="font-mono font-bold text-[#047857] tabular-nums">
                      - {money(order.discount)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="flex items-baseline justify-between border-t border-[#FECDD3] bg-[#FFF5F6] px-3.5 py-3 sm:px-4">
                  <span className="text-xs font-extrabold text-[#9F1239]">Total</span>
                  <span className="font-mono text-lg font-extrabold text-slate-950 tabular-nums">
                    {money(order.total)}
                  </span>
                </div>

                {!paid && payAtStore ? (
                  <div className="flex items-center justify-between border-t border-amber-200 bg-amber-50/90 px-3.5 py-2 text-[11px] font-bold text-amber-900 sm:px-4">
                    <span>Balance due at store</span>
                    <span className="font-mono tabular-nums">{money(order.total)}</span>
                  </div>
                ) : null}

                <div className="border-t border-[#E2E8F0] bg-white px-3.5 py-2.5 sm:px-4">
                  <p className="text-[10px] font-medium text-slate-400">Amount in words</p>
                  <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-700 break-words">
                    {amountInWords(order.total)}
                  </p>
                </div>
              </div>
            </div>

            {/* Workshop Promise / Pickup Code */}
            <div className="flex flex-col gap-3 sm:order-1 sm:col-span-6">
              {pickupToken ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#FB7185]/70 bg-gradient-to-br from-[#FFF5F6] to-white p-4 text-center">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#BE123C]">
                    Pickup code
                  </p>
                  <p className="mt-1 font-mono text-xl font-extrabold tracking-[0.2em] text-[#BE123C] break-all sm:text-2xl">
                    {pickupToken}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    Show this code at the store
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3.5 text-[11px] font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#059669]" />
                  <span>Free Workshop Seat Fitment</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#059669]" />
                  <span>Quality Checked Before Handover</span>
                </span>
              </div>
            </div>
          </section>

          {/* Compact Emerald Workshop Guarantee Certificate + QR Seal */}
          {guaranteeInfo.enabled && (
            <section
              aria-label="Product guarantee validity"
              data-testid="invoice-guarantee-card"
              className="overflow-hidden rounded-2xl border border-[#A7F3D0] bg-[#F0FDF4] text-xs shadow-[0_8px_24px_-18px_rgba(5,150,105,0.28)]"
            >
              {/* Certificate Header */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#BBF7D0] bg-gradient-to-r from-[#ECFDF5] to-[#F0FDF4] px-3.5 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#059669] text-white shadow-xs">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#047857]">
                      Official Workshop Guarantee Certificate
                    </p>
                    <p className="text-[12.5px] font-bold tracking-tight text-slate-900 sm:text-[13px]">
                      Replacement Guarantee:{' '}
                      <span className="text-[#047857]">
                        Valid until {guaranteeInfo.validUntilLabel}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-600 tabular-nums">
                    <Calendar className="h-3 w-3 text-[#059669]" />
                    <span>Expires {guaranteeInfo.validUntilLabel}</span>
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      guaranteeInfo.isActive
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                        : 'border-slate-300 bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {guaranteeInfo.isActive ? 'Guarantee Active' : 'Guarantee Expired'}
                  </span>
                </div>
              </div>

              {/* Coverage + Excluded + Dynamic QR Verification */}
              <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-12 sm:gap-3 sm:p-3.5">
                <div className="grid grid-cols-1 gap-2.5 sm:col-span-9 sm:grid-cols-2">
                  {/* Covered Panel */}
                  <div className="flex flex-col justify-between rounded-xl border border-[#BBF7D0] bg-white p-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#047857]">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#059669]" />
                        <span>Covered Under Normal Everyday Use</span>
                      </p>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">
                        Free workshop replacement before{' '}
                        <strong className="font-bold text-slate-900">
                          {guaranteeInfo.validUntilLabel}
                        </strong>{' '}
                        for natural splitting/cracking, seam tearing, or rexine/leatherette surface
                        peeling.
                      </p>
                    </div>
                    <p className="mt-2 border-t border-emerald-100 pt-1.5 text-[10px] font-semibold text-[#047857]">
                      Natural Cracking · Seam Tearing · Rexine Peeling
                    </p>
                  </div>

                  {/* Void / Excluded Panel */}
                  <div className="flex flex-col justify-between rounded-xl border border-[#FECDD3] bg-[#FFF5F6] p-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#BE123C]">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        <span>Guarantee Void / Strictly Excluded</span>
                      </p>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">
                        <XCircle
                          aria-hidden="true"
                          className="mr-1 inline h-3 w-3 align-text-bottom text-[#E11D48]"
                        />
                        Not valid for cat or animal scratches, bilet / blade or sharp-object cuts,
                        fire or burn damage, or intentional misuse.
                      </p>
                    </div>
                    <p className="mt-2 border-t border-[#FECDD3]/70 pt-1.5 text-[10px] font-semibold text-[#BE123C]">
                      Cat Scratches · Bilet / Blade Cuts · Fire / Burn · Self-Damage
                    </p>
                  </div>
                </div>

                {/* QR Verification Stamp */}
                <div
                  data-testid="guarantee-certificate-qr"
                  className="flex flex-row items-center justify-between gap-3 rounded-xl border border-[#BBF7D0] bg-white p-2.5 sm:col-span-3 sm:flex-col sm:justify-center sm:p-3 sm:text-center"
                >
                  <div className="shrink-0 rounded-lg border border-[#E2E8F0] bg-white p-1.5">
                    <QRCodeSVG
                      value={guaranteeVerificationUrl}
                      size={60}
                      level="M"
                      includeMargin={false}
                      title={`Verify guarantee and invoice for order ${order.order_number}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1 sm:flex-initial">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#047857]">
                      Scan to Verify
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                      Original Invoice &amp; Guarantee
                    </p>
                    <a
                      href={guaranteeVerificationUrl}
                      data-testid="guarantee-verification-link"
                      className="mt-1 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[9.5px] font-bold text-[#047857] tabular-nums transition hover:bg-emerald-100"
                    >
                      <span className="truncate">#{order.order_number}</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* 7-Point Workshop Terms & Guarantee Policy + Gratitude Footer */}
        <footer className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4 text-[10.5px] leading-relaxed text-slate-600 sm:px-9 sm:py-5">
          <div
            data-testid="invoice-terms-policy-card"
            className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 sm:px-4">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#D9232D] text-white shadow-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-extrabold tracking-wide text-slate-900">
                  {invoiceTerms.policyHeading}
                </p>
              </div>
              <span className="text-[10px] font-bold text-[#BE123C]">
                Store Pickup Only · No Online Delivery
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:gap-2.5 sm:p-3.5">
              {invoiceTerms.clauses.map((clause, idx) => {
                const badgePalette = 'bg-slate-100 text-slate-700';

                return (
                  <div
                    key={clause.number}
                    className={`rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/80 p-2.5 sm:p-3 ${
                      idx === invoiceTerms.clauses.length - 1 && invoiceTerms.clauses.length % 2 === 1
                        ? 'sm:col-span-2'
                        : ''
                    }`}
                  >
                    <p className="flex items-start gap-2 text-[11px] font-bold leading-snug text-slate-900">
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-extrabold ${badgePalette}`}
                      >
                        {clause.number}
                      </span>
                      <span className="pt-0.5">
                        {clause.title}:{' '}
                        <span className="font-normal text-slate-600">{clause.body}</span>
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#FECDD3] bg-gradient-to-r from-[#FFF5F6] via-white to-[#ECFDF5]/60 px-4 py-3.5 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#9F1239]">
                {invoiceTerms.closingTitle}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-[#047857]">
                {invoiceTerms.closingSubtitle}
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <div className="mb-1 flex h-11 w-36 items-end justify-start border-b border-slate-300 pb-1 sm:justify-end">
                {!signatureFailed && (
                  <img
                    src={AUTHORISED_SIGNATURE_SRC}
                    alt={`Authorised signature for ${store.name}`}
                    onError={() => setSignatureFailed(true)}
                    className="max-h-9 w-auto max-w-[140px] object-contain"
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
