import { jsPDF } from 'jspdf';
import type { CustomerOrderRecord, Product } from '../types';
import { PRODUCTS, WORKSHOP_INFO } from '../data/products';
import { isOrderComplete } from './orderPresentation';
import { supabase } from './supabase';
import {
  buildInvoiceTermsText,
  fetchProductGuaranteeDateFromDb,
  getLocalProductGuaranteeDate,
  normalizeGuaranteeDate,
  readCachedProductGuaranteePolicy,
  resolveProductGuarantee,
  type ProductGuaranteePolicy,
} from './productGuarantee';

const AUTHORISED_SIGNATURE_PATH = '/assets/aistudio/brittany-signature_775bf19a.png';
const safeFilename = (value: string) =>
  value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'order';
const amount = (value: number) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

type OrderItemRow = CustomerOrderRecord['order_items'][number];

function pickColorOrMainImage(
  product: { image?: string | null; colors?: Product['colors'] } | undefined,
  colorName?: string | null,
): string | null {
  if (!product) return null;
  const targetColor = String(colorName || '').trim().toLowerCase();
  if (targetColor && Array.isArray(product.colors)) {
    const matchedColor = product.colors.find(
      (entry) => String(entry?.name || '').trim().toLowerCase() === targetColor,
    );
    const colorImg = matchedColor?.images?.find(
      (src) => typeof src === 'string' && src.trim().length > 0,
    );
    if (colorImg) return colorImg.trim();
  }
  if (typeof product.image === 'string' && product.image.trim()) {
    return product.image.trim();
  }
  return null;
}

export function resolveOrderItemImageUrl(
  item: Pick<OrderItemRow, 'image_url' | 'product_id' | 'product_name' | 'color'>,
  products: Product[] = [],
): string | null {
  if (typeof item.image_url === 'string' && item.image_url.trim()) {
    return item.image_url.trim();
  }

  const catalog = products.length > 0 ? [...products, ...PRODUCTS] : PRODUCTS;
  if (item.product_id) {
    const byId = catalog.find(
      (p) => p.id === item.product_id || p.slug === item.product_id,
    );
    const resolvedById = pickColorOrMainImage(byId, item.color);
    if (resolvedById) return resolvedById;
  }

  const normalizedName = String(item.product_name || '').trim().toLowerCase();
  if (normalizedName) {
    const byName = catalog.find(
      (p) => String(p.title || '').trim().toLowerCase() === normalizedName,
    );
    const resolvedByName = pickColorOrMainImage(byName, item.color);
    if (resolvedByName) return resolvedByName;
  }

  return null;
}

async function fetchMissingProductImagesFromDb(
  items: OrderItemRow[],
): Promise<Map<string, { image?: string | null; colors?: Product['colors'] }>> {
  const map = new Map<string, { image?: string | null; colors?: Product['colors'] }>();
  if (!supabase) return map;
  const ids = Array.from(
    new Set(
      items
        .map((item) => item.product_id)
        .filter((id): id is string => Boolean(id && /^[0-9a-f-]{36}$/i.test(id))),
    ),
  );
  if (ids.length === 0) return map;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id,image_url,colors_json')
      .in('id', ids);
    if (error || !Array.isArray(data)) return map;
    for (const row of data) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const id = String(r.id || '');
      if (!id) continue;
      let colors: Product['colors'] = [];
      if (Array.isArray(r.colors_json)) {
        colors = r.colors_json as Product['colors'];
      }
      map.set(id, {
        image: typeof r.image_url === 'string' ? r.image_url : null,
        colors,
      });
    }
  } catch {
    // Non-blocking fallback when offline or restricted
  }
  return map;
}

function normalizeAbsoluteUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    try {
      return new URL(trimmed, window.location.origin).href;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function rasterizeImageElement(
  img: HTMLImageElement,
  format: 'PNG' | 'JPEG',
  targetSize?: { width: number; height: number },
): { dataUrl: string; width: number; height: number } | null {
  try {
    const naturalW = img.naturalWidth || targetSize?.width || 160;
    const naturalH = img.naturalHeight || targetSize?.height || 160;
    const w = targetSize?.width || naturalW;
    const h = targetSize?.height || naturalH;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (format === 'JPEG') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    }

    if (targetSize) {
      const scale = Math.max(w / naturalW, h / naturalH);
      const drawW = naturalW * scale;
      const drawH = naturalH * scale;
      ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
    } else {
      ctx.drawImage(img, 0, 0, w, h);
    }

    const mime = format === 'PNG' ? 'image/png' : 'image/jpeg';
    return {
      dataUrl: canvas.toDataURL(mime, 0.92),
      width: naturalW,
      height: naturalH,
    };
  } catch {
    return null;
  }
}

