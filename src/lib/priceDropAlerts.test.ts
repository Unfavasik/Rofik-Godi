import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPriceDropNotification,
  evaluateCatalogPriceDrops,
  getSuggestedThresholds,
  isPriceDropTriggered,
  mergePriceDropAlerts,
  validatePriceDropThreshold,
  type PriceDropAlertRecord,
} from './priceDropAlerts';

test('validatePriceDropThreshold rejects empty, non-numeric, non-positive, and >= currentPrice inputs', () => {
  assert.deepEqual(validatePriceDropThreshold('', 899), {
    valid: false,
    error: 'Enter a target price.',
  });
  assert.deepEqual(validatePriceDropThreshold('   ', 899), {
    valid: false,
    error: 'Enter a target price.',
  });
  assert.deepEqual(validatePriceDropThreshold('abc', 899), {
    valid: false,
    error: 'Enter a valid numeric price.',
  });
  assert.deepEqual(validatePriceDropThreshold('0', 899), {
    valid: false,
    error: 'Target price must be greater than ₹0.',
  });
  assert.deepEqual(validatePriceDropThreshold('-50', 899), {
    valid: false,
    error: 'Target price must be greater than ₹0.',
  });
  assert.equal(validatePriceDropThreshold('899', 899).valid, false);
  assert.equal(validatePriceDropThreshold('950', 899).valid, false);
  assert.deepEqual(validatePriceDropThreshold('749', 899), {
    valid: true,
    thresholdPrice: 749,
  });
  assert.deepEqual(validatePriceDropThreshold('₹ 799', 899), {
    valid: true,
    thresholdPrice: 799,
  });
});

test('getSuggestedThresholds computes unique 10%, 20%, and 30% discount targets below current price', () => {
  const suggestions = getSuggestedThresholds(1000);
  assert.deepEqual(suggestions, [
    { label: '-10%', discountPercent: 10, price: 900 },
    { label: '-20%', discountPercent: 20, price: 800 },
    { label: '-30%', discountPercent: 30, price: 700 },
  ]);

  assert.deepEqual(getSuggestedThresholds(1), []);
});

test('isPriceDropTriggered only fires strictly below thresholdPrice when not already triggered', () => {
  assert.equal(
    isPriceDropTriggered({ thresholdPrice: 700, triggeredAt: null }, 700),
    false,
  );
  assert.equal(
    isPriceDropTriggered({ thresholdPrice: 700, triggeredAt: null }, 750),
    false,
  );
  assert.equal(
    isPriceDropTriggered({ thresholdPrice: 700, triggeredAt: null }, 699),
    true,
  );
  assert.equal(
    isPriceDropTriggered({ thresholdPrice: 700, triggeredAt: '2026-11-26T10:00:00Z' }, 500),
    false,
  );
});

test('evaluateCatalogPriceDrops creates notifications for alerts whose product dropped below target and prevents duplicate triggers', () => {
  const alerts: PriceDropAlertRecord[] = [
    {
      id: 'pda-1',
      productId: 'rg-prod-01',
      productTitle: 'Royal Waterproof Bike Seat Cover',
      productImage: '/images/a.webp',
      thresholdPrice: 750,
      initialPrice: 899,
      createdAt: '2026-11-25T10:00:00Z',
      updatedAt: '2026-11-25T10:00:00Z',
      triggeredAt: null,
    },
    {
      id: 'pda-2',
      productId: 'rg-prod-02',
      productTitle: 'Luxury Car Cushion',
      productImage: '/images/b.webp',
      thresholdPrice: 1200,
      initialPrice: 1499,
      createdAt: '2026-11-25T10:00:00Z',
      updatedAt: '2026-11-25T10:00:00Z',
      triggeredAt: null,
    },
  ];

  const catalog = [
    { id: 'rg-prod-01', title: 'Royal Waterproof Bike Seat Cover', price: 699, image: '/images/a.webp' },
    { id: 'rg-prod-02', title: 'Luxury Car Cushion', price: 1200, image: '/images/b.webp' },
  ];

  const firstPass = evaluateCatalogPriceDrops(alerts, catalog, '2026-11-26T12:00:00Z');
  assert.equal(firstPass.triggered.length, 1);
  assert.equal(firstPass.triggered[0].product.id, 'rg-prod-01');
  assert.equal(firstPass.triggered[0].notification.kind, 'price_drop');
  assert.equal(firstPass.triggered[0].notification.action_url, '/shop/products/rg-prod-01');
  assert.match(firstPass.triggered[0].notification.title, /Price Drop Alert/);
  assert.match(firstPass.triggered[0].notification.body, /₹699/);
  assert.match(firstPass.triggered[0].notification.body, /₹750/);
  assert.equal(firstPass.updatedAlerts[0].triggeredAt, '2026-11-26T12:00:00Z');
  assert.equal(firstPass.updatedAlerts[1].triggeredAt, null);

  // Second pass with updated alerts must not re-trigger the already triggered alert
  const secondPass = evaluateCatalogPriceDrops(firstPass.updatedAlerts, catalog, '2026-11-26T12:05:00Z');
  assert.equal(secondPass.triggered.length, 0);
});

test('buildPriceDropNotification formats action_url and rupee amounts properly', () => {
  const notif = buildPriceDropNotification(
    { id: 'rg-prod-03', title: 'Sport Mesh Cover', price: 549, image: '/img.webp' },
    600,
    '2026-11-26T12:00:00Z',
  );
  assert.equal(notif.kind, 'price_drop');
  assert.equal(notif.action_url, '/shop/products/rg-prod-03');
  assert.equal(notif.image_url, '/img.webp');
  assert.equal(notif.read_at, null);
  assert.match(notif.body, /₹549/);
  assert.match(notif.body, /₹600/);
});

test('mergePriceDropAlerts prioritizes server alerts and preserves non-UUID local items', () => {
  const localOnly: PriceDropAlertRecord = {
    id: 'pda-rg-prod-01',
    productId: 'rg-prod-01',
    productTitle: 'Cover A',
    thresholdPrice: 700,
    initialPrice: 899,
    createdAt: '2026-11-26T10:00:00Z',
    updatedAt: '2026-11-26T10:00:00Z',
    triggeredAt: null,
  };
  const serverItem: PriceDropAlertRecord = {
    id: 'uuid-123',
    productId: '11111111-1111-1111-1111-111111111111',
    productTitle: 'Cover B',
    thresholdPrice: 1100,
    initialPrice: 1399,
    createdAt: '2026-11-26T11:00:00Z',
    updatedAt: '2026-11-26T11:00:00Z',
    triggeredAt: null,
  };
  const merged = mergePriceDropAlerts([serverItem], [localOnly]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].productId, serverItem.productId);
  assert.equal(merged[1].productId, localOnly.productId);
});
