export interface ConfirmationEmailItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  image_url?: string | null;
}

export interface ConfirmationEmailOrder {
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

export type OrderEmailEvent = 'COMPLETED';

export interface OrderStatusEmail {
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

export function buildOrderConfirmationEmail(order: ConfirmationEmailOrder) {
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

export function buildOrderStatusEmail(order: OrderStatusEmail) {
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

export function buildWelcomeEmail(nameValue: string, storeUrl?: string | null) {
  const name = escapeHtml(nameValue || 'Rider');
  const subjectName = String(nameValue || 'Rider').replace(/[\r\n]+/g, ' ').slice(0, 80);
  const subject = `Welcome to Rofik Godi Centre, ${subjectName}!`;
  const url = safeHttpsUrl(storeUrl) || 'https://rofik-godi.pages.dev/shop';
  const assetBase = 'https://rofik-godi.pages.dev/images/welcome-email';

  // Standalone welcome email: does not use emailShell().
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:24px 8px;background:#2C2623;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;overflow:hidden;box-shadow:0 14px 36px rgba(0,0,0,0.22);">
        <tr><td align="center" style="background:#F5E2D3;padding:9px 16px;font-size:11px;font-weight:800;letter-spacing:.06em;color:#231F20;text-transform:uppercase">RATED <span style="color:#D9232D">4.8 STARS</span> BASED ON <span style="color:#D9232D">128+ REVIEWS</span></td></tr><tr><td align="center" style="background:#ACCBE0;padding:0"><div style="background:linear-gradient(180deg,#9EC1D6 0%,#BBD2E1 100%);padding:24px 20px 14px;text-align:center"><div style="font-size:13px;font-weight:600;letter-spacing:.08em;color:#1F2937;margin-top:2px">Welcome To</div><h1 class="hero-title" style="margin:4px 0;font-size:32px;font-weight:900;color:#0A0A0A">ROFIK GODI</h1><div style="font-size:13px;font-weight:600;letter-spacing:.06em;color:#1F2937">10% OFF Your Next Order</div><div style="display:inline-block;margin-top:12px;background:#FFFFFF;color:#111827;padding:7px 20px;font-size:12px;font-weight:800;letter-spacing:.06em">USE CODE: WELCOME10</div><div style="margin-top:10px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#09090B;color:#FFFFFF;text-decoration:none;padding:9px 26px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">SHOP NOW</a></div></div><img src="${assetBase}/hero-seat-lineup.jpg" alt="Rofik Godi Seat Covers" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr><tr><td class="pad" style="background:#FFFFFF;padding:30px 32px 28px;text-align:center"><div style="font-size:14px;font-weight:800;color:#1F2937">Hi ${name},</div><p style="margin:10px auto 0;max-width:360px;font-size:13px;line-height:1.68;color:#374151">Welcome to Rofik Godi Centre, ${name}. We're so glad to have you on board. To say thank you, here's a coupon code for <strong>10% OFF</strong> your next order.</p><div style="width:230px;margin:18px auto 8px;padding:11px 18px;background:#F3DEC9;border:1.5px dashed #C89E78;font-size:14px;font-weight:800;letter-spacing:.06em;color:#1F2937">WELCOME10</div><div style="font-size:12px;color:#374151;margin-bottom:14px">Use code at checkout</div><a href="${escapeHtml(url)}" style="display:inline-block;background:#D9232D;color:#FFFFFF;text-decoration:none;padding:10px 28px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;border-radius:2px">SHOP NOW</a></td></tr><tr><td class="pad" style="background:#F4F4F4;border-radius:32px 32px 0 0;padding:28px 22px 24px"><div style="text-align:center;font-size:11px;font-weight:800;color:#6B7280;letter-spacing:.08em;text-transform:uppercase">A smoother way to shop</div><div style="text-align:center;font-size:19px;font-weight:800;font-style:italic;line-height:1.3;color:#1F2937;margin:4px 0 18px;text-transform:uppercase">4 REASONS TO<br>RIDE WITH ROFIK GODI:</div><div style="background:#F2E4D7;border-radius:10px;padding:16px 18px;margin-bottom:12px"><strong style="color:#D9232D;font-size:12px">01 · RIDE FATIGUE-FREE</strong><div style="font-size:15px;font-weight:800;color:#18181B;margin-top:3px">Heavy-Duty Comfort</div><div style="font-size:12px;line-height:1.55;color:#374151;margin-top:4px">For every Rofik Godi seat cover ordered, we craft HIGH-DENSITY MEMORY FOAM &amp; anti-slip quilting for all-day comfort.</div></div><div style="background:#F2E4D7;border-radius:10px;padding:16px 18px;margin-bottom:12px"><strong style="color:#D9232D;font-size:12px">02 · ZERO-RISK</strong><div style="font-size:15px;font-weight:800;color:#18181B;margin-top:3px">Zero-Risk Quality</div><div style="font-size:12px;line-height:1.55;color:#374151;margin-top:4px">PREMIUM PERFORMANCE &amp; materials that'll never let you down. 100% Waterproof, UV-Treated &amp; Tear-Proof Rexine.</div></div><div style="background:#F2E4D7;border-radius:10px;padding:16px 18px;margin-bottom:12px"><strong style="color:#D9232D;font-size:12px">03 · PERFECT MODEL FIT</strong><div style="font-size:15px;font-weight:800;color:#18181B;margin-top:3px">Perfect Model Fit</div><div style="font-size:12px;line-height:1.55;color:#374151;margin-top:4px">Find ready-made seat covers &amp; cushions matched to your Bike, Scooter, or Toto with easy store pickup.</div></div><div style="background:#F2E4D7;border-radius:10px;padding:16px 18px;margin-bottom:16px"><strong style="color:#D9232D;font-size:12px">04 · OUR STORY</strong><div style="font-size:15px;font-weight:800;color:#18181B;margin-top:3px">Our Story</div><div style="font-size:12px;line-height:1.55;color:#374151;margin-top:4px">We're a Berhampore-based seat workshop. Rofik Godi Centre brings ready-to-fit comfort for bikes, scooters &amp; totos with easy store pickup.</div></div><div style="text-align:center"><a href="${escapeHtml(url)}" style="display:inline-block;background:#09090B;color:#FFFFFF;text-decoration:none;padding:10px 30px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">SHOP NOW</a></div></td></tr><tr><td class="pad" style="background:#EFEFEF;padding:24px 18px 26px;text-align:center"><div style="font-size:20px;font-weight:800;font-style:italic;color:#18181B">Shop The Comfort Heroes</div><div style="font-size:10px;font-weight:800;letter-spacing:.05em;color:#374151;text-transform:uppercase;margin:5px 0 16px">RATED <span style="color:#2E9E5B">4.8 STARS</span> BASED ON <span style="color:#2E9E5B">128+ REVIEWS</span></div><table role="presentation" width="100%" cellspacing="0" cellpadding="6" border="0"><tr><td width="50%" valign="top"><div style="background:#FFFFFF;border-radius:6px;padding:12px 10px;text-align:center"><img src="${assetBase}/premium-bike-seat-cover.jpg" alt="Premium Bike Seat Cover" width="210" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto 8px"><div style="font-size:12px;font-weight:800;color:#18181B">Premium Bike Seat Cover</div><div style="font-size:11px;color:#374151;margin:4px 0 10px"><span style="color:#D9232D">★★★★★</span> <em>128 reviews</em></div><a href="${escapeHtml(url)}" style="display:inline-block;background:#D9232D;color:#FFFFFF;text-decoration:none;padding:8px 18px;font-size:10px;font-weight:800;text-transform:uppercase">SHOP NOW</a></div></td><td width="50%" valign="top"><div style="background:#FFFFFF;border-radius:6px;padding:12px 10px;text-align:center"><img src="${assetBase}/sport-bike-seat-cover.jpg" alt="Sport Bike Seat Cover" width="210" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto 8px"><div style="font-size:12px;font-weight:800;color:#18181B">Sport Bike Seat Cover</div><div style="font-size:11px;color:#374151;margin:4px 0 10px"><span style="color:#D9232D">★★★★★</span> <em>96 reviews</em></div><a href="${escapeHtml(url)}" style="display:inline-block;background:#D9232D;color:#FFFFFF;text-decoration:none;padding:8px 18px;font-size:10px;font-weight:800;text-transform:uppercase">SHOP NOW</a></div></td></tr><tr><td width="50%" valign="top"><div style="background:#FFFFFF;border-radius:6px;padding:12px 10px;text-align:center"><img src="${assetBase}/toto-comfort-godi-set.jpg" alt="Toto Comfort Godi Set" width="210" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto 8px"><div style="font-size:12px;font-weight:800;color:#18181B">Toto Comfort Godi Set</div><div style="font-size:11px;color:#374151;margin:4px 0 10px"><span style="color:#D9232D">★★★★★</span> <em>84 reviews</em></div><a href="${escapeHtml(url)}" style="display:inline-block;background:#D9232D;color:#FFFFFF;text-decoration:none;padding:8px 18px;font-size:10px;font-weight:800;text-transform:uppercase">SHOP NOW</a></div></td><td width="50%" valign="top"><div style="background:#FFFFFF;border-radius:6px;padding:12px 10px;text-align:center"><img src="${assetBase}/gel-seat-cushion.jpg" alt="3D Gel Seat Cushion" width="210" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto 8px"><div style="font-size:12px;font-weight:800;color:#18181B">3D Gel Seat Cushion</div><div style="font-size:11px;color:#374151;margin:4px 0 10px"><span style="color:#D9232D">★★★★★</span> <em>64 reviews</em></div><a href="${escapeHtml(url)}" style="display:inline-block;background:#D9232D;color:#FFFFFF;text-decoration:none;padding:8px 18px;font-size:10px;font-weight:800;text-transform:uppercase">SHOP NOW</a></div></td></tr></table><div style="margin:20px 0 10px;font-size:19px;font-weight:600;font-style:italic;color:#18181B">Crafted Ride Comfort</div><div style="background:#B8DCF0;border-radius:999px;padding:8px 16px;max-width:420px;margin:0 auto;font-size:11px;font-weight:800;color:#1F2937">100% Weatherproof &nbsp;•&nbsp; Easy Store Pickup &nbsp;•&nbsp; 3+ Years Durability</div></td></tr><tr><td style="background:#FFFFFF;padding:20px 26px;border-top:1px solid #E5E7EB;text-align:center;font-size:12px;color:#475467;line-height:1.7"><strong style="color:#101828;">ROFIK GODI CENTRE</strong><br>Jalangi Road, Raninagar, Keshobnagar, Berhampore, West Bengal 742102<br><a href="https://maps.app.goo.gl/hRVfWHTkQ6vkrcS7A" style="color:#A71925;font-weight:800;text-decoration:underline;">Open store location in Google Maps</a><br>Call: <a href="tel:+919775333555" style="color:#344054;font-weight:700;text-decoration:underline;">+91 9775333555</a> · <a href="mailto:rofikgodicentre.store@gmail.com" style="color:#1a73e8;text-decoration:underline;font-weight:800;">rofikgodicentre.store@gmail.com</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Welcome to Rofik Godi Centre, ${nameValue || 'Rider'}!`,
    'Get 10% OFF your next order with code WELCOME10.',
    `Shop now: ${url}`,
    '',
    '4 REASONS TO RIDE WITH ROFIK GODI',
    'Heavy-Duty Comfort, Zero-Risk Quality, Perfect Model Fit, Local Workshop.',
    '',
    'ROFIK GODI CENTRE',
    'Jalangi Road, Raninagar, Keshobnagar, Berhampore, West Bengal 742102',
    'Google Maps: https://maps.app.goo.gl/hRVfWHTkQ6vkrcS7A',
    'Call: +91 9775333555',
    'Email: rofikgodicentre.store@gmail.com',
  ].join('\n');
  return { subject, html, text };
}

export const isValidCustomerEmail = validEmail;
export const STORE_CONTACT = {
  name: STORE_NAME,
  phone: STORE_PHONE,
  email: STORE_EMAIL,
  mapUrl: STORE_MAP_URL,
};
