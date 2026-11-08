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

export function buildWelcomeEmail(
  nameValue: string,
  storeUrl?: string | null,
  promotion?: { code: string; discountPercent: number } | null,
) {
  const displayName = String(nameValue || 'Rider').replace(/[\r\n]+/g, ' ').slice(0, 120) || 'Rider';
  const name = escapeHtml(displayName);
  const subjectName = displayName.slice(0, 80);
  const url = safeHttpsUrl(storeUrl) || 'https://rofik-godi.pages.dev/home';
  const assetBase = 'https://rofik-godi.pages.dev/images/welcome-email';
  const offer = promotion
    && /^[A-Z0-9_-]{3,40}$/i.test(promotion.code)
    && Number.isFinite(promotion.discountPercent)
    && promotion.discountPercent > 0
    && promotion.discountPercent <= 100
    ? { code: promotion.code.toUpperCase(), discountPercent: Number(promotion.discountPercent.toFixed(2)) }
    : null;
  const percentLabel = offer ? String(offer.discountPercent) : '';
  const subject = `Welcome to Rofik Godi Centre, ${subjectName}!`;
  const offerHero = offer
    ? `<div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:#1F2937">${percentLabel}% OFF Your Next Order</div><div style="display:inline-block;margin-top:11px;background:#FFFFFF;color:${RED};padding:7px 18px;font-size:12px;font-weight:900;letter-spacing:.06em">USE CODE: ${escapeHtml(offer.code)}</div>`
    : '<div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:#1F2937">Seat covers, cushions &amp; ride essentials</div>';
  const offerCard = offer
    ? `<div style="width:220px;margin:16px auto 8px;padding:11px 18px;background:#FDEBEC;border:1.5px dashed ${RED};font-size:14px;font-weight:900;letter-spacing:.06em;color:${RED}">${escapeHtml(offer.code)}</div><div style="font-size:12px;color:#374151;margin-bottom:14px">Use code at checkout for ${percentLabel}% off</div>`
    : '';
  const intro = offer
    ? `Welcome to Rofik Godi Centre, ${name}. We're glad you're here. Use the welcome code below for ${percentLabel}% off your next order while the offer is active.`
    : `Welcome to Rofik Godi Centre, ${name}. Explore seat covers, cushions and ride essentials, with store pickup available.`;
  const reasons = [
    ['01', 'COMFORT FOR EVERYDAY RIDES', 'Explore comfort-focused seat covers and cushions for your everyday journeys.'],
    ['02', 'QUALITY OPTIONS', 'Compare materials, features and stitch details on each product before ordering.'],
    ['03', 'FIND YOUR MODEL', 'Browse bike, scooter and toto options, then check compatible models.'],
    ['04', 'EASY STORE PICKUP', 'Order online and collect your purchase from Rofik Godi Centre.'],
  ].map(([number, title, description]) =>
    `<div style="background:#F7EEE8;border-radius:10px;padding:15px 17px;margin-bottom:11px"><strong style="color:${RED};font-size:12px">${number} · ${title}</strong><div style="font-size:12px;line-height:1.6;color:#374151;margin-top:5px">${description}</div></div>`,
  ).join('');
  const productCard = (image: string, title: string) =>
    `<td width="50%" valign="top" style="padding:6px"><div style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;padding:12px 10px;text-align:center"><img src="${assetBase}/${image}" alt="${escapeHtml(title)}" width="210" style="width:100%;max-width:210px;height:auto;display:block;margin:0 auto 9px;border:0"><div style="font-size:12px;font-weight:800;color:#18181B">${escapeHtml(title)}</div><a href="${escapeHtml(url)}" style="display:inline-block;background:${RED};color:#FFFFFF;text-decoration:none;padding:8px 18px;margin-top:11px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase">SHOP NOW</a></div></td>`;
  const products = [
    ['premium-bike-seat-cover.jpg', 'Premium Bike Seat Cover'],
    ['sport-bike-seat-cover.jpg', 'Sport Bike Seat Cover'],
    ['toto-comfort-godi-set.jpg', 'Toto Comfort Seat Set'],
    ['gel-seat-cushion.jpg', 'Gel Seat Cushion'],
  ] as const;
  const productRows = [
    `<tr>${productCard(...products[0])}${productCard(...products[1])}</tr>`,
    `<tr>${productCard(...products[2])}${productCard(...products[3])}</tr>`,
  ].join('');
  const content = [
    `<tr><td align="center" style="background:#FDEBEC;padding:10px 16px;font-size:11px;font-weight:900;letter-spacing:.08em;color:${RED};text-transform:uppercase">MADE FOR COMFORTABLE EVERYDAY RIDES</td></tr>`,
    `<tr><td align="center" style="background:#ACCBE0;padding:0"><div style="background:#B8D3E3;padding:23px 20px 17px;text-align:center"><div style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#1F2937">Welcome to</div><h1 class="hero-title" style="margin:4px 0 8px;font-size:32px;font-weight:900;color:#0A0A0A">ROFIK GODI</h1>${offerHero}<div style="margin-top:12px"><a href="${escapeHtml(url)}" style="display:inline-block;background:${RED};color:#FFFFFF;text-decoration:none;padding:10px 25px;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase">SHOP NOW</a></div></div><img src="${assetBase}/hero-seat-lineup.jpg" alt="Rofik Godi seat covers and riding comfort products" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>`,
    `<tr><td class="pad" style="background:#FFFFFF;padding:27px 26px 25px;text-align:center"><div style="font-size:14px;font-weight:800;color:#1F2937">Hi ${name},</div><p style="margin:10px auto 0;max-width:420px;font-size:13px;line-height:1.7;color:#374151">${intro}</p>${offerCard}<a href="${escapeHtml(url)}" style="display:inline-block;background:${RED};color:#FFFFFF;text-decoration:none;padding:10px 28px;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase">EXPLORE THE STORE</a></td></tr>`,
    `<tr><td class="pad" style="background:#F7F7F7;padding:25px 22px 24px"><div style="text-align:center;font-size:11px;font-weight:900;color:${RED};letter-spacing:.08em;text-transform:uppercase">A smoother way to shop</div><div style="text-align:center;font-size:19px;font-weight:900;line-height:1.3;color:#1F2937;margin:5px 0 18px;text-transform:uppercase">RIDE COMFORT, MADE SIMPLE</div>${reasons}<div style="text-align:center"><a href="${escapeHtml(url)}" style="display:inline-block;background:${RED};color:#FFFFFF;text-decoration:none;padding:10px 28px;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase">BROWSE PRODUCTS</a></div></td></tr>`,
    `<tr><td class="pad" style="background:#EFEFEF;padding:24px 16px 25px;text-align:center"><div style="font-size:19px;font-weight:900;color:#18181B">Shop the Comfort Collection</div><div style="font-size:11px;color:#4B5563;margin:6px 0 13px">Seat covers, cushions and toto comfort essentials</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${productRows}</table><div style="margin:18px 0 4px;font-size:13px;font-weight:800;color:${RED}">Comfort for the ride ahead</div><div style="font-size:11px;color:#374151">Easy store pickup at Rofik Godi Centre</div></td></tr>`,
    `<tr><td class="pad" style="padding:14px 26px 24px">${pickupInformationHtml(STORE_NAME)}</td></tr>`,
  ].join('');
  const html = emailShell(subject, content);
  const text = [
    `${STORE_NAME} — ${STORE_SUBTITLE}`,
    '',
    `Welcome, ${displayName}!`,
    'Thanks for creating an account. Explore seat covers, cushions and ride essentials, with store pickup available.',
    ...(offer ? [`Use coupon code ${offer.code} at checkout for ${percentLabel}% off your next order while the offer is active.`] : []),
    '',
    'A SMOOTHER WAY TO SHOP',
    '• Comfort-focused seat covers and cushions for everyday journeys',
    '• Compare materials, features and stitching on each product',
    '• Browse bike, scooter and toto options and check compatible models',
    '• Order online and collect from Rofik Godi Centre',
    '',
    'SHOP THE COMFORT COLLECTION',
    '• Premium Bike Seat Cover',
    '• Sport Bike Seat Cover',
    '• Toto Comfort Seat Set',
    '• Gel Seat Cushion',
    ...(url ? ['', `Explore the store: ${url}`] : []),
    '',
    'STORE INFORMATION',
    ...pickupInformationText(STORE_NAME),
    '',
    'Thank you for joining us.',
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
