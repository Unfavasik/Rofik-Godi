import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Download, Package, Printer } from 'lucide-react';
import type { CustomerOrderRecord, Product } from '../types';
import { WORKSHOP_INFO } from '../data/products';
import { downloadOrderInvoice } from '../lib/orderInvoice';
import {
  buildInvoiceTermsText,
  resolveProductGuarantee,
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
    <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200/90 bg-slate-50 text-slate-300 sm:h-12 sm:w-12">
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
  const [signatureFailed, setSignatureFailed] = useState(false);
  const liveGuaranteePolicy = useProductGuaranteePolicy();
  const activeGuaranteePolicy = guaranteePolicy ?? liveGuaranteePolicy;
  const paid = order.payment_status?.toUpperCase() === 'PAID';
  const payAtStore = order.payment_method?.toLowerCase() === 'pay_at_store';
  const items = useMemo(() => order.order_items || [], [order.order_items]);
  const lineTotal = (i: CustomerOrderRecord['order_items'][number]) => i.unit_price * i.quantity;

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const enrichedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        resolvedImage: resolveOrderItemImage(item, productsById),
      })),
    [items, productsById],
  );

  const productOverrideDate = useMemo(() => {
    for (const item of items) {
      const matched = item.product_id ? productsById.get(item.product_id) : undefined;
      if (matched?.guaranteeValidUntil) return matched.guaranteeValidUntil;
    }
    return null;
  }, [items, productsById]);

  const guaranteeInfo = useMemo(
    () =>
      resolveProductGuarantee(activeGuaranteePolicy, {
        referenceDate: order.created_at,
        productOverrideDate,
      }),
    [activeGuaranteePolicy, order.created_at, productOverrideDate],
  );

  const invoiceTerms = useMemo(() => buildInvoiceTermsText(guaranteeInfo), [guaranteeInfo]);

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const orderWithImages: CustomerOrderRecord = {
        ...order,
        order_items: enrichedItems.map(({ resolvedImage, ...rest }) => ({
          ...rest,
          image_url: resolvedImage,
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#EEF2F6] px-3 py-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-7 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>

      {/* Preview Action Toolbar */}
      <div className="no-print mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/80 bg-white/85 px-3 py-2.5 shadow-[0_8px_28px_-14px_rgba(15,23,42,0.14)] backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Close</span>
            </button>
          ) : null}
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs font-extrabold text-slate-900">Order Receipt</p>
            <p className="truncate font-mono text-[11px] font-semibold text-slate-500 tabular-nums">
              #{order.order_number}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={downloadingPdf}
            onClick={() => void handleDownloadPdf()}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60"
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
            className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-[#D9232D] px-4 py-2 text-xs font-extrabold text-white shadow-[0_6px_18px_-6px_rgba(217,35,45,0.55)] transition hover:bg-[#BF1B24] active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Crisp Modern Workshop Receipt Sheet */}
      <article
        id="invoice-sheet"
        className="mx-auto flex min-h-0 sm:min-h-[297mm] w-full max-w-full sm:max-w-[210mm] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-[0_22px_54px_-24px_rgba(15,23,42,0.22)] print:rounded-none print:border-0"
      >
        <div className="h-1.5 w-full shrink-0 bg-[#D9232D]" />

        {/* Editorial Store & Receipt Header */}
        <header className="border-b border-slate-200 px-5 py-6 sm:px-9 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wide text-[#D9232D]">
                Custom Seat Cover Workshop
              </p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 break-words sm:text-2xl">
                {store.name}
              </h1>
              <p className="mt-2 max-w-[300px] text-xs leading-relaxed text-slate-600 break-words">
                {store.address}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500">
                <span className="tabular-nums">{store.phone}</span>
                {store.email ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="break-all">{store.email}</span>
                  </>
                ) : null}
              </div>
              {store.gstin ? (
                <p className="mt-1 font-mono text-[11px] text-slate-500">GSTIN: {store.gstin}</p>
              ) : null}
            </div>

            <div className="shrink-0 text-left sm:text-right">
              <p className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Invoice
              </p>
              <dl className="mt-2.5 space-y-1 text-xs">
                <div className="flex items-center gap-2 sm:justify-end">
                  <dt className="font-medium text-slate-400">Receipt No.</dt>
                  <dd className="font-mono font-bold text-slate-900 tabular-nums">
                    {order.order_number}
                  </dd>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <dt className="font-medium text-slate-400">Issued</dt>
                  <dd className="font-semibold text-slate-700 tabular-nums">
                    {dateLabel(order.created_at)}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex sm:justify-end">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${
                    paid
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {paid ? 'PAID' : (order.payment_status || 'PENDING').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1 px-5 py-6 sm:px-9 sm:py-7">
          {/* Customer, Pickup & Payment Metadata Band */}
          <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-4 text-xs sm:grid-cols-3 sm:gap-6 sm:p-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400">Billed to</p>
              <p className="mt-1 text-sm font-extrabold text-slate-900 break-words">
                {order.customer_name}
              </p>
              <p className="mt-0.5 font-medium text-slate-600 tabular-nums break-words">
                {order.customer_phone || '-'}
              </p>
              {order.vehicle_model ? (
                <p className="mt-1 text-[11px] font-semibold text-slate-600 break-words">
                  Vehicle: {order.vehicle_model}
                </p>
              ) : null}
            </div>

            <div className="min-w-0 border-t border-slate-200/70 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="text-[11px] font-semibold text-slate-400">Store pickup</p>
              <p className="mt-1 text-sm font-extrabold text-slate-900 break-words">
                {order.pickup_store || store.name}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                {pickupToken
                  ? 'Collect in person and show your pickup code'
                  : 'Collect in person at the pickup store'}
              </p>
            </div>

            <div className="min-w-0 border-t border-slate-200/70 pt-3 text-left sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
              <p className="text-[11px] font-semibold text-slate-400">Payment</p>
              <p className="mt-1 text-sm font-extrabold text-slate-900">
                {payAtStore
                  ? paid
                    ? 'Paid at store'
                    : 'Pay at store'
                  : paid
                    ? 'Paid online'
                    : 'Pay online'}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {paid ? 'Settlement complete' : payAtStore ? 'Collect at handover' : 'Awaiting settlement'}
              </p>
            </div>
          </section>

          {guaranteeInfo.enabled && (
            <section
              aria-label="Product guarantee validity"
              className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/55 px-4 py-2.5 text-xs"
            >
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900">
                  Replacement Guarantee:{' '}
                  <span className="text-emerald-800">
                    Valid until {guaranteeInfo.validUntilLabel}
                  </span>
                </p>
                <p className="mt-0.5 text-[10.5px] font-medium text-slate-600">
                  Covers normal-use splitting, seam tearing &amp; rexine peeling before expiry ·
                  Excludes cat/animal scratches, blade cuts, fire &amp; intentional damage
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                  guaranteeInfo.isActive
                    ? 'border-emerald-300 bg-white text-emerald-700'
                    : 'border-slate-300 bg-white text-slate-500'
                }`}
              >
                {guaranteeInfo.isActive ? 'Guarantee Active' : 'Guarantee Expired'}
              </span>
            </section>
          )}

          {/* Line Items Ledger */}
          <div className="mt-7 w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-y border-slate-900 bg-slate-900 text-[11px] font-bold text-white">
                  <th className="w-9 py-2.5 pl-3">#</th>
                  <th className="py-2.5">Item</th>
                  <th className="py-2.5 text-right">Price</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 pr-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {enrichedItems.map((item, index) => {
                  const specs = [
                    item.color ? `Colour: ${item.color}` : '',
                    item.selected_thickness ? `Thickness: ${item.selected_thickness}` : '',
                    item.selected_stitch ? `Stitch: ${item.selected_stitch}` : '',
                    item.custom_embroidery_text ? `Embroidery: ${item.custom_embroidery_text}` : '',
                  ].filter(Boolean);
                  return (
                    <tr key={index} className="align-middle">
                      <td className="py-3.5 pl-3 font-mono text-[11px] text-slate-400 tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-3">
                          <InvoiceItemThumb
                            src={item.resolvedImage}
                            alt={item.product_name || 'Ordered item'}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 break-words">
                              {item.product_name}
                            </p>
                            {specs.length > 0 ? (
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {specs.join(' · ')}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-right font-medium text-slate-700 tabular-nums whitespace-nowrap">
                        {money(item.unit_price)}
                      </td>
                      <td className="py-3.5 text-center font-semibold text-slate-700 tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 pr-3 text-right font-extrabold text-slate-950 tabular-nums whitespace-nowrap">
                        {money(lineTotal(item))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Ledger & Amount in Words */}
          <section className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-[320px] min-w-0 text-xs">
              <p className="text-[11px] font-semibold text-slate-400">Amount in words</p>
              <p className="mt-1 font-bold leading-relaxed text-slate-800 break-words">
                {amountInWords(order.total)}
              </p>

              {pickupToken ? (
                <div className="mt-5 rounded-xl border border-dashed border-[#D9232D]/60 bg-rose-50/45 p-4 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">Pickup code</p>
                  <p className="mt-1 font-mono text-2xl font-black tracking-[0.22em] text-[#D9232D] break-all">
                    {pickupToken}
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-slate-500">
                    Show this code at the store
                  </p>
                </div>
              ) : null}
            </div>

            <div className="w-full shrink-0 rounded-xl border border-slate-200/90 bg-[#F8FAFC] p-4 text-xs sm:w-[260px]">
              <div className="flex justify-between py-1.5">
                <span className="font-medium text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {money(order.subtotal)}
                </span>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between py-1.5">
                  <span className="font-medium text-slate-500">Discount</span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    - {money(order.discount)}
                  </span>
                </div>
              ) : null}
              <div className="mt-2.5 flex items-baseline justify-between border-t border-slate-300 pt-3">
                <span className="text-sm font-black text-slate-900">Total</span>
                <span className="text-lg font-black text-slate-950 tabular-nums">
                  {money(order.total)}
                </span>
              </div>
              {!paid && payAtStore ? (
                <div className="mt-2 flex justify-between rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800">
                  <span>Balance due at store</span>
                  <span className="tabular-nums">{money(order.total)}</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Receipt Terms & Authorised Signature Footer */}
        <footer className="border-t border-slate-200 bg-slate-50/40 px-5 py-5 text-[10.5px] leading-relaxed text-slate-500 sm:px-9 sm:py-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[400px] min-w-0">
              <p className="font-bold text-slate-700">Terms &amp; Guarantee Policy</p>
              <p className="mt-1">{invoiceTerms.returnPolicyText}</p>
              <p className="mt-1.5 font-medium text-slate-600">{invoiceTerms.guaranteePolicyText}</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <div className="mb-1.5 flex h-14 w-44 items-end justify-start border-b border-slate-400 pb-1.5 sm:justify-end">
                {!signatureFailed && (
                  <img
                    src={AUTHORISED_SIGNATURE_SRC}
                    alt={`Authorised signature for ${store.name}`}
                    onError={() => setSignatureFailed(true)}
                    className="max-h-11 w-auto max-w-[168px] object-contain"
                  />
                )}
              </div>
              <p className="font-semibold text-slate-700">Authorised signature</p>
              <p className="text-[10px] text-slate-400">For {store.name}</p>
            </div>
          </div>
          <p className="mt-5 border-t border-slate-200/80 pt-3.5 text-center text-[11px] font-semibold text-slate-600">
            Thank you for shopping with {store.name}
          </p>
        </footer>
      </article>
    </div>
  );
};

export default InvoiceTemplate;
