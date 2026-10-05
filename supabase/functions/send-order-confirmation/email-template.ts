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

const STORE_NAME = 'ROFIK GODI CENTRE';
const STORE_SUBTITLE = 'CUSTOM SEAT COMFORT';
const STORE_ADDRESS = 'Jalangi Road, Raninagar, Keshobnagar, Berhampore, West Bengal 742102';
const STORE_PHONE = '+91 98321 45678';
const STORE_EMAIL = 'support@rofikgodi.com';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
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
  };
  return labels[String(value || '').toUpperCase()] || 'Order Placed';
}

function paymentMethodLabel(value: string): string {
  return String(value || '').toUpperCase() === 'PAY_ONLINE' ? 'UPI / Online' : 'Pay at Store';
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function buildOrderConfirmationEmail(order: ConfirmationEmailOrder) {
  const orderNumber = escapeHtml(order.orderNumber);
  const name = escapeHtml(order.customerName || 'Customer');
  const phone = escapeHtml(order.customerPhone || '—');
  const email = escapeHtml(order.customerEmail);
  const store = escapeHtml(order.pickupStore || STORE_NAME);
  const date = escapeHtml(orderDate(order.createdAt));
  const status = escapeHtml(statusLabel(order.status));
  const paymentStatus = escapeHtml(String(order.paymentStatus || 'PENDING').toUpperCase());
  const method = escapeHtml(paymentMethodLabel(order.paymentMethod));
  const orderUrl = safeHttpsUrl(order.orderUrl);
  const subject = `Order Confirmed — #${order.orderNumber} | Rofik Godi Centre`;

  const productRows = order.items.map((item) => {
    const productName = escapeHtml(item.product_name || 'Product');
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unit_price) || 0);
    const lineTotal = amount(quantity * unitPrice);
    const imageUrl = safeHttpsUrl(item.image_url);
    const image = imageUrl
      ? `<td width="64" style="padding:12px 10px 12px 0;vertical-align:top"><img src="${escapeHtml(imageUrl)}" width="56" height="56" alt="${productName}" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:10px;border:1px solid #e2e8f0"></td>`
      : '';
    return `<tr>${image}<td style="padding:12px 8px;vertical-align:top;border-bottom:1px solid #edf0f4"><div style="font-size:14px;font-weight:700;color:#0f172a">${productName}</div><div style="margin-top:4px;font-size:12px;color:#64748b">Qty: ${quantity} · ${amount(unitPrice)} each</div></td><td align="right" style="padding:12px 0 12px 8px;vertical-align:top;border-bottom:1px solid #edf0f4;white-space:nowrap;font-size:14px;font-weight:700;color:#0f172a">${lineTotal}</td></tr>`;
  }).join('');

  const textItems = order.items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unit_price) || 0);
    return `• ${item.product_name || 'Product'} — Qty: ${quantity} × ${amount(unitPrice)} = ${amount(quantity * unitPrice)}`;
  }).join('\n');

  const button = orderUrl
    ? `<tr><td style="padding:24px 28px 8px"><a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">View My Order</a></td></tr>`
    : '';

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title><style>@media only screen and (max-width:600px){.container{width:100%!important}.pad{padding-left:18px!important;padding-right:18px!important}.stack{display:block!important;width:100%!important}}</style></head><body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f8fb;padding:24px 10px"><tr><td align="center"><table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e8edf3;border-radius:16px;overflow:hidden"><tr><td class="pad" style="padding:24px 28px;background:#ffffff;border-bottom:3px solid #d9232d"><div style="font-size:18px;font-weight:800;letter-spacing:.06em;color:#0f172a">${STORE_NAME}</div><div style="margin-top:4px;font-size:10px;font-weight:700;letter-spacing:.18em;color:#d9232d">${STORE_SUBTITLE}</div></td></tr><tr><td class="pad" style="padding:28px 28px 8px"><div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#e8f8f0;color:#087443;font-size:11px;font-weight:700">ORDER CONFIRMED</div><h1 style="margin:15px 0 8px;font-size:24px;line-height:1.25;color:#0f172a">Thank you for your order, ${name}!</h1><p style="margin:0;font-size:14px;line-height:1.65;color:#475569">Your order has been successfully placed. We’ll keep you updated as it moves through the store-pickup process.</p></td></tr><tr><td class="pad" style="padding:20px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f8fb;border:1px solid #e8edf3;border-radius:12px"><tr><td style="padding:14px 16px;border-bottom:1px solid #e8edf3"><div style="font-size:11px;color:#64748b">Order ID</div><div style="margin-top:4px;font-size:16px;font-weight:800;color:#0f172a">#${orderNumber}</div></td><td align="right" style="padding:14px 16px;border-bottom:1px solid #e8edf3"><div style="font-size:11px;color:#64748b">Order Date</div><div style="margin-top:4px;font-size:13px;font-weight:700;color:#0f172a">${date}</div></td></tr><tr><td style="padding:12px 16px"><div style="font-size:11px;color:#64748b">Order Status</div><div style="margin-top:4px;font-size:13px;font-weight:700;color:#087443">${status}</div></td><td align="right" style="padding:12px 16px"><div style="font-size:11px;color:#64748b">Total</div><div style="margin-top:4px;font-size:16px;font-weight:800;color:#0f172a">${amount(order.total)}</div></td></tr></table></td></tr><tr><td class="pad" style="padding:0 28px 8px"><h2 style="margin:0 0 10px;font-size:15px;color:#0f172a">Customer Information</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:7px 0;font-size:12px;color:#64748b">Name</td><td align="right" style="padding:7px 0;font-size:12px;font-weight:700;color:#0f172a">${name}</td></tr><tr><td style="padding:7px 0;font-size:12px;color:#64748b">Phone</td><td align="right" style="padding:7px 0;font-size:12px;font-weight:700;color:#0f172a">${phone}</td></tr><tr><td style="padding:7px 0;font-size:12px;color:#64748b">Email</td><td align="right" style="padding:7px 0;font-size:12px;font-weight:700;color:#0f172a;word-break:break-word">${email}</td></tr><tr><td style="padding:7px 0;font-size:12px;color:#64748b">Pickup Store</td><td align="right" style="padding:7px 0;font-size:12px;font-weight:700;color:#0f172a">${store}</td></tr></table></td></tr><tr><td class="pad" style="padding:15px 28px 6px"><h2 style="margin:0 0 10px;font-size:15px;color:#0f172a">Ordered Products</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${productRows}</table></td></tr><tr><td class="pad" style="padding:16px 28px 8px"><h2 style="margin:0 0 10px;font-size:15px;color:#0f172a">Payment Summary</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:6px 0;font-size:12px;color:#64748b">Subtotal</td><td align="right" style="padding:6px 0;font-size:12px;color:#334155">${amount(order.subtotal)}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b">Discount</td><td align="right" style="padding:6px 0;font-size:12px;color:#087443">−${amount(order.discount)}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #e8edf3;font-size:14px;font-weight:800;color:#0f172a">Total</td><td align="right" style="padding:10px 0;border-top:1px solid #e8edf3;font-size:15px;font-weight:800;color:#0f172a">${amount(order.total)}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b">Payment Status</td><td align="right" style="padding:6px 0;font-size:12px;font-weight:700;color:#087443">${paymentStatus}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b">Payment Method</td><td align="right" style="padding:6px 0;font-size:12px;color:#334155">${method}</td></tr></table></td></tr><tr><td class="pad" style="padding:16px 28px 8px"><div style="padding:14px 16px;border:1px solid #e8edf3;border-radius:12px;background:#f6f8fb"><div style="font-size:13px;font-weight:800;color:#0f172a">Pickup Information</div><div style="margin-top:6px;font-size:12px;line-height:1.6;color:#475569">${store}<br>${STORE_ADDRESS}<br>${STORE_PHONE} · ${escapeHtml(STORE_EMAIL)}</div></div></td></tr>${button}<tr><td class="pad" style="padding:22px 28px 24px;border-top:1px solid #edf0f4"><div style="font-size:12px;font-weight:800;letter-spacing:.05em;color:#0f172a">${STORE_NAME}</div><div style="margin-top:6px;font-size:12px;color:#64748b">Thank you for choosing us.</div><div style="margin-top:8px;font-size:11px;color:#64748b"><a href="tel:${STORE_PHONE.replace(/[^+\d]/g, '')}" style="color:#64748b;text-decoration:none">${STORE_PHONE}</a> · <a href="mailto:${STORE_EMAIL}" style="color:#64748b;text-decoration:none">${STORE_EMAIL}</a></div></td></tr></table></td></tr></table></body></html>`;

  const text = [
    STORE_NAME,
    STORE_SUBTITLE,
    '',
    `Thank you for your order, ${order.customerName || 'Customer'}!`,
    'Your order has been successfully placed.',
    `Order ID: #${order.orderNumber}`,
    `Order Date: ${orderDate(order.createdAt)}`,
    `Order Status: ${statusLabel(order.status)}`,
    '',
    'CUSTOMER INFORMATION',
    `Name: ${order.customerName || '—'}`,
    `Phone: ${order.customerPhone || '—'}`,
    `Email: ${order.customerEmail}`,
    `Pickup Store: ${order.pickupStore || STORE_NAME}`,
    '',
    'ORDERED PRODUCTS',
    textItems || 'No product details available.',
    '',
    'PAYMENT SUMMARY',
    `Subtotal: ${amount(order.subtotal)}`,
    `Discount: ${amount(order.discount)}`,
    `Total: ${amount(order.total)}`,
    `Payment Status: ${String(order.paymentStatus || 'PENDING').toUpperCase()}`,
    `Payment Method: ${paymentMethodLabel(order.paymentMethod)}`,
    '',
    'PICKUP INFORMATION',
    order.pickupStore || STORE_NAME,
    STORE_ADDRESS,
    STORE_PHONE,
    ...(orderUrl ? ['', `View My Order: ${orderUrl}`] : []),
    '',
    'Thank you for choosing us.',
    `${STORE_NAME} · ${STORE_EMAIL}`,
  ].join('\n');

  return { subject, html, text };
}

export const isValidCustomerEmail = validEmail;
