/// <reference lib="deno.ns" />

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

interface ConfirmationEmailItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  image_url?: string | null;
}

interface ConfirmationEmailOrder {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  pickupStore: string;
  fulfillmentMethod: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  items: ConfirmationEmailItem[];
  orderUrl?: string | null;
}

type OrderEmailEvent = 'COMPLETED';

interface OrderStatusEmail {
  orderNumber: string;
  customerName: string;
  pickupStore: string;
  event: OrderEmailEvent;
  items: ConfirmationEmailItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  orderUrl?: string | null;
}

const STORE_NAME = 'ROFIK GODI CENTRE';
const STORE_SUBTITLE = 'CUSTOM SEAT COMFORT';
const STORE_ADDRESS = 'Jalangi Road, Raninagar, Keshobnagar, Berhampore, West Bengal 742102';
const STORE_PHONE = '+91 9775333555';
const STORE_EMAIL = 'rofikgodicentre.store@gmail.com';
const STORE_MAP_URL = 'https://maps.app.goo.gl/hRVfWHTkQ6vkrcS7A';
const RED = '#d9232d';
const NAVY = '#101828';
const MUTED = '#667085';
const LINE = '#e8edf3';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] || character,
  );
}

function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function amount(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function orderDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    NEW: 'Order Placed',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Being Prepared',
    READY_FOR_PICKUP: 'Ready for Pickup',
    PICKED_UP: 'Picked Up',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    PAYMENT_PAID: 'Payment Received',
  };
  return labels[String(value || '').toUpperCase()] || 'Order Placed';
}

function paymentMethodLabel(value: string): string {
  return String(value || '').toUpperCase() === 'PAY_ONLINE' ? 'UPI / Online' : 'Pay at Store';
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function pickupInformationHtml(storeName: string): string {
  return `<div style="padding:18px;border:1px solid ${LINE};border-radius:16px;background:#f8fafc"><div style="font-size:14px;font-weight:800;color:${NAVY}">Pickup Information</div><div style="margin-top:9px;font-size:12px;line-height:1.75;color:#475467"><strong style="color:#1d2939">${escapeHtml(storeName)}</strong><br>${STORE_ADDRESS}</div><div style="margin-top:13px"><a href="${STORE_MAP_URL}" target="_blank" rel="noopener noreferrer" style="color:#a71925;font-size:12px;font-weight:800;text-decoration:underline">Open store location in Google Maps</a></div><div style="margin-top:14px;padding-top:12px;border-top:1px solid #e4e7ec"><div style="font-size:11px;font-weight:800;color:#667085">Need help?</div><div style="margin-top:7px;font-size:12px;line-height:1.9"><a href="tel:${STORE_PHONE.replace(/[^+\d]/g, '')}" style="color:#344054;text-decoration:underline;font-weight:700">${STORE_PHONE}</a><br><a href="mailto:${STORE_EMAIL}" style="color:#1a73e8;text-decoration:underline;font-weight:800;word-break:break-word">${STORE_EMAIL}</a></div></div></div>`;
}

function pickupInformationText(storeName: string): string[] {
  return [
    storeName,
    STORE_ADDRESS,
    `Google Maps: ${STORE_MAP_URL}`,
    `Call: ${STORE_PHONE}`,
    `Email: ${STORE_EMAIL}`,
  ];
}

function emailShell(subject: string, content: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title><style>@media only screen and (max-width:600px){.outer{padding:12px 6px!important}.container{width:100%!important;border-radius:14px!important}.pad{padding-left:18px!important;padding-right:18px!important}.hero-title{font-size:26px!important}.stack{display:block!important;width:100%!important;text-align:left!important}.mobile-center{text-align:center!important}}</style></head><body style="margin:0;background:#fff7ef;font-family:Arial,Helvetica,sans-serif;color:${NAVY}"><table role="presentation" class="outer" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff7ef;padding:36px 10px"><tr><td align="center"><table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #f0e4da;border-radius:20px;overflow:hidden;box-shadow:0 12px 34px rgba(16,24,40,.08)"><tr><td style="height:5px;background:${RED};font-size:0;line-height:0">&nbsp;</td></tr><tr><td class="pad" style="padding:22px 30px 21px;background:#ffffff;border-bottom:1px solid #f0e4da"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:38px;height:38px;border-radius:11px;background:${RED};color:#ffffff;text-align:center;vertical-align:middle;font-size:15px;font-weight:900">RG</td><td style="padding-left:12px;vertical-align:middle"><div style="font-size:17px;font-weight:900;letter-spacing:.05em;color:${NAVY}">${STORE_NAME}</div><div style="margin-top:4px;font-size:9px;font-weight:900;letter-spacing:.2em;color:${RED}">${STORE_SUBTITLE}</div></td></tr></table></td></tr>${content}<tr><td class="pad" style="padding:22px 30px 25px;border-top:1px solid #edf0f4;background:#ffffff"><div style="font-size:12px;font-weight:900;letter-spacing:.05em;color:${NAVY}">${STORE_NAME}</div><div style="margin-top:7px;font-size:12px;line-height:1.65;color:${MUTED}">Thoughtfully made for more comfortable rides.</div><div style="margin-top:11px;font-size:11px;line-height:1.9"><a href="tel:${STORE_PHONE.replace(/[^+\d]/g, '')}" style="color:#344054;text-decoration:underline;font-weight:700">Call ${STORE_PHONE}</a><br><a href="mailto:${STORE_EMAIL}" style="color:#1a73e8;text-decoration:underline;font-weight:800;word-break:break-word">${STORE_EMAIL}</a></div></td></tr></table></td></tr></table></body></html>`;
}

function statusPill(label: string, tone: 'green' | 'red' | 'blue' = 'green'): string {
  const styles =
    tone === 'green'
      ? 'background:#ecfdf3;color:#087443'
      : tone === 'red'
        ? 'background:#fff1f2;color:#b42318'
        : 'background:#eff8ff;color:#175cd3';
  return `<div style="display:inline-block;padding:7px 11px;border-radius:999px;${styles};font-size:11px;font-weight:900;letter-spacing:.06em">${label}</div>`;
}

function productRows(items: ConfirmationEmailItem[]): { html: string; text: string } {
  const text = items
    .map((item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const unitPrice = Math.max(0, Number(item.unit_price) || 0);
      return `• ${item.product_name || 'Product'} — Qty: ${quantity} × ${amount(unitPrice)} = ${amount(quantity * unitPrice)}`;
    })
    .join('\n');
  const html = items
    .map((item) => {
      const productName = escapeHtml(item.product_name || 'Product');
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const unitPrice = Math.max(0, Number(item.unit_price) || 0);
      const imageUrl = safeHttpsUrl(item.image_url);
      const image = imageUrl
        ? `<td width="58" style="padding:13px 10px 13px 0;vertical-align:top"><img src="${escapeHtml(imageUrl)}" width="50" height="50" alt="${productName}" style="display:block;width:50px;height:50px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0"></td>`
        : '';
      return `<tr>${image}<td style="padding:13px 7px;vertical-align:top;border-bottom:1px solid #edf0f4"><div style="font-size:13px;font-weight:800;color:${NAVY}">${productName}</div><div style="margin-top:5px;font-size:11px;color:${MUTED}">Qty: ${quantity} · ${amount(unitPrice)} each</div></td><td align="right" style="padding:13px 0 13px 7px;vertical-align:top;border-bottom:1px solid #edf0f4;white-space:nowrap;font-size:13px;font-weight:900;color:${NAVY}">${amount(quantity * unitPrice)}</td></tr>`;
    })
    .join('');
  return {
    html:
      html ||
      '<tr><td style="padding:13px 0;font-size:12px;color:#667085">No product details available.</td></tr>',
    text: text || 'No product details available.',
  };
}

function summaryTable(order: {
  subtotal: number;
  discount: number;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
}): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:6px 0;font-size:12px;color:${MUTED}">Subtotal</td><td align="right" style="padding:6px 0;font-size:12px;color:#344054">${amount(order.subtotal)}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:${MUTED}">Discount</td><td align="right" style="padding:6px 0;font-size:12px;color:#087443">−${amount(order.discount)}</td></tr><tr><td style="padding:12px 0;border-top:1px solid ${LINE};font-size:14px;font-weight:900;color:${NAVY}">Total</td><td align="right" style="padding:12px 0;border-top:1px solid ${LINE};font-size:16px;font-weight:900;color:${NAVY}">${amount(order.total)}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:${MUTED}">Payment Status</td><td align="right" style="padding:6px 0;font-size:12px;font-weight:800;color:#087443">${escapeHtml(String(order.paymentStatus || 'PENDING').toUpperCase())}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:${MUTED}">Payment Method</td><td align="right" style="padding:6px 0;font-size:12px;color:#344054">${escapeHtml(paymentMethodLabel(order.paymentMethod))}</td></tr></table>`;
}

