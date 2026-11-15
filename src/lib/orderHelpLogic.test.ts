import test from 'node:test';
import assert from 'node:assert/strict';
import type { CustomerOrderRecord } from '../types';
import type { SupportRequestRecord } from './supabaseSupport';
import {
  ORDER_HELP_TOPICS,
  buildOrderHelpWhatsappUrl,
  filterOrderSupportRequests,
  getOrderHelpStatusGuidance,
  getTopicResolutionGuide,
} from './orderHelpLogic';

const sampleOrder: CustomerOrderRecord = {
  id: 'ord-uuid-101',
  order_number: 'RGC-778899',
  order_slug: 'abcdefabcdefabcdefabcdefabcdef01',
  customer_name: 'Ayatul Sekh',
  customer_phone: '9876543210',
  payment_method: 'PAY_AT_STORE',
  payment_status: 'PENDING',
  status: 'NEW',
  subtotal: 1200,
  discount: 200,
  total: 1000,
  vehicle_model: 'Honda Activa 6G',
  fulfillment_method: 'STORE_PICKUP',
  pickup_store: 'Rofik Godi Centre',
  created_at: '2026-11-14T10:00:00Z',
  order_items: [
    {
      product_id: 'rg-prod-01',
      product_name: 'Racing Edge Seat Cover',
      color: 'Crimson Red',
      quantity: 1,
      unit_price: 1000,
    },
  ],
};

test('getOrderHelpStatusGuidance reflects order lifecycle and payment status accurately', () => {
  const newOrderGuidance = getOrderHelpStatusGuidance(sampleOrder);
  assert.equal(newOrderGuidance.canModifyOrder, true);
  assert.equal(newOrderGuidance.tone, 'amber');
  assert.match(newOrderGuidance.paymentStatusLabel, /Due at Store Pickup/);

  const readyGuidance = getOrderHelpStatusGuidance({
    ...sampleOrder,
    status: 'READY_FOR_PICKUP',
    payment_method: 'PAY_ONLINE',
    payment_status: 'PAID',
  });
  assert.equal(readyGuidance.canModifyOrder, false);
  assert.equal(readyGuidance.tone, 'blue');
  assert.equal(readyGuidance.isPaid, true);

  const cancelledPaidGuidance = getOrderHelpStatusGuidance({
    ...sampleOrder,
    status: 'CANCELLED',
    payment_method: 'PAY_ONLINE',
    payment_status: 'PAID',
  });
  assert.equal(cancelledPaidGuidance.tone, 'rose');
  assert.match(cancelledPaidGuidance.description, /3–5 working banking days/);
});

test('getTopicResolutionGuide returns contextual prompts and guarantee exclusions', () => {
  assert.equal(ORDER_HELP_TOPICS.length, 6);

  const statusGuide = getTopicResolutionGuide('order_status', sampleOrder);
  assert.equal(statusGuide.topic.supportCategory, 'Order issue');
  assert.match(statusGuide.defaultSubject, /#RGC-778899/);
  assert.ok(statusGuide.quickPrompts.some((p) => p.includes('Honda Activa 6G')));

  const returnGuide = getTopicResolutionGuide('return_exchange', sampleOrder);
  assert.equal(returnGuide.topic.supportCategory, 'Product question');
  assert.ok(returnGuide.bullets.some((b) => b.includes('7-Day Defect Check')));
  assert.ok(returnGuide.bullets.some((b) => b.includes('blade (bilet)')));
  assert.ok(returnGuide.bullets.some((b) => b.includes('rexine surface peeling')));
});

test('buildOrderHelpWhatsappUrl embeds order number, topic, vehicle, and custom message', () => {
  const url = buildOrderHelpWhatsappUrl(
    '+91 97326 46907',
    sampleOrder,
    'pickup_store',
    'I will visit at 5 PM today.',
  );
  assert.match(url, /^https:\/\/wa\.me\/919732646907\?text=/);
  const decoded = decodeURIComponent(url.split('?text=')[1] || '');
  assert.match(decoded, /#RGC-778899/);
  assert.match(decoded, /Pickup & Store/);
  assert.match(decoded, /Honda Activa 6G/);
  assert.match(decoded, /I will visit at 5 PM today\./);
});

test('filterOrderSupportRequests matches by related_order_id, order_number, or subject tag', () => {
  const requests: SupportRequestRecord[] = [
    {
      id: 'req-1',
      user_id: 'u-1',
      category: 'Order issue',
      subject: 'Update needed',
      message: 'When ready?',
      status: 'open',
      created_at: '2026-11-14T11:00:00Z',
      updated_at: '2026-11-14T11:00:00Z',
      last_message_at: '2026-11-14T11:00:00Z',
      related_order_id: 'ord-uuid-101',
      order_number: null,
      attachment_count: 0,
    },
    {
      id: 'req-2',
      user_id: 'u-1',
      category: 'Payment',
      subject: 'Payment / Billing Help · #RGC-778899',
      message: 'Receipt check',
      status: 'in_progress',
      created_at: '2026-11-14T12:00:00Z',
      updated_at: '2026-11-14T12:00:00Z',
      last_message_at: '2026-11-14T12:00:00Z',
      related_order_id: null,
      order_number: null,
      attachment_count: 0,
    },
    {
      id: 'req-other',
      user_id: 'u-1',
      category: 'Other',
      subject: 'Different order #RGC-000111',
      message: 'Unrelated',
      status: 'resolved',
      created_at: '2026-11-14T09:00:00Z',
      updated_at: '2026-11-14T09:00:00Z',
      last_message_at: '2026-11-14T09:00:00Z',
      related_order_id: 'ord-other',
      order_number: 'RGC-000111',
      attachment_count: 0,
    },
  ];

  const matched = filterOrderSupportRequests(requests, sampleOrder);
  assert.deepEqual(
    matched.map((r) => r.id),
    ['req-1', 'req-2'],
  );
});