function loadViaImageTag(
  src: string,
  format: 'PNG' | 'JPEG',
  options: { useCors: boolean; timeoutMs: number; targetSize?: { width: number; height: number } },
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (value: { dataUrl: string; width: number; height: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), options.timeoutMs);
    if (options.useCors) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      window.clearTimeout(timer);
      finish(rasterizeImageElement(img, format, options.targetSize));
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    img.src = src;
  });
}

async function loadImageAsDataUrl(
  src: string,
  format: 'PNG' | 'JPEG',
  targetSize?: { width: number; height: number },
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const resolvedUrl = normalizeAbsoluteUrl(src);
  if (!resolvedUrl) return null;

  // Data URLs or blob URLs can be rasterized directly without network or CORS issues
  if (resolvedUrl.startsWith('data:') || resolvedUrl.startsWith('blob:')) {
    return loadViaImageTag(resolvedUrl, format, { useCors: false, timeoutMs: 4000, targetSize });
  }

  // Strategy 1: fetch with cache: 'no-store' to avoid Chrome non-CORS <img> cache poisoning
  if (typeof fetch === 'function') {
    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), 5500);
    try {
      const response = await fetch(resolvedUrl, {
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (response.ok) {
        const blob = await response.blob();
        if (blob && blob.size > 0) {
          const objectUrl = URL.createObjectURL(blob);
          try {
            const loaded = await loadViaImageTag(objectUrl, format, {
              useCors: false,
              timeoutMs: 4000,
              targetSize,
            });
            if (loaded) return loaded;
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        }
      }
    } catch {
      // Fall through to cache-busted <img> strategy
    } finally {
      window.clearTimeout(abortTimer);
    }
  }

  const isSameOrigin =
    Boolean(window.location?.origin) &&
    window.location.origin !== 'null' &&
    resolvedUrl.startsWith(window.location.origin);

  // Strategy 2: same-origin direct load
  if (isSameOrigin) {
    const direct = await loadViaImageTag(resolvedUrl, format, {
      useCors: false,
      timeoutMs: 5000,
      targetSize,
    });
    if (direct) return direct;
  }

  // Strategy 3: cache-busted CORS <img> load
  const cacheBusted = /^https?:/i.test(resolvedUrl)
    ? `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}_pdf_img=1`
    : resolvedUrl;
  return loadViaImageTag(cacheBusted, format, {
    useCors: true,
    timeoutMs: 5500,
    targetSize,
  });
}

export const downloadOrderInvoice = async (
  order: CustomerOrderRecord,
  customerName = order.customer_name,
  options?: {
    allowAnyStatus?: boolean;
    guaranteePolicy?: ProductGuaranteePolicy;
    productOverrideDate?: string | null;
    products?: Product[];
  },
): Promise<boolean> => {
  if (!options?.allowAnyStatus && !isOrderComplete(order.status)) return false;

  const items = order.order_items || [];
  let resolvedOverrideDate = normalizeGuaranteeDate(options?.productOverrideDate);
  if (!resolvedOverrideDate) {
    for (const item of items) {
      const localDate = getLocalProductGuaranteeDate(item.product_id, null);
      if (localDate) {
        resolvedOverrideDate = localDate;
        break;
      }
      if (item.product_id) {
        const dbDate = await fetchProductGuaranteeDateFromDb({ productId: item.product_id });
        if (dbDate) {
          resolvedOverrideDate = dbDate;
          break;
        }
      }
    }
  }

  // Resolve any missing item image URLs from passed catalog, bundled catalog, or database
  const preliminaryUrls = items.map((item) =>
    resolveOrderItemImageUrl(item, options?.products),
  );
  const needsDbLookup = preliminaryUrls.some((url, idx) => !url && Boolean(items[idx]?.product_id));
  const dbProductImages = needsDbLookup
    ? await fetchMissingProductImagesFromDb(items)
    : new Map<string, { image?: string | null; colors?: Product['colors'] }>();

  const finalItemImageUrls = items.map((item, idx) => {
    if (preliminaryUrls[idx]) return preliminaryUrls[idx];
    if (item.product_id && dbProductImages.has(item.product_id)) {
      return pickColorOrMainImage(dbProductImages.get(item.product_id), item.color);
    }
    return null;
  });

  const activePolicy = options?.guaranteePolicy ?? readCachedProductGuaranteePolicy();
  const guaranteeInfo = resolveProductGuarantee(activePolicy, {
    referenceDate: order.created_at,
    productOverrideDate: resolvedOverrideDate,
  });
  const invoiceTerms = buildInvoiceTermsText(guaranteeInfo);

  const [signatureAsset, itemThumbAssets] = await Promise.all([
    loadImageAsDataUrl(AUTHORISED_SIGNATURE_PATH, 'PNG'),
    Promise.all(
      finalItemImageUrls.map((url) =>
        url ? loadImageAsDataUrl(url, 'JPEG', { width: 120, height: 120 }) : Promise.resolve(null),
      ),
    ),
  ]);

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const right = pageWidth - margin;
  const contentWidth = right - margin;
  const paid = order.payment_status?.toLowerCase() === 'paid';
  const paymentState = paid ? 'PAID' : 'DUE AT PICKUP';

  // Top Clay Brown & Soft Butter Workshop Strip
  pdf.setFillColor(107, 53, 42);
  pdf.rect(0, 0, pageWidth * 0.72, 3.8, 'F');
  pdf.setFillColor(255, 241, 166);
  pdf.rect(pageWidth * 0.72, 0, pageWidth * 0.28, 3.8, 'F');

  // Monogram Crest Badge
  pdf.setFillColor(255, 241, 166);
  pdf.setDrawColor(219, 186, 98);
  pdf.roundedRect(margin, 13, 12, 12, 2.5, 2.5, 'FD');
  pdf.setTextColor(107, 53, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('RGC', margin + 6, 20.5, { align: 'center' });

  // Workshop Title & Address
  pdf.setTextColor(107, 53, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('CUSTOM SEAT COVER WORKSHOP', margin + 15.5, 16);
  pdf.setTextColor(43, 22, 17);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text('ROFIK GODI CENTRE', margin + 15.5, 22.5);
  pdf.setTextColor(107, 76, 68);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(String(WORKSHOP_INFO.address || 'Berhampore, West Bengal'), margin, 30.5);
  pdf.text(
    `Phone: ${WORKSHOP_INFO.phone || '+91 94348 86786'}${WORKSHOP_INFO.email ? `  ·  ${WORKSHOP_INFO.email}` : ''}`,
    margin,
    35,
  );

  // Invoice Status Card (Top Right)
  pdf.setFillColor(255, 252, 244);
  pdf.setDrawColor(232, 216, 196);
  pdf.roundedRect(right - 52, 12, 52, 24, 3, 3, 'FD');
  pdf.setTextColor(43, 22, 17);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('INVOICE', right - 26, 19.5, { align: 'center' });

  pdf.setFillColor(paid ? 107 : 255, paid ? 53 : 241, paid ? 42 : 166);
  pdf.setDrawColor(paid ? 107 : 219, paid ? 53 : 186, paid ? 42 : 98);
  pdf.roundedRect(right - 41, 22, 30, 5.5, 2.5, 2.5, 'FD');
  pdf.setTextColor(paid ? 255 : 107, paid ? 252 : 53, paid ? 244 : 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text(paymentState, right - 26, 25.8, { align: 'center' });

  pdf.setTextColor(107, 76, 68);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text(`#${order.order_number}`, right - 26, 33, { align: 'center' });

  // Customer, Order & Pickup Strip
  pdf.setFillColor(255, 252, 244);
  pdf.setDrawColor(232, 216, 196);
  pdf.roundedRect(margin, 41, contentWidth, 29, 3, 3, 'FD');
  pdf.line(margin + contentWidth * 0.34, 41, margin + contentWidth * 0.34, 70);
  pdf.line(margin + contentWidth * 0.72, 41, margin + contentWidth * 0.72, 70);

  // Col 1: Billed To
  pdf.setTextColor(122, 91, 82);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('BILLED TO', margin + 4, 46.5);
  pdf.setTextColor(43, 22, 17);
  pdf.setFontSize(9.5);
  pdf.text(String(customerName || order.customer_name || 'Customer').slice(0, 26), margin + 4, 52.5);
  pdf.setTextColor(107, 76, 68);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(order.customer_phone || 'Phone not provided', margin + 4, 58);
  if (order.vehicle_model) {
    pdf.setTextColor(107, 53, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text(`Vehicle: ${order.vehicle_model}`.slice(0, 32), margin + 4, 65.5);
  }

  // Col 2: Workshop Pickup
  const col2X = margin + contentWidth * 0.34 + 4;
  pdf.setTextColor(122, 91, 82);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('WORKSHOP PICKUP (NO ONLINE DELIVERY)', col2X, 46.5);
  pdf.setTextColor(43, 22, 17);
  pdf.setFontSize(9);
  pdf.text(
    String(order.pickup_store || WORKSHOP_INFO.name || 'Rofik Godi Centre').slice(0, 32),
    col2X,
    52.5,
  );
  pdf.setTextColor(107, 76, 68);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text('In-person collection · Free workshop fitment', col2X, 58);
  pdf.text(`Issued: ${dateLabel(order.created_at)}`, col2X, 65.5);

  // Col 3: Status / Guarantee Summary
  const col3X = margin + contentWidth * 0.72 + 4;
  pdf.setTextColor(122, 91, 82);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('ORDER STATUS', col3X, 46.5);
  pdf.setTextColor(43, 22, 17);
  pdf.setFontSize(9);
  pdf.text(String(order.status || 'COMPLETED').replace(/_/g, ' '), col3X, 52.5);
  if (guaranteeInfo.enabled) {
    pdf.setTextColor(107, 53, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    pdf.text(`Guarantee: ${guaranteeInfo.validUntilLabel}`, col3X, 65.5);
  } else {
    pdf.setTextColor(122, 91, 82);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(
      order.payment_method?.toLowerCase() === 'pay_at_store' ? 'Pay at store' : 'Pay online',
      col3X,
      65.5,
    );
  }

  let y = 78;

  // Guarantee Certificate Highlight Strip
  if (guaranteeInfo.enabled) {
    pdf.setFillColor(255, 248, 214);
    pdf.setDrawColor(232, 207, 104);
    pdf.roundedRect(margin, y - 3, contentWidth, 18, 2.5, 2.5, 'FD');
    pdf.setTextColor(107, 53, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.8);
    pdf.text(
      `OFFICIAL REPLACEMENT GUARANTEE · VALID UNTIL ${guaranteeInfo.validUntilLabel.toUpperCase()} (${guaranteeInfo.isActive ? 'ACTIVE' : 'EXPIRED'})`,
      margin + 4,
      y + 2.5,
    );
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(74, 46, 38);
    pdf.setFontSize(7);
    pdf.text(
      'Covered (Normal Use): Natural splitting/cracking, seam tearing & rexine/leatherette surface peeling before expiry.',
      margin + 4,
      y + 7.5,
    );
    pdf.setTextColor(154, 52, 18);
    pdf.text(
      'Excluded: Physical damage from accidents, cuts, burns, animal scratches, improper handling or external misuse.',
      margin + 4,
      y + 12,
    );
    y += 22;
  }

  // Item Table Header
  const drawTableHeader = () => {
    pdf.setFillColor(107, 53, 42);
    pdf.setDrawColor(107, 53, 42);
    pdf.roundedRect(margin, y - 5, contentWidth, 10, 2, 2, 'FD');
    pdf.setTextColor(255, 252, 244);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.8);
    pdf.text('ITEM DESCRIPTION', margin + 3.5, y + 1.2);
    pdf.text('QTY', 142, y + 1.2, { align: 'right' });
    pdf.text('UNIT PRICE', 168, y + 1.2, { align: 'right' });
    pdf.text('AMOUNT', right - 3.5, y + 1.2, { align: 'right' });
    y += 9;
  };
  drawTableHeader();

  for (let idx = 0; idx < items.length; idx += 1) {
    const item = items[idx];
    const thumb = itemThumbAssets[idx];
    const thumbBoxSize = 11;
    const textOffsetX = margin + thumbBoxSize + 6.5;
    const maxNameWidth = right - 64 - textOffsetX;
    const nameLines = pdf.splitTextToSize(
      String(item.product_name || 'Seat Cover Product'),
      Math.max(55, maxNameWidth),
    ) as string[];
    const specParts = [
      item.color ? `Colour: ${item.color}` : '',
      item.selected_thickness ? `Thickness: ${item.selected_thickness}` : '',
      item.selected_stitch ? `Stitch: ${item.selected_stitch}` : '',
      item.custom_embroidery_text ? `Embroidery: ${item.custom_embroidery_text}` : '',
    ].filter(Boolean);
    const specLines = specParts.length
      ? (pdf.splitTextToSize(specParts.join(' · '), Math.max(55, maxNameWidth)) as string[])
      : [];

    const textBlockHeight = nameLines.length * 4.1 + specLines.length * 3.4 + 4;
    const rowHeight = Math.max(thumbBoxSize + 4, textBlockHeight);

    if (y + rowHeight > 255) {
      pdf.addPage();
      y = 22;
      drawTableHeader();
    }

    // Crisp Thumbnail Container (Actual Product Photo or Clean Monogram Fallback)
    const imgX = margin + 3;
    const imgY = y + 1.2;
    pdf.setFillColor(255, 252, 244);
    pdf.setDrawColor(232, 216, 196);
    pdf.roundedRect(imgX, imgY, thumbBoxSize, thumbBoxSize, 1.5, 1.5, 'FD');

    if (thumb) {
      try {
        pdf.addImage(
          thumb.dataUrl,
          'JPEG',
          imgX + 0.4,
          imgY + 0.4,
          thumbBoxSize - 0.8,
          thumbBoxSize - 0.8,
        );
      } catch {
        // Fallback monogram if single image frame fails in jsPDF
        pdf.setTextColor(140, 111, 102);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text(
          String(item.product_name || 'R').slice(0, 1).toUpperCase(),
          imgX + thumbBoxSize / 2,
          imgY + thumbBoxSize / 2 + 1.2,
          { align: 'center' },
        );
      }
    } else {
      pdf.setTextColor(140, 111, 102);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(
        String(item.product_name || 'R').slice(0, 1).toUpperCase(),
        imgX + thumbBoxSize / 2,
        imgY + thumbBoxSize / 2 + 1.2,
        { align: 'center' },
      );
    }

    pdf.setTextColor(43, 22, 17);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(nameLines, textOffsetX, y + 4.5);

    if (specLines.length > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 76, 68);
      pdf.setFontSize(7.1);
      pdf.text(specLines, textOffsetX, y + 4.5 + nameLines.length * 4.1);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 76, 68);
    pdf.setFontSize(8.2);
    pdf.text(String(item.quantity || 0), 142, y + 5, { align: 'right' });
    pdf.text(amount(Number(item.unit_price || 0)), 168, y + 5, { align: 'right' });
    pdf.setTextColor(43, 22, 17);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      amount(Number(item.quantity || 0) * Number(item.unit_price || 0)),
      right - 3.5,
      y + 5,
      { align: 'right' },
    );

    y += rowHeight;
    pdf.setDrawColor(239, 227, 206);
    pdf.line(margin, y, right, y);
    y += 2;
  }

  // Totals Summary Block
  const summaryTop = Math.max(y + 4, 130);
  if (summaryTop > 224) {
    pdf.addPage();
    y = 22;
  } else {
    y = summaryTop;
  }

  const totalsCardX = 114;
  const totalsCardW = right - totalsCardX;
  const hasDiscount = Number(order.discount || 0) > 0;
  const totalsCardH = hasDiscount ? 34 : 28;

  pdf.setFillColor(255, 252, 244);
  pdf.setDrawColor(232, 216, 196);
  pdf.roundedRect(totalsCardX, y - 3, totalsCardW, totalsCardH, 2.5, 2.5, 'FD');

  let rowY = y + 3;
  const summaryRight = right - 4;
  const drawSummaryRow = (label: string, value: string, colorRgb: [number, number, number]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(107, 76, 68);
    pdf.text(label, totalsCardX + 4, rowY);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colorRgb);
    pdf.text(value, summaryRight, rowY, { align: 'right' });
    rowY += 6;
  };

  drawSummaryRow('Subtotal', amount(order.subtotal), [43, 22, 17]);
  drawSummaryRow('Workshop Fitment', 'Complimentary', [107, 53, 42]);
  if (hasDiscount) {
    drawSummaryRow('Discount', `- ${amount(order.discount)}`, [180, 83, 9]);
  }

  // Highlighted Total Footer Band inside Totals Card
  pdf.setFillColor(255, 241, 166);
  pdf.setDrawColor(219, 186, 98);
  pdf.roundedRect(totalsCardX, rowY - 2, totalsCardW, 10, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(107, 53, 42);
  pdf.text('TOTAL', totalsCardX + 4, rowY + 4.5);
  pdf.setFontSize(11);
  pdf.setTextColor(43, 22, 17);
  pdf.text(amount(order.total), summaryRight, rowY + 4.5, { align: 'right' });

  y = rowY + 14;

  // Workshop Terms & Guarantee Policy Section (Exact 7 Clauses)
  const termsWidth = contentWidth - 8;
  const formattedClauses = invoiceTerms.clauses.map((clause) => {
    const lineText = `${clause.number}. ${clause.title}: ${clause.body}`;
    return pdf.splitTextToSize(lineText, termsWidth) as string[];
  });
  const totalTermLines = formattedClauses.reduce((sum, lines) => sum + lines.length, 0);
  const termsBlockHeight = 10 + totalTermLines * 3.3 + formattedClauses.length * 1.4 + 4;

  if (y + termsBlockHeight + 28 > 282) {
    pdf.addPage();
    y = 20;
  }

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(232, 216, 196);
  pdf.roundedRect(margin, y, contentWidth, termsBlockHeight, 2.5, 2.5, 'FD');
  pdf.setFillColor(255, 248, 214);
  pdf.rect(margin + 0.3, y + 0.3, contentWidth - 0.6, 7.5, 'F');
  pdf.setTextColor(107, 53, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(invoiceTerms.policyHeading, margin + 4, y + 5.2);

  let termY = y + 12;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(74, 46, 38);
  pdf.setFontSize(7.2);
  for (const lines of formattedClauses) {
    pdf.text(lines, margin + 4, termY);
    termY += lines.length * 3.3 + 1.4;
  }

  y += termsBlockHeight + 6;
  if (y > 250) {
    pdf.addPage();
    y = 22;
  }

  // Closing Customer Satisfaction Banner + Authorised Signature
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
      // Keep signature line intact even if raster fails
    }
  }
  pdf.setDrawColor(168, 140, 128);
  pdf.line(sigX, y + 12, right, y + 12);
  pdf.setTextColor(107, 53, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('Authorised signature', right, y + 16.5, { align: 'right' });

  pdf.setFillColor(255, 241, 166);
  pdf.setDrawColor(219, 186, 98);
  pdf.roundedRect(margin, y, contentWidth - 54, 18, 2.5, 2.5, 'FD');
  pdf.setTextColor(107, 53, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text(
    invoiceTerms.closingTitle,
    margin + (contentWidth - 54) / 2,
    y + 7.5,
    { align: 'center' },
  );
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(74, 46, 38);
  pdf.setFontSize(7.5);
  pdf.text(
    invoiceTerms.closingSubtitle,
    margin + (contentWidth - 54) / 2,
    y + 13.5,
    { align: 'center' },
  );

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(140, 111, 102);
    pdf.setFontSize(7);
    pdf.text(
      `Invoice · ${order.order_number}     Page ${page} of ${pageCount}`,
      pageWidth / 2,
      289,
      { align: 'center' },
    );
  }

  pdf.setProperties({
    title: `Invoice ${order.order_number}`,
    subject: 'Workshop order invoice',
    author: 'Rofik Godi Centre',
  });
  pdf.save(`invoice-${safeFilename(order.order_number)}.pdf`);
  return true;
};