function buildOrderConfirmationEmail(order: ConfirmationEmailOrder) {
  const orderNumber = escapeHtml(order.orderNumber);
  const name = escapeHtml(order.customerName || 'Customer');
  const phone = escapeHtml(order.customerPhone || '—');
  const email = escapeHtml(order.customerEmail);
  const store = escapeHtml(order.pickupStore || STORE_NAME);
  const date = escapeHtml(orderDate(order.createdAt));
  const status = escapeHtml(statusLabel(order.status));
  const orderUrl = safeHttpsUrl(order.orderUrl);
  const subject = `Order Confirmed — #${order.orderNumber} | Rofik Godi Centre`;
  const products = productRows(order.items);
  const button = orderUrl
    ? `<tr><td class="pad" style="padding:4px 30px 26px"><a href="${escapeHtml(orderUrl)}" style="display:block;padding:15px 20px;border-radius:12px;background:${RED};color:#fff;text-align:center;text-decoration:none;font-size:14px;font-weight:900">View order details</a></td></tr>`
    : '';
  const content = `<tr><td class="pad" style="padding:30px 30px 8px"><div style="font-size:11px;font-weight:900;letter-spacing:.1em;color:#087443">ORDER CONFIRMED</div><h1 class="hero-title" style="margin:14px 0 9px;font-size:28px;line-height:1.18;letter-spacing:-.03em;color:${NAVY}">Your order is secured, ${name}.</h1><p style="margin:0;font-size:14px;line-height:1.72;color:#475467">Thank you for shopping with us. We’ve received your order and our team will keep it moving towards a smooth store pickup.</p></td></tr><tr><td class="pad" style="padding:20px 30px 8px"><div style="padding:19px;border:1px solid #d1fadf;border-radius:18px;background:#f0fdf4"><div style="font-size:11px;font-weight:900;letter-spacing:.1em;color:#087443">NEXT STEP</div><div style="margin-top:8px;font-size:16px;font-weight:900;color:#14532d">We’re preparing your essentials.</div><div style="margin-top:7px;font-size:12px;line-height:1.65;color:#166534">We’ll let you know when your order is ready to collect from the store.</div><div style="display:flex;margin-top:17px;height:6px;border-radius:99px;background:#bbf7d0"><div style="width:33%;border-radius:99px;background:#16a34a"></div></div><div style="margin-top:8px;font-size:10px;color:#166534">Order placed&nbsp;&nbsp; • &nbsp;&nbsp;Preparing&nbsp;&nbsp; • &nbsp;&nbsp;Ready for pickup</div></div></td></tr><tr><td class="pad" style="padding:18px 30px 8px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid ${LINE};border-radius:16px"><tr><td style="padding:16px 18px;border-bottom:1px solid ${LINE}"><div style="font-size:10px;font-weight:900;letter-spacing:.1em;color:${MUTED}">ORDER REFERENCE</div><div style="margin-top:6px;font-size:18px;font-weight:900;color:${NAVY}">#${orderNumber}</div></td><td align="right" style="padding:16px 18px;border-bottom:1px solid ${LINE}"><div style="font-size:10px;font-weight:900;letter-spacing:.1em;color:${MUTED}">TOTAL</div><div style="margin-top:6px;font-size:17px;font-weight:900;color:${NAVY}">${amount(order.total)}</div></td></tr><tr><td style="padding:13px 18px;font-size:12px;color:${MUTED}">Placed on<br><strong style="display:inline-block;margin-top:4px;color:${NAVY}">${date}</strong></td><td align="right" style="padding:13px 18px;font-size:12px;color:${MUTED}">Status<br><strong style="display:inline-block;margin-top:4px;color:#087443">${status}</strong></td></tr></table></td></tr><tr><td class="pad" style="padding:18px 30px 6px"><h2 style="margin:0 0 10px;font-size:15px;color:${NAVY}">Your order</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${products.html}</table></td></tr><tr><td class="pad" style="padding:17px 30px 8px"><h2 style="margin:0 0 10px;font-size:15px;color:${NAVY}">Payment Summary</h2>${summaryTable(order)}</td></tr><tr><td class="pad" style="padding:17px 30px 8px"><div style="font-size:12px;font-weight:900;color:${NAVY}">Customer details</div><div style="margin-top:7px;font-size:12px;line-height:1.8;color:${MUTED}">${name}<br>${phone}<br>${email}</div></td></tr><tr><td class="pad" style="padding:17px 30px 25px">${pickupInformationHtml(store)}</td></tr>${button}`;
  const html = emailShell(subject, content);
  const text = [
    STORE_NAME,
    STORE_SUBTITLE,
    '',
    `Your order is secured, ${order.customerName || 'Customer'}.`,
    'Your order has been successfully placed.',
    '',
    'NEXT STEP',
    'We’re preparing your essentials.',
    'We’ll let you know when your order is ready to collect from the store.',
    '',
    `Order ID: #${order.orderNumber}`,
    `Order Date: ${orderDate(order.createdAt)}`,
    `Order Status: ${statusLabel(order.status)}`,
    `Pickup Store: ${order.pickupStore || STORE_NAME}`,
    '',
    'ORDERED PRODUCTS',
    products.text,
    '',
    'PAYMENT SUMMARY',
    `Subtotal: ${amount(order.subtotal)}`,
    `Discount: ${amount(order.discount)}`,
    `Total: ${amount(order.total)}`,
    `Payment Status: ${String(order.paymentStatus || 'PENDING').toUpperCase()}`,
    `Payment Method: ${paymentMethodLabel(order.paymentMethod)}`,
    ...(orderUrl ? ['', `View My Order: ${orderUrl}`] : []),
    '',
    'PICKUP INFORMATION',
    ...pickupInformationText(order.pickupStore || STORE_NAME),
    '',
    `${STORE_NAME} · ${STORE_EMAIL}`,
  ].join('\n');
  return { subject, html, text };
}

