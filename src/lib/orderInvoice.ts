import { jsPDF } from 'jspdf';
import type { CustomerOrderRecord } from '../types';
import { WORKSHOP_INFO } from '../data/products';
import { isOrderComplete } from './orderPresentation';
import {
  buildInvoiceTermsText,
  readCachedProductGuaranteePolicy,
  resolveProductGuarantee,
  type ProductGuaranteePolicy,
} from './productGuarantee';

const AUTHORISED_SIGNATURE_PATH = '/assets/aistudio/brittany-signature_775bf19a.png';
const safeFilename = (value: string) => value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'order';
const amount = (value: number) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

async function loadImageAsDataUrl(
  src: string,
  format: 'PNG' | 'JPEG',
  targetSize?: { width: number; height: number },
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (value: { dataUrl: string; width: number; height: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 1800);
    if (!src.startsWith('/') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const w = targetSize?.width || img.naturalWidth || 160;
        const h = targetSize?.height || img.naturalHeight || 60;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        if (format === 'JPEG') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
        }
        if (targetSize) {
          const scale = Math.max(w / (img.naturalWidth || w), h / (img.naturalHeight || h));
          const drawW = (img.naturalWidth || w) * scale;
          const drawH = (img.naturalHeight || h) * scale;
          ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
        } else {
          ctx.drawImage(img, 0, 0, w, h);
        }
        const mime = format === 'PNG' ? 'image/png' : 'image/jpeg';
        finish({
          dataUrl: canvas.toDataURL(mime, 0.88),
          width: img.naturalWidth || w,
          height: img.naturalHeight || h,
        });
      } catch {
        finish(null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    img.src = src;
  });
}

