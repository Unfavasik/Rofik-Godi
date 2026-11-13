import React from 'react';
import { Printer } from 'lucide-react';
import type { CustomerOrderRecord } from '../types';
import { WORKSHOP_INFO } from '../data/products';

export type InvoiceStore = {
  name: string;
  address: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  gstin?: string;
};

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

const dateLabel = (v: string) =>
  new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

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
  #invoice-sheet { position: absolute; left: 0; top: 0; width: 210mm; min-height: 297mm; box-shadow: none !important; margin: 0 !important; }
  .no-print { display: none !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export const InvoiceTemplate: React.FC<{
  order: CustomerOrderRecord;
  store?: InvoiceStore;
  pickupToken?: string;
  onClose?: () => void;
}> = ({ order, store = DEFAULT_STORE, pickupToken, onClose }) => {
  const paid = order.payment_status?.toUpperCase() === 'PAID';
  const payAtStore = order.payment_method?.toLowerCase() === 'pay_at_store';
  const items = order.order_items || [];
  const lineTotal = (i: CustomerOrderRecord['order_items'][number]) => i.unit_price * i.quantity;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-200 px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2">
        {onClose ? (
          <button
            onClick={onClose}
            className="min-h-11 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm"
          >
            Close
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D9232D] px-4 py-2 text-xs font-bold text-white shadow-sm"
        >
          <Printer className="h-4 w-4" /> Print or save as PDF
        </button>
      </div>

      <article
        id="invoice-sheet"
        className="mx-auto flex min-h-0 sm:min-h-[297mm] w-full max-w-full sm:max-w-[210mm] flex-col overflow-hidden bg-white text-slate-900 shadow-xl"
        style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif" }}
      >
        {/* Header: the one bold element */}
        <header className="flex flex-col gap-4 bg-[#D9232D] px-4 py-5 text-white sm:flex-row sm:items-stretch sm:justify-between sm:px-8 sm:py-7">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight break-words">{store.name}</h1>
            <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-white/85 break-words">
              {store.address}
            </p>
            <p className="mt-1 text-[11px] text-white/85 break-all">
              {store.phone}
              {store.email ? `  |  ${store.email}` : ''}
            </p>
            {store.gstin ? (
              <p className="mt-1 text-[11px] text-white/85">GSTIN: {store.gstin}</p>
            ) : null}
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="text-2xl sm:text-3xl font-light tracking-wide">Invoice</p>
            <p className="mt-2 text-[11px] text-white/85">
              No. <b className="text-white">{order.order_number}</b>
            </p>
            <p className="text-[11px] text-white/85">Date: {dateLabel(order.created_at)}</p>
          </div>
        </header>

        <div className="min-w-0 flex-1 px-4 py-5 sm:px-8 sm:py-7">
          {/* Parties */}
          <section className="grid grid-cols-1 gap-4 text-[12px] sm:grid-cols-3 sm:gap-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400">Billed to</p>
              <p className="mt-1 text-sm font-bold break-words">{order.customer_name}</p>
              <p className="text-slate-600 break-words">{order.customer_phone || '-'}</p>
              {order.vehicle_model ? (
                <p className="text-slate-600 break-words">Vehicle: {order.vehicle_model}</p>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400">Store pickup</p>
              <p className="mt-1 font-bold break-words">{order.pickup_store || store.name}</p>
              <p className="text-slate-600">
                {pickupToken
                  ? 'Collect in person and show your pickup code'
                  : 'Collect in person at the pickup store'}
              </p>
            </div>
            <div className="min-w-0 text-left sm:text-right">
              <p className="text-[11px] font-semibold text-slate-400">Payment</p>
              <span
                className={`mt-1 inline-block rounded-md px-3 py-1 text-xs font-black ${
                  paid
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                }`}
              >
                {paid ? 'PAID' : (order.payment_status || 'PENDING').toUpperCase()}
              </span>
              <p className="mt-1 text-slate-600">
                {payAtStore
                  ? paid
                    ? 'Paid at store'
                    : 'Pay at store'
                  : paid
                    ? 'Paid online'
                    : 'Pay online'}
              </p>
            </div>
          </section>

          {/* Items */}
          <div className="mt-8 w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[460px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-y-2 border-slate-900 text-[11px] font-bold text-slate-700">
                <th className="w-8 py-2.5">#</th>
                <th className="py-2.5">Item</th>
                <th className="py-2.5 text-right">Price</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 align-top">
                  <td className="py-3 text-slate-400">{index + 1}</td>
                  <td className="py-3 pr-2">
                    <p className="font-bold break-words">{item.product_name}</p>
                    {item.color ? (
                      <p className="text-[11px] text-slate-500">Colour: {item.color}</p>
                    ) : null}
                  </td>
                  <td className="py-3 text-right tabular-nums whitespace-nowrap">{money(item.unit_price)}</td>
                  <td className="py-3 text-center tabular-nums">{item.quantity}</td>
                  <td className="py-3 text-right font-bold tabular-nums whitespace-nowrap">
                    {money(lineTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Totals */}
          <section className="mt-6 flex flex-col gap-5 sm:flex-row sm:justify-between sm:gap-8">
            <div className="max-w-[300px] min-w-0 text-[12px]">
              <p className="text-[11px] font-semibold text-slate-400">Amount in words</p>
              <p className="mt-1 font-semibold text-slate-700 break-words">{amountInWords(order.total)}</p>
              {pickupToken ? (
                <div className="mt-5 rounded-xl border border-dashed border-[#D9232D] p-4 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">Pickup code</p>
                  <p className="mt-1 text-2xl font-black tracking-[0.25em] text-[#D9232D] break-all">
                    {pickupToken}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">Show this code at the store</p>
                </div>
              ) : null}
            </div>
            <div className="w-full sm:w-[240px] shrink-0 text-[12px]">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Subtotal</span>
                <span className="tabular-nums">{money(order.subtotal)}</span>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Discount</span>
                  <span className="tabular-nums text-emerald-700">- {money(order.discount)}</span>
                </div>
              ) : null}
              <div className="mt-2 flex justify-between border-t-2 border-slate-900 pt-3 text-base font-black">
                <span>Total</span>
                <span className="tabular-nums">{money(order.total)}</span>
              </div>
              {!paid && payAtStore ? (
                <div className="mt-1 flex justify-between text-[11px] font-bold text-amber-700">
                  <span>Balance due at store</span>
                  <span className="tabular-nums">{money(order.total)}</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-4 py-5 text-[10.5px] leading-relaxed text-slate-500 sm:px-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[360px] min-w-0">
              <p className="font-bold text-slate-700">Terms</p>
              <p>
                Standard, non-customised items may be replaced within 7 days for stitching defects,
                incorrect fitment or transit damage if unused, uninstalled and returned with
                original packaging and tags. Personalised items are not returnable except for
                verified manufacturing defects. Approved refunds go to the original payment method
                within 3–5 working banking days. A 1-year stitching replacement guarantee applies
                under normal use.
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="mb-1 h-10 w-36 border-b border-slate-400" />
              <p>Authorised signature</p>
            </div>
          </div>
          <p className="mt-4 text-center font-semibold text-slate-600">
            Thank you for shopping with {store.name}
          </p>
        </footer>
      </article>
    </div>
  );
};

export default InvoiceTemplate;