function buildOrderStatusEmail(order: OrderStatusEmail) {
  const status = statusLabel(order.event);
  const orderNumber = escapeHtml(order.orderNumber);
  const name = escapeHtml(order.customerName || 'Rider');
  const orderUrl = safeHttpsUrl(order.orderUrl);
  const store = escapeHtml(order.pickupStore || STORE_NAME);
  const products = productRows(order.items);
  const subject = `Order completed: #${order.orderNumber} | Rofik Godi Centre`;
  const button = orderUrl
    ? `<tr><td class="pad" style="padding:4px 30px 26px"><a href="${escapeHtml(orderUrl)}" style="display:block;padding:15px 20px;border-radius:12px;background:${NAVY};color:#fff;text-align:center;text-decoration:none;font-size:14px;font-weight:900">View my orders</a></td></tr>`
    : '';
  const content = `<tr><td class="pad" style="padding:30px 30px 8px"><div style="font-size:11px;font-weight:900;letter-spacing:.1em;color:#087443">ORDER COMPLETED</div><h1 class="hero-title" style="margin:14px 0 9px;font-size:28px;line-height:1.18;letter-spacing:-.03em;color:${NAVY}">All set, ${name}.</h1><p style="margin:0;font-size:14px;line-height:1.72;color:#475467">Your store pickup is complete. Thank you for trusting Rofik Godi Centre to make every ride more comfortable.</p></td></tr><tr><td class="pad" style="padding:20px 30px 8px"><div style="padding:19px;border:1px solid #d1fadf;border-radius:18px;background:#f0fdf4"><div style="font-size:26px;line-height:1;color:#16a34a">✓</div><div style="margin-top:10px;font-size:16px;font-weight:900;color:#14532d">Pickup completed successfully</div><div style="margin-top:7px;font-size:12px;line-height:1.65;color:#166534">Your order is now closed and safely recorded in your order history.</div></div></td></tr><tr><td class="pad" style="padding:18px 30px 8px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid ${LINE};border-radius:16px"><tr><td style="padding:16px 18px;border-bottom:1px solid ${LINE}"><div style="font-size:10px;font-weight:900;letter-spacing:.1em;color:${MUTED}">COMPLETED ORDER</div><div style="margin-top:6px;font-size:18px;font-weight:900;color:${NAVY}">#${orderNumber}</div></td><td align="right" style="padding:16px 18px;border-bottom:1px solid ${LINE}"><div style="font-size:10px;font-weight:900;letter-spacing:.1em;color:${MUTED}">STATUS</div><div style="margin-top:6px;font-size:13px;font-weight:900;color:#087443">${escapeHtml(status)}</div></td></tr><tr><td colspan="2" style="padding:13px 18px;font-size:12px;color:${MUTED}">Pickup location<br><strong style="display:inline-block;margin-top:4px;color:${NAVY}">${store}</strong></td></tr></table></td></tr><tr><td class="pad" style="padding:18px 30px 6px"><h2 style="margin:0 0 10px;font-size:15px;color:${NAVY}">Ordered Products</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${products.html}</table></td></tr><tr><td class="pad" style="padding:17px 30px 8px"><h2 style="margin:0 0 10px;font-size:15px;color:${NAVY}">Payment Summary</h2>${summaryTable(order)}</td></tr><tr><td class="pad" style="padding:17px 30px 8px"><div style="padding:16px 18px;border:1px solid #e4e7ec;border-radius:16px;background:#f8fafc"><div style="font-size:13px;font-weight:900;color:${NAVY}">Enjoy the comfort.</div><div style="margin-top:6px;font-size:12px;line-height:1.65;color:#475467">If you need help with fitting or care, our team is happy to help.</div></div></td></tr>${button}<tr><td class="pad" style="padding:0 30px 26px">${pickupInformationHtml(store)}</td></tr>`;
  const html = emailShell(subject, content);
  const text = [
    STORE_NAME,
    '',
    `ORDER COMPLETED — #${order.orderNumber}`,
    `Hi ${order.customerName || 'Rider'},`,
    'Your pickup has been recorded and this order is now complete.',
    'Thanks for choosing Rofik Godi Centre. We hope you enjoy your purchase.',
    '',
    'PICKUP SUMMARY',
    `Final status: ${status}`,
    `Pickup store: ${order.pickupStore || STORE_NAME}`,
    '',
    'ORDERED PRODUCTS',
    products.text,
    '',
    'PAYMENT SUMMARY',
    `Subtotal: ${amount(order.subtotal)}`,
    `Discount: ${amount(order.discount)}`,
    `Total: ${amount(order.total)}`,
    `Payment Status: ${String(order.paymentStatus || 'PENDING').toUpperCase()}`,
    `Payment Method: ${paymentMethodLabel(order.paymentMethod)}`,
    ...(orderUrl ? ['', `View My Orders: ${orderUrl}`] : []),
    '',
    'PICKUP INFORMATION',
    ...pickupInformationText(order.pickupStore || STORE_NAME),
    '',
    `${STORE_NAME} · ${STORE_EMAIL}`,
  ].join('\n');
  return { subject, html, text };
}

