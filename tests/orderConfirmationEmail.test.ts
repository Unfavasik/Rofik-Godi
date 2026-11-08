import { describe, expect, it } from 'vitest';
import {
  buildOrderConfirmationEmail,
  buildOrderStatusEmail,
  buildWelcomeEmail,
  isValidCustomerEmail,
} from '../supabase/functions/send-order-confirmation/email-template';

const order = {
  orderNumber: 'RGC-ABC123DEF456',
  createdAt: '2026-10-05T10:00:00.000Z',
  customerName: '<Rider & Co>',
  customerPhone: '+91 98765 43210',
  customerEmail: 'rider@example.com',
  pickupStore: 'ROFIK GODI CENTRE',
  fulfillmentMethod: 'STORE_PICKUP',
  status: 'NEW',
  paymentStatus: 'PENDING',
  paymentMethod: 'PAY_AT_STORE',
  subtotal: 597,
  discount: 50,
  total: 547,
  items: [
    { product_name: 'Seat <Cover>', quantity: 1, unit_price: 299, image_url: 'https://cdn.example.com/seat.jpg' },
    { product_name: 'Grip', quantity: 1, unit_price: 298, image_url: 'http://insecure.example.com/grip.jpg' },
  ],
  orderUrl: 'https://shop.example.com/profile',
};

describe('order confirmation email', () => {
  it('includes canonical order, customer, payment, pickup and product details in both formats', () => {
    const email = buildOrderConfirmationEmail(order);
    expect(email.subject).toBe('Order Confirmed — #RGC-ABC123DEF456 | Rofik Godi Centre');
    expect(email.text).toContain('Order Status: Order Placed');
    expect(email.text).toContain('Subtotal: ₹597');
    expect(email.text).toContain('Discount: ₹50');
    expect(email.text).toContain('Total: ₹547');
    expect(email.text).toContain('Payment Method: Pay at Store');
    expect(email.html).toContain('rider@example.com');
    expect(email.html).toContain('https://cdn.example.com/seat.jpg');
    expect(email.html).not.toContain('http://insecure.example.com/grip.jpg');
    expect(email.html).toContain('https://shop.example.com/profile');
    expect(email.html).toContain('+91 9775333555');
    expect(email.html).toContain('rofikgodicentre.store@gmail.com');
    expect(email.html).toContain('href="mailto:rofikgodicentre.store@gmail.com"');
    expect(email.html).toContain('color:#1a73e8;text-decoration:underline');
    expect(email.html).toContain('href="https://maps.app.goo.gl/hRVfWHTkQ6vkrcS7A"');
    expect(email.text).toContain('Google Maps: https://maps.app.goo.gl/hRVfWHTkQ6vkrcS7A');
  });

  it('escapes customer and product text and rejects unsafe CTA URLs', () => {
    const email = buildOrderConfirmationEmail({ ...order, orderUrl: 'javascript:alert(1)' });
    expect(email.html).toContain('&lt;Rider &amp; Co&gt;');
    expect(email.html).toContain('Seat &lt;Cover&gt;');
    expect(email.html).not.toContain('javascript:alert(1)');
    expect(email.html).not.toContain('View My Order</a>');
  });

  it('validates actual customer email addresses without accepting blanks or malformed strings', () => {
    expect(isValidCustomerEmail('rider@example.com')).toBe(true);
    expect(isValidCustomerEmail('')).toBe(false);
    expect(isValidCustomerEmail('not-an-email')).toBe(false);
    expect(isValidCustomerEmail('customer @example.com')).toBe(false);
  });

  it('sends only a completion status email and never includes a QR attachment', () => {
    const email = buildOrderStatusEmail({
      orderNumber: 'RGC-ABC123DEF456',
      customerName: 'Rider',
      pickupStore: 'ROFIK GODI CENTRE',
      event: 'COMPLETED',
      items: [
        { product_name: 'Touring Seat Cover', quantity: 2, unit_price: 299, image_url: 'https://cdn.example.com/seat-cover.jpg' },
        { product_name: 'Grip', quantity: 1, unit_price: 99 },
      ],
      subtotal: 697,
      discount: 50,
      total: 647,
      paymentStatus: 'PAID',
      paymentMethod: 'PAY_ONLINE',
    });

    expect(email.subject.toLowerCase()).toContain('completed');
    expect(email.text).toContain('this order is now complete');
    expect(email.html).toContain('Ordered Products');
    expect(email.html).toContain('Touring Seat Cover');
    expect(email.html).toContain('https://cdn.example.com/seat-cover.jpg');
    expect(email.html).toContain('Qty: 2 · ₹299 each');
    expect(email.html).toContain('₹598');
    expect(email.html).toContain('Payment Summary');
    expect(email.html).toContain('₹647');
    expect(email.text).toContain('• Touring Seat Cover — Qty: 2 × ₹299 = ₹598');
    expect(email.text).toContain('Total: ₹647');
    expect(email.html).not.toContain('src="cid:');
    expect(email.html).toContain('Open store location in Google Maps');
    expect(email.html).toContain('href="mailto:rofikgodicentre.store@gmail.com"');
    expect(email.text).not.toContain('pickup QR is attached');
  });

  it('builds a Rofik-red welcome email with safe promo copy, photos and escaped customer text', () => {
    const email = buildWelcomeEmail('<Rider>', 'https://shop.example.com/home', {
      code: 'WELCOME10',
      discountPercent: 10,
    });

    expect(email.subject).toContain('<Rider>');
    expect(email.html).toContain('Welcome to Rofik Godi Centre, &lt;Rider&gt;.');
    expect(email.html).toContain('A smoother way to shop');
    expect(email.html).toContain('https://shop.example.com/home');
    expect(email.html).toContain('/images/welcome-email/hero-seat-lineup.jpg');
    expect(email.html).toContain('/images/welcome-email/premium-bike-seat-cover.jpg');
    expect(email.html).toContain('WELCOME10');
    expect(email.html).toContain('10% OFF');
    expect(email.html).toContain('#d9232d');
    expect(email.html).not.toContain('128+ REVIEWS');
    expect(email.html).not.toContain('128 reviews');
    expect(email.html).toContain('rofikgodicentre.store@gmail.com');
    expect(email.html).toContain('href="mailto:rofikgodicentre.store@gmail.com"');
    expect(email.text).toContain('Thanks for creating an account.');
    expect(email.text).toContain('Use coupon code WELCOME10 at checkout for 10% off');
  });

  it('omits the welcome offer when no active coupon is provided', () => {
    const email = buildWelcomeEmail('Rider');

    expect(email.html).not.toContain('WELCOME10');
    expect(email.text).not.toContain('WELCOME10');
    expect(email.html).toContain('Seat covers, cushions');
  });
});