export const downloadOrderInvoice = async (
  order: CustomerOrderRecord,
  customerName = order.customer_name,
  options?: {
    allowAnyStatus?: boolean;
    guaranteePolicy?: ProductGuaranteePolicy;
    productOverrideDate?: string | null;
  },
): Promise<boolean> => {
  if (!options?.allowAnyStatus && !isOrderComplete(order.status)) return false;

  const activePolicy = options?.guaranteePolicy ?? readCachedProductGuaranteePolicy();
  const guaranteeInfo = resolveProductGuarantee(activePolicy, {
    referenceDate: order.created_at,
    productOverrideDate: options?.productOverrideDate,
  });
  const invoiceTerms = buildInvoiceTermsText(guaranteeInfo);

  const items = order.order_items || [];
  const [signatureAsset, itemThumbAssets] = await Promise.all([
    loadImageAsDataUrl(AUTHORISED_SIGNATURE_PATH, 'PNG'),
    Promise.all(
      items.map((item) =>
        item.image_url ? loadImageAsDataUrl(item.image_url, 'JPEG', { width: 96, height: 96 }) : Promise.resolve(null),
      ),
    ),
  ]);

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 16;
  const right = pageWidth - margin;
  const paymentState = order.payment_status?.toLowerCase() === 'paid' ? 'PAID' : 'DUE AT PICKUP';

  pdf.setFillColor(217, 35, 45);
  pdf.rect(0, 0, pageWidth, 4, 'F');
  pdf.setTextColor(24, 26, 30);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('ROFIK GODI CENTRE', margin, 20);
  pdf.setTextColor(100, 105, 114);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(String(WORKSHOP_INFO.address || 'Murshidabad, West Bengal'), margin, 26);
  pdf.text(`Phone: ${WORKSHOP_INFO.phone || '+91 94348 86786'}`, margin, 31);

  pdf.setFillColor(255, 244, 241);
  pdf.roundedRect(right - 48, 13, 48, 24, 3, 3, 'F');
  pdf.setTextColor(194, 57, 45);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('INVOICE', right - 24, 22, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text(`ORDER #${order.order_number}`, right - 24, 29, { align: 'center' });

  pdf.setDrawColor(226, 228, 232);
  pdf.line(margin, 42, right, 42);
  pdf.setTextColor(110, 116, 125);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('BILLED TO', margin, 52);
  pdf.text('ORDER DATE', 112, 52);
  pdf.setTextColor(28, 30, 34);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(customerName || order.customer_name || 'Customer', margin, 59);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Phone: ${order.customer_phone || '—'}`, margin, 65);
  pdf.text(dateLabel(order.created_at), 112, 59);
  pdf.text(`Status: ${order.status === 'PICKED_UP' ? 'Picked up' : 'Completed'}`, 112, 65);

  pdf.setFillColor(247, 248, 250);
  pdf.roundedRect(margin, 74, right - margin, 16, 2, 2, 'F');
  pdf.setTextColor(97, 103, 113);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('PICKUP LOCATION', margin + 4, 80);
  if (guaranteeInfo.enabled) {
    pdf.text('GUARANTEE VALID UNTIL', 120, 80);
  }
  pdf.setTextColor(31, 34, 39);
  pdf.setFontSize(9);
  pdf.text(String(order.pickup_store || WORKSHOP_INFO.name || 'Rofik Godi Centre'), margin + 4, 86);
  if (guaranteeInfo.enabled) {
    pdf.setTextColor(21, 128, 61);
    pdf.text(guaranteeInfo.validUntilLabel, 120, 86);
  }

  let y = 102;
  const drawTableHeader = () => {
    pdf.setFillColor(31, 34, 39);
    pdf.roundedRect(margin, y - 6, right - margin, 11, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('ITEM', margin + 3, y + 1);
    pdf.text('QTY', 139, y + 1, { align: 'right' });
    pdf.text('UNIT PRICE', 166, y + 1, { align: 'right' });
    pdf.text('AMOUNT', right - 3, y + 1, { align: 'right' });
    y += 11;
  };
  drawTableHeader();

  for (let idx = 0; idx < items.length; idx += 1) {
    const item = items[idx];
    const thumb = itemThumbAssets[idx];
    const textOffsetX = thumb ? margin + 15 : margin + 3;
    const maxNameWidth = thumb ? 81 : 93;
    const nameLines = pdf.splitTextToSize(String(item.product_name || 'Product'), maxNameWidth) as string[];
    const rowHeight = Math.max(thumb ? 14 : 11, nameLines.length * 4.4 + 6);
    if (y + rowHeight > 258) {
      pdf.addPage();
      y = 23;
      drawTableHeader();
    }
    if (thumb) {
      try {
        pdf.addImage(thumb.dataUrl, 'JPEG', margin + 3, y - 3, 9.5, 9.5);
      } catch {
        // Ignore single thumbnail failure and keep ledger text intact.
      }
    }
    pdf.setTextColor(33, 36, 41);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(nameLines, textOffsetX, y + 1);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(96, 103, 112);
    pdf.setFontSize(8);
    pdf.text(String(item.quantity || 0), 139, y + 1, { align: 'right' });
    pdf.text(amount(Number(item.unit_price || 0)), 166, y + 1, { align: 'right' });
    pdf.setTextColor(33, 36, 41);
    pdf.setFont('helvetica', 'bold');
    pdf.text(amount(Number(item.quantity || 0) * Number(item.unit_price || 0)), right - 3, y + 1, { align: 'right' });
    if (item.color) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(130, 136, 144);
      pdf.setFontSize(7);
      pdf.text(`Colour: ${item.color}`, textOffsetX, y + nameLines.length * 4.4 + 1);
    }
    y += rowHeight;
    pdf.setDrawColor(232, 234, 237);
    pdf.line(margin, y, right, y);
    y += 2.5;
  }

  const summaryTop = Math.max(y + 5, 125);
  if (summaryTop > 225) {
    pdf.addPage();
    y = 25;
  } else {
    y = summaryTop;
  }
  const summaryX = 119;
  const summaryRight = right - 3;
  const summaryRow = (label: string, value: string, rowY: number, strong = false, green = false) => {
    pdf.setFont('helvetica', strong ? 'bold' : 'normal');
    pdf.setFontSize(strong ? 11 : 9);
    pdf.setTextColor(green ? 30 : strong ? 30 : 105, green ? 125 : strong ? 34 : 111, green ? 78 : strong ? 39 : 119);
    pdf.text(label, summaryX, rowY);
    pdf.text(value, summaryRight, rowY, { align: 'right' });
  };
  summaryRow('Subtotal', amount(order.subtotal), y);
  y += 7;
  summaryRow('Discount', `− ${amount(order.discount)}`, y, false, true);
  y += 5;
  pdf.setDrawColor(214, 217, 222);
  pdf.line(summaryX, y, right, y);
  y += 8;
  summaryRow('TOTAL', amount(order.total), y, true);
  y += 7;
  summaryRow('Payment', paymentState, y, false, paymentState === 'PAID');
  y += 11;

  const termsWidth = right - margin;
  const returnLines = pdf.splitTextToSize(invoiceTerms.returnPolicyText, termsWidth) as string[];
  const guaranteeLines = pdf.splitTextToSize(invoiceTerms.guaranteePolicyText, termsWidth) as string[];
  const termsBlockHeight = 8 + (returnLines.length + guaranteeLines.length) * 3.4 + 6;

  if (y + termsBlockHeight + 28 > 280) {
    pdf.addPage();
    y = 24;
  }

  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, y, right, y);
  y += 5;
  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('TERMS & GUARANTEE POLICY', margin, y);
  y += 4.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(7.2);
  pdf.text(returnLines, margin, y);
  y += returnLines.length * 3.4 + 2;
  pdf.setTextColor(71, 85, 105);
  pdf.text(guaranteeLines, margin, y);
  y += guaranteeLines.length * 3.4 + 7;

  if (y > 246) {
    pdf.addPage();
    y = 25;
  }

  // Authorised signature block
  const sigBoxWidth = 46;
  const sigX = right - sigBoxWidth;
  if (signatureAsset) {
    try {
      const ratio = signatureAsset.width / Math.max(1, signatureAsset.height);
      const sigHeight = Math.min(11, sigBoxWidth / Math.max(0.5, ratio));
      const sigWidth = Math.min(sigBoxWidth, sigHeight * ratio);
      pdf.addImage(
        signatureAsset.dataUrl,
        'PNG',
        right - sigWidth,
        y + 10 - sigHeight,
        sigWidth,
        sigHeight,
      );
    } catch {
      // Keep signature line even if raster embedding is skipped.
    }
  }
  pdf.setDrawColor(148, 163, 184);
  pdf.line(sigX, y + 12, right, y + 12);
  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Authorised signature', right, y + 16.5, { align: 'right' });

  pdf.setFillColor(255, 247, 244);
  pdf.roundedRect(margin, y, right - margin - 54, 18, 2, 2, 'F');
  pdf.setTextColor(183, 72, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('THANK YOU FOR CHOOSING ROFIK GODI CENTRE', margin + (right - margin - 54) / 2, y + 7, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(113, 118, 126);
  pdf.setFontSize(7);
  pdf.text(`Questions? Call ${WORKSHOP_INFO.phone || '+91 94348 86786'}`, margin + (right - margin - 54) / 2, y + 13, { align: 'center' });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 154, 161);
    pdf.setFontSize(7);
    pdf.text(`Invoice · ${order.order_number}     Page ${page} of ${pageCount}`, pageWidth / 2, 289, { align: 'center' });
  }

  pdf.setProperties({ title: `Invoice ${order.order_number}`, subject: 'Completed order invoice', author: 'Rofik Godi Centre' });
  pdf.save(`invoice-${safeFilename(order.order_number)}.pdf`);
  return true;
};