function buildWelcomeEmail(nameValue: string, storeUrl?: string | null) {
  const name = escapeHtml(nameValue || 'Rider');
  const subjectName = String(nameValue || 'Rider')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 80);
  const url = safeHttpsUrl(storeUrl) || 'https://rofik-godi.pages.dev/home';
  const assetBase = 'https://rofik-godi.pages.dev/images/welcome-email';
  const accent = '#F27921';
  const subject = `Welcome to Rofik Godi Centre, ${subjectName}!`;

  const content = `<tr><td align="center" style="background:#F5E2D3;padding:9px 16px;font-size:11px;font-weight:800;letter-spacing:.06em;color:#231F20;text-transform:uppercase">RATED <span style="color:${accent}">4.8 STARS</span> BASED ON <span style="color:${accent}">128+ REVIEWS</span></td></tr><tr><td align="center" style="background:#ACCBE0;padding:0"><div style="background:linear-gradient(180deg,#9EC1D6 0%,#BBD2E1 100%);padding:24px 20px 14px;text-align:center"><div style="font-size:13px;font-weight:600;letter-spacing:.08em;color:#1F2937;margin-top:2px">Welcome To</div><h1 class="hero-title" style="margin:4px 0;font-size:32px;font-weight:900;color:#0A0A0A">ROFIK GODI</h1><div style="font-size:13px;font-weight:600;letter-spacing:.06em;color:#1F2937">10% OFF Your Next Order</div><div style="display:inline-block;margin-top:12px;background:#FFFFFF;color:#111827;padding:7px 20px;font-size:12px;font-weight:800;letter-spacing:.06em">USE CODE: WELCOME10</div><div style="margin-top:10px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#09090B;color:#FFFFFF;text-decoration:none;padding:9px 26px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">SHOP NOW</a></div></div><img src="${assetBase}/hero-seat-lineup.jpg" alt="Rofik Godi Seat Covers" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr><tr><td class="pad" style="background:#FFFFFF;padding:28px 30px 26px;text-align:center"><div style="font-size:14px;font-weight:800;color:#1F2937">Hi ${name},</div><p style="margin:10px auto 0;max-width:380px;font-size:13px;line-height:1.68;color:#374151">Welcome to Rofik Godi Centre, ${name}. We're so glad to have you on board. To say thank you, here's a coupon code for <strong>10% OFF</strong> your next order.</p><div style="width:220px;margin:16px auto 8px;padding:11px 18px;background:#F3DEC9;border:1.5px dashed #C89E78;font-size:14px;font-weight:800;letter-spacing:.06em;color:#1F2937">WELCOME10</div><div style="font-size:12px;color:#374151;margin-bottom:14px">Use code at checkout</div><a href="${escapeHtml(url)}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;padding:10px 28px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border-radius:2px">SHOP NOW</a></td></tr><tr><td class="pad" style="background:#F4F4F4;border-radius:32px 32px 0 0;padding:28px 22px 24px"><div style="text-align:center;font-size:11px;font-weight:800;color:#6B7280;letter-spacing:.08em;text-transform:uppercase">A smoother way to shop</div><div style="text-align:center;font-size:19px;font-weight:800;font-style:italic;line-height:1.3;color:#1F2937;margin:4px 0 18px;text-transform:uppercase">4 REASONS TO<br>RIDE WITH ROFIK GODI:</div><div style="background:#F2E4D7;border-radius:10px;padding:16px 18px;margin-bottom:12px"><strong style="color:${accent};font-size:12px">01 · RIDE FATIGUE-FREE</strong><div style="font-size:15px;font-weight:800;color:#18181B;margin-top:3px">Heavy-Duty Comfort</div><div style="font-size:12px;line-height:1.55;color:#374151;margin-top:4px">For every Rofik Godi seat cover ordered, we craft HIGH-DENSITY MEMORY FOAM &amp; anti-slip diamond quilting for all-day comfort.</div></div><div style="background:#F2E4D7;border-radius:10px;padding:16px 18px;margin-bottom:12px"><strong style="color:${accent};font-size:12px">02 · ZERO-RISK</strong><div style="font-size:15px;font-weight:800;color:#18181B;margin-top:3px">Zero-Risk Quality</div><div style="font-size:12px;line-height:1.55;color:#374151;margin-top:4px">PREMIUM PERFORMANCE &amp; materials that'll never let you down. 100% Waterproof, UV-Treated &amp; Tear-Proof Rexine.</div></div><div style="background:#F2E4D7;border-radius:10px;padding:16px 18px;margin-bottom:12px"><strong style="color:${accent};font-size:12px">03 · PERFECT MODEL FIT</strong><div style="font-size:15px;font-weight:800;color:#18181B;margin-top:3px">Perfect Model Fit</div><div style="font-size:12px;line-height:1.55;color:#374151;margin-top:4px">Find ready-made seat covers &amp; cushions matched to your Bike, Scooter, or Toto with easy store pickup.</div></div><div style="background:#F2E4D7;border-radius:10px;padding:16px 18px;margin-bottom:16px"><strong style="color:${accent};font-size:12px">04 · OUR STORY</strong><div style="font-size:15px;font-weight:800;color:#18181B;margin-top:3px">Our Story</div><div style="font-size:12px;line-height:1.55;color:#374151;margin-top:4px">We're a Berhampore-based seat workshop. Rofik Godi Centre brings ready-to-fit comfort for bikes, scooters &amp; totos with easy store pickup.</div></div><div style="text-align:center"><a href="${escapeHtml(url)}" style="display:inline-block;background:#09090B;color:#FFFFFF;text-decoration:none;padding:10px 30px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">SHOP NOW</a></div></td></tr><tr><td class="pad" style="background:#EFEFEF;padding:24px 18px 26px;text-align:center"><div style="font-size:20px;font-weight:800;font-style:italic;color:#18181B">Shop The Comfort Heroes</div><div style="font-size:10px;font-weight:800;letter-spacing:.05em;color:#374151;text-transform:uppercase;margin:5px 0 16px">RATED <span style="color:#2E9E5B">4.8 STARS</span> BASED ON <span style="color:#2E9E5B">128+ REVIEWS</span></div><table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0"><tr><td width="50%" valign="top"><div style="background:#FFFFFF;border-radius:6px;padding:12px 10px;text-align:center"><img src="${assetBase}/premium-bike-seat-cover.jpg" alt="Premium Bike Seat Cover" width="210" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto 8px"><div style="font-size:12px;font-weight:800;color:#18181B">Premium Bike Seat Cover</div><div style="font-size:11px;color:#374151;margin:4px 0 10px"><span style="color:${accent}">★★★★★</span> <em>128 reviews</em></div><a href="${escapeHtml(url)}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;padding:8px 18px;font-size:10px;font-weight:800;text-transform:uppercase">SHOP NOW</a></div></td><td width="50%" valign="top"><div style="background:#FFFFFF;border-radius:6px;padding:12px 10px;text-align:center"><img src="${assetBase}/sport-bike-seat-cover.jpg" alt="Sport Bike Seat Cover" width="210" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto 8px"><div style="font-size:12px;font-weight:800;color:#18181B">Sport Bike Seat Cover</div><div style="font-size:11px;color:#374151;margin:4px 0 10px"><span style="color:${accent}">★★★★★</span> <em>96 reviews</em></div><a href="${escapeHtml(url)}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;padding:8px 18px;font-size:10px;font-weight:800;text-transform:uppercase">SHOP NOW</a></div></td></tr><tr><td width="50%" valign="top"><div style="background:#FFFFFF;border-radius:6px;padding:12px 10px;text-align:center"><img src="${assetBase}/toto-comfort-godi-set.jpg" alt="Toto Comfort Godi Set" width="210" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto 8px"><div style="font-size:12px;font-weight:800;color:#18181B">Toto Comfort Godi Set</div><div style="font-size:11px;color:#374151;margin:4px 0 10px"><span style="color:${accent}">★★★★★</span> <em>84 reviews</em></div><a href="${escapeHtml(url)}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;padding:8px 18px;font-size:10px;font-weight:800;text-transform:uppercase">SHOP NOW</a></div></td><td width="50%" valign="top"><div style="background:#FFFFFF;border-radius:6px;padding:12px 10px;text-align:center"><img src="${assetBase}/gel-seat-cushion.jpg" alt="3D Gel Seat Cushion" width="210" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto 8px"><div style="font-size:12px;font-weight:800;color:#18181B">3D Gel Seat Cushion</div><div style="font-size:11px;color:#374151;margin:4px 0 10px"><span style="color:${accent}">★★★★★</span> <em>64 reviews</em></div><a href="${escapeHtml(url)}" style="display:inline-block;background:${accent};color:#FFFFFF;text-decoration:none;padding:8px 18px;font-size:10px;font-weight:800;text-transform:uppercase">SHOP NOW</a></div></td></tr></table><div style="margin:20px 0 10px;font-size:19px;font-weight:600;font-style:italic;color:#18181B">Crafted Ride Comfort</div><div style="background:#B8DCF0;border-radius:999px;padding:8px 16px;max-width:420px;margin:0 auto;font-size:11px;font-weight:800;color:#1F2937">100% Weatherproof &nbsp;•&nbsp; Easy Store Pickup</div></td></tr><tr><td class="pad" style="padding:16px 30px 26px">${pickupInformationHtml(STORE_NAME)}</td></tr>`;

  const html = emailShell(subject, content);
  const text = [
    `${STORE_NAME} — ${STORE_SUBTITLE}`,
    '',
    `Welcome, ${nameValue || 'Rider'}!`,
    'Thanks for creating an account. Your riding essentials, saved favourites and store-pickup orders are now easy to keep together.',
    'Use coupon code WELCOME10 at checkout for 10% OFF your next order.',
    '',
    'A SMOOTHER WAY TO SHOP — 4 REASONS TO RIDE WITH ROFIK GODI',
    '• Ride Fatigue-Free: High-density memory foam & anti-slip diamond quilting',
    '• Zero-Risk Quality: 100% Waterproof, UV-Treated & Tear-Proof Rexine',
    '• Perfect Model Fit: Ready-made seat covers & cushions for Bike, Scooter & Toto with easy store pickup',
    '• Our Story: Crafted at our Berhampore workshop with store pickup',
    ...(url ? ['', `Explore the store: ${url}`] : []),
    '',
    'STORE INFORMATION',
    ...pickupInformationText(STORE_NAME),
    '',
    'Thank you for joining us.',
  ].join('\n');
  return { subject, html, text };
}

