import { describe, expect, it } from 'vitest';
import { buildOrderConfirmationEmail, isValidCustomerEmail } from '../supabase/functions/send-order-confirmation/email-template';

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
});