const isValidCustomerEmail = validEmail;
const STORE_CONTACT = {
  name: STORE_NAME,
  phone: STORE_PHONE,
  email: STORE_EMAIL,
  mapUrl: STORE_MAP_URL,
};


const CONFIRMATION_LOG_TABLE = 'order_confirmation_email_logs';
const STATUS_LOG_TABLE = 'order_status_email_logs';
const WELCOME_LOG_TABLE = 'welcome_email_logs';
const PUBLIC_APP_URL = 'https://rofik-godi.pages.dev';
const ALLOWED_WEB_ORIGINS = new Set([PUBLIC_APP_URL, 'http://localhost:3000', 'http://127.0.0.1:3000']);
const ALLOWED_STATUS_EVENTS = new Set<OrderEmailEvent>(['COMPLETED']);
const allowedHeaders = 'authorization, x-client-info, apikey, content-type';

function responseHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_WEB_ORIGINS.has(origin) ? origin : PUBLIC_APP_URL,
    'Access-Control-Allow-Headers': allowedHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function isOrderNumber(value: unknown): value is string {
  return typeof value === 'string' && /^RGC-[A-F0-9]{12}$/i.test(value.trim());
}

function accountUrl(_origin: string | null, path = '/profile'): string | null {
  try {
    return new URL(path, PUBLIC_APP_URL).toString();
  } catch {
    return null;
  }
}

function getEmailConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const senderEmail = Deno.env.get('ROFIK_GODI_GMAIL')?.trim() || '';
  const appPassword = (Deno.env.get('ROFIK_GODI_GMAIL_APP_PASSWORD') || '').replace(/\s+/g, '');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !senderEmail || !appPassword || !isValidCustomerEmail(senderEmail)) {
    return null;
  }
  return { supabaseUrl, publishableKey, serviceRoleKey, senderEmail, appPassword };
}

async function sendMail(
  credentials: NonNullable<ReturnType<typeof getEmailConfig>>,
  to: string,
  subject: string,
  text: string,
  html: string,
  orderNumber?: string,
): Promise<boolean> {
  let client: SMTPClient | null = null;
  try {
    client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: { username: credentials.senderEmail, password: credentials.appPassword },
      },
      debug: { log: false, allowUnsecure: false },
    });
    await client.send({
      from: `ROFIK GODI CENTRE <${credentials.senderEmail}>`,
      to,
      subject,
      content: text,
      html,
      headers: orderNumber ? { 'X-Order-Number': orderNumber } : {},
    });
    return true;
  } catch {
    return false;
  } finally {
    if (client) {
      try { await client.close(); } catch { /* Do not log SMTP credentials or provider details. */ }
    }
  }
}

async function setLogStatus(
  serviceClient: SupabaseClient,
  table: string,
  filters: Record<string, string>,
  status: 'sent' | 'failed' | 'skipped',
  errorCode: string | null = null,
) {
  const values: Record<string, unknown> = {
    status,
    last_error_code: errorCode,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  };
  if (table === CONFIRMATION_LOG_TABLE) values.attempted_at = new Date().toISOString();
  else values.updated_at = new Date().toISOString();
  let query = serviceClient.from(table).update(values);
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const { error } = await query;
  if (error) console.error('Transactional email ledger update failed', { table, status });
}

async function claimRetryableLog(
  serviceClient: SupabaseClient,
  table: string,
  filters: Record<string, string>,
  insertValues: Record<string, unknown>,
): Promise<'claimed' | 'duplicate' | 'failed'> {
  const { error: insertError } = await serviceClient.from(table).insert(insertValues);
  if (!insertError) return 'claimed';
  if (insertError.code !== '23505') return 'failed';

  let readQuery = serviceClient.from(table).select('status,updated_at,attempt_count');
  for (const [column, value] of Object.entries(filters)) readQuery = readQuery.eq(column, value);
  const { data: current, error: readError } = await readQuery.maybeSingle();
  if (readError || !current) return 'failed';

  const isStaleProcessing = current.status === 'processing'
    && Date.parse(String(current.updated_at)) < Date.now() - 5 * 60 * 1000;
  if (current.status !== 'failed' && !isStaleProcessing) return 'duplicate';

  const attemptCount = Number(current.attempt_count || 1);
  if (attemptCount >= 20) return 'duplicate';
  let retryQuery = serviceClient.from(table)
    .update({
      status: 'processing',
      last_error_code: null,
      sent_at: null,
      updated_at: new Date().toISOString(),
      attempt_count: attemptCount + 1,
    })
    .eq('status', current.status)
    .eq('updated_at', current.updated_at)
    .select(Object.keys(filters).join(','));
  for (const [column, value] of Object.entries(filters)) retryQuery = retryQuery.eq(column, value);
  const { data, error: retryError } = await retryQuery.maybeSingle();
  if (retryError) return 'failed';
  return data ? 'claimed' : 'duplicate';
}

async function claimConfirmationLog(
  serviceClient: SupabaseClient,
  orderId: string,
  userId: string,
  hasRecipient: boolean,
): Promise<'claimed' | 'duplicate' | 'failed'> {
  const initialStatus = hasRecipient ? 'processing' : 'skipped';
  const { error: insertError } = await serviceClient.from(CONFIRMATION_LOG_TABLE).insert({
    order_id: orderId,
    user_id: userId,
    status: initialStatus,
    last_error_code: hasRecipient ? null : 'NO_VALID_CUSTOMER_EMAIL',
  });
  if (!insertError) return 'claimed';
  if (insertError.code !== '23505') return 'failed';

  const { data: current, error: readError } = await serviceClient
    .from(CONFIRMATION_LOG_TABLE)
    .select('status,attempted_at')
    .eq('order_id', orderId)
    .maybeSingle();
  if (readError || !current) return 'failed';
  const isStaleProcessing = current.status === 'processing'
    && Date.parse(String(current.attempted_at)) < Date.now() - 5 * 60 * 1000;
  if (!hasRecipient || (current.status !== 'failed' && !isStaleProcessing)) return 'duplicate';

  const { data, error: retryError } = await serviceClient
    .from(CONFIRMATION_LOG_TABLE)
    .update({ status: 'processing', last_error_code: null, sent_at: null, attempted_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('status', current.status)
    .eq('attempted_at', current.attempted_at)
    .select('order_id')
    .maybeSingle();
  if (retryError) return 'failed';
  return data ? 'claimed' : 'duplicate';
}

async function createClients(
  supabaseUrl: string,
  publishableKey: string,
  serviceRoleKey: string,
  authorization: string,
) {
  const userClient: SupabaseClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return { error: 'Authentication required' as const };
  return { userClient, serviceClient, user: authData.user };
}

async function handleWelcomeEmail(
  origin: string | null,
  credentials: NonNullable<ReturnType<typeof getEmailConfig>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown>; email_confirmed_at?: string | null; confirmed_at?: string | null; created_at?: string },
  serviceClient: SupabaseClient,
) {
  const recipient = (user.email || '').trim();
  const createdAt = user.created_at ? Date.parse(user.created_at) : NaN;
  const isRecentAccount = Number.isFinite(createdAt) && Date.now() - createdAt <= 30 * 24 * 60 * 60 * 1000;
  if (!isValidCustomerEmail(recipient) || !(user.email_confirmed_at || user.confirmed_at) || !isRecentAccount) {
    return jsonResponse({ ok: true, emailSent: false, reason: 'not_a_recent_confirmed_account' }, 200, origin);
  }

  const claim = await claimRetryableLog(
    serviceClient,
    WELCOME_LOG_TABLE,
    { user_id: user.id },
    { user_id: user.id, status: 'processing', last_error_code: null },
  );
  if (claim === 'duplicate') return jsonResponse({ ok: true, emailSent: false, duplicate: true }, 200, origin);
  if (claim === 'failed') return jsonResponse({ error: 'Welcome email could not be queued' }, 503, origin);

  const fullName = String(user.user_metadata?.full_name || user.user_metadata?.name || 'Rider').trim().slice(0, 120) || 'Rider';
  const email = buildWelcomeEmail(fullName, accountUrl(origin, '/home'));
  const sent = await sendMail(credentials, recipient, email.subject, email.text, email.html);
  await setLogStatus(serviceClient, WELCOME_LOG_TABLE, { user_id: user.id }, sent ? 'sent' : 'failed', sent ? null : 'SMTP_DELIVERY_FAILED');
  if (!sent) {
    console.warn('Welcome email delivery failed');
    return jsonResponse({ ok: true, emailSent: false }, 200, origin);
  }
  console.info('Welcome email sent');
  return jsonResponse({ ok: true, emailSent: true }, 200, origin);
}

async function handleOrderConfirmation(
  origin: string | null,
  credentials: NonNullable<ReturnType<typeof getEmailConfig>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  serviceClient: SupabaseClient,
  orderNumber: string,
) {
  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id,user_id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,fulfillment_method,pickup_store,created_at,order_items(product_id,product_name,quantity,unit_price)')
    .eq('user_id', user.id)
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (orderError || !order) return jsonResponse({ error: 'Order not found' }, 404, origin);

  const recipient = (user.email || '').trim();
  let productImages = new Map<string, string>();
  const productIds = [...new Set((order.order_items || []).map((item: { product_id?: string | null }) => item.product_id).filter((id: string | null | undefined): id is string => Boolean(id)))];
  if (productIds.length) {
    const { data: products } = await serviceClient.from('products').select('id,image_url').in('id', productIds);
    productImages = new Map((products || []).map((product: { id: string; image_url?: string | null }) => [String(product.id), String(product.image_url || '')]));
  }

  const emailItems = (order.order_items || []).map((item: { product_id?: string | null; product_name: string; quantity: number; unit_price: number }) => ({
    product_name: item.product_name,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    image_url: item.product_id ? productImages.get(item.product_id) || null : null,
  }));
  const hasRecipient = isValidCustomerEmail(recipient);
  const claim = await claimConfirmationLog(serviceClient, order.id, user.id, hasRecipient);
  if (claim === 'duplicate') return jsonResponse({ ok: true, emailSent: false, duplicate: true }, 200, origin);
  if (claim === 'failed') {
    console.error('Order confirmation email idempotency claim failed');
    return jsonResponse({ error: 'Email could not be queued' }, 503, origin);
  }
  if (!hasRecipient) return jsonResponse({ ok: true, emailSent: false, reason: 'no_valid_customer_email' }, 200, origin);

  const emailData: ConfirmationEmailOrder = {
    orderNumber: order.order_number,
    createdAt: order.created_at,
    customerName: String(order.customer_name || user.user_metadata?.full_name || 'Customer').slice(0, 120),
    customerPhone: order.customer_phone || '',
    customerEmail: recipient,
    pickupStore: order.pickup_store || '',
    fulfillmentMethod: order.fulfillment_method || '',
    status: order.status || 'NEW',
    paymentStatus: order.payment_status || 'PENDING',
    paymentMethod: order.payment_method || 'PAY_AT_STORE',
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    items: emailItems,
    orderUrl: accountUrl(origin),
  };
  const email = buildOrderConfirmationEmail(emailData);
  const sent = await sendMail(credentials, recipient, email.subject, email.text, email.html, order.order_number);
  await setLogStatus(serviceClient, CONFIRMATION_LOG_TABLE, { order_id: order.id }, sent ? 'sent' : 'failed', sent ? null : 'SMTP_DELIVERY_FAILED');
  if (!sent) {
    console.warn('Order confirmation email delivery failed');
    return jsonResponse({ ok: true, emailSent: false }, 200, origin);
  }
  console.info('Order confirmation email sent', { orderNumber: order.order_number });
  return jsonResponse({ ok: true, emailSent: true }, 200, origin);
}

async function handleOrderStatusEmail(
  origin: string | null,
  credentials: NonNullable<ReturnType<typeof getEmailConfig>>,
  userClient: SupabaseClient,
  serviceClient: SupabaseClient,
  event: OrderEmailEvent,
  orderNumber: string,
) {
  const { data: isAdmin, error: adminError } = await userClient.rpc('is_admin');
  if (adminError || isAdmin !== true) return jsonResponse({ error: 'Administrator access is required' }, 403, origin);

  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id,user_id,order_number,customer_name,customer_phone,payment_method,payment_status,status,subtotal,discount,total,fulfillment_method,pickup_store,created_at,order_items(product_id,product_name,quantity,unit_price)')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (orderError || !order || order.fulfillment_method !== 'STORE_PICKUP') {
    return jsonResponse({ error: 'Store-pickup order not found' }, 404, origin);
  }
  const eventIsCurrent = String(order.status || '').toUpperCase() === event;
  let eventWasRecorded = eventIsCurrent;
  if (!eventWasRecorded) {
    const { data: statusHistory, error: historyError } = await serviceClient
      .from('order_status_history')
      .select('id')
      .eq('order_id', order.id)
      .eq('to_status', event)
      .limit(1)
      .maybeSingle();
    eventWasRecorded = !historyError && Boolean(statusHistory);
  }
  if (!eventWasRecorded) return jsonResponse({ ok: true, emailSent: false, reason: 'stale_order_event' }, 200, origin);

  const claim = await claimRetryableLog(
    serviceClient,
    STATUS_LOG_TABLE,
    { order_id: order.id, event_key: event },
    { order_id: order.id, event_key: event, status: 'processing', last_error_code: null },
  );
  if (claim === 'duplicate') return jsonResponse({ ok: true, emailSent: false, duplicate: true }, 200, origin);
  if (claim === 'failed') return jsonResponse({ error: 'Order update email could not be queued' }, 503, origin);

  const { data: customerData, error: customerError } = await serviceClient.auth.admin.getUserById(order.user_id);
  const recipient = (customerData.user?.email || '').trim();
  if (customerError || !isValidCustomerEmail(recipient)) {
    await setLogStatus(serviceClient, STATUS_LOG_TABLE, { order_id: order.id, event_key: event }, 'skipped', 'NO_VALID_CUSTOMER_EMAIL');
    return jsonResponse({ ok: true, emailSent: false, reason: 'no_valid_customer_email' }, 200, origin);
  }

  let productImages = new Map<string, string>();
  const productIds = [...new Set((order.order_items || []).map((item: { product_id?: string | null }) => item.product_id).filter((id: string | null | undefined): id is string => Boolean(id)))];
  if (productIds.length) {
    const { data: products } = await serviceClient.from('products').select('id,image_url').in('id', productIds);
    productImages = new Map((products || []).map((product: { id: string; image_url?: string | null }) => [String(product.id), String(product.image_url || '')]));
  }
  const emailItems = (order.order_items || []).map((item: { product_id?: string | null; product_name: string; quantity: number; unit_price: number }) => ({
    product_name: item.product_name,
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || 0),
    image_url: item.product_id ? productImages.get(item.product_id) || null : null,
  }));
  const email = buildOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: String(order.customer_name || customerData.user?.user_metadata?.full_name || 'Rider').slice(0, 120),
    pickupStore: order.pickup_store || 'ROFIK GODI CENTRE',
    event,
    items: emailItems,
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    paymentStatus: order.payment_status || 'PENDING',
    paymentMethod: order.payment_method || 'PAY_AT_STORE',
    orderUrl: accountUrl(origin),
  });
  const sent = await sendMail(credentials, recipient, email.subject, email.text, email.html, order.order_number);
  await setLogStatus(serviceClient, STATUS_LOG_TABLE, { order_id: order.id, event_key: event }, sent ? 'sent' : 'failed', sent ? null : 'SMTP_DELIVERY_FAILED');
  if (!sent) {
    console.warn('Order status email delivery failed', { event });
    return jsonResponse({ ok: true, emailSent: false }, 200, origin);
  }
  console.info('Order status email sent', { event });
  return jsonResponse({ ok: true, emailSent: true }, 200, origin);
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response('ok', { headers: responseHeaders(origin) });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, origin);

  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ error: 'Authentication required' }, 401, origin);
    }

    let body: { type?: unknown; orderNumber?: unknown; event?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400, origin);
    }
    const type = body.type === undefined ? 'order_confirmation' : body.type;
    if (type !== 'order_confirmation' && type !== 'order_status_update' && type !== 'welcome') {
      return jsonResponse({ error: 'Unsupported email type' }, 400, origin);
    }

    const credentials = getEmailConfig();
    if (!credentials) {
      console.error('Transactional email configuration is incomplete');
      return jsonResponse({ error: 'Email service is temporarily unavailable' }, 503, origin);
    }
    const clients = await createClients(
      credentials.supabaseUrl,
      credentials.publishableKey,
      credentials.serviceRoleKey,
      authorization,
    );
    if ('error' in clients) return jsonResponse({ error: clients.error }, 401, origin);

    if (type === 'welcome') {
      return await handleWelcomeEmail(origin, credentials, clients.user, clients.serviceClient);
    }
    if (!isOrderNumber(body.orderNumber)) return jsonResponse({ error: 'Invalid order number' }, 400, origin);
    const orderNumber = body.orderNumber.trim().toUpperCase();

    if (type === 'order_confirmation') {
      return await handleOrderConfirmation(origin, credentials, clients.user, clients.serviceClient, orderNumber);
    }
    if (typeof body.event !== 'string' || !ALLOWED_STATUS_EVENTS.has(body.event as OrderEmailEvent)) {
      return jsonResponse({ error: 'Invalid order update event' }, 400, origin);
    }
    return await handleOrderStatusEmail(
      origin,
      credentials,
      clients.userClient,
      clients.serviceClient,
      body.event as OrderEmailEvent,
      orderNumber,
    );
  } catch {
    console.error('Transactional email request failed');
    return jsonResponse({ error: 'Email service is temporarily unavailable' }, 503, request.headers.get('origin'));
  }
});
