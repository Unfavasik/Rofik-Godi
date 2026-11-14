import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InvoiceTemplate, DEFAULT_STORE, amountInWords } from '../src/components/InvoiceTemplate';
import { toCustomerOrderRecord, type AdminOrderRecord } from '../src/lib/supabaseAdminOrders';

const adminOrder: AdminOrderRecord = {
  id: '#RGC-TEST123',
  userId: 'customer-1',
  orderNumber: 'RGC-TEST123',
  customer: 'Test Customer',
  phone: '9876543210',
  initials: 'TC',
  product: 'Bike seat cover',
  amount: 2500,
  subtotal: 3000,
  discount: 500,
  paymentMethod: 'PAY_AT_STORE',
  paymentStatus: 'PENDING',
  status: 'NEW',
  date: '4 Oct 2026, 2:45 pm',
  channel: 'STORE_PICKUP',
  vehicleModel: 'Hero Splendor Plus',
  pickupStore: 'Rofik Godi Centre',
  pickupNote: '',
  pickedUpAt: null,
  completedAt: null,
  statusHistory: [],
  items: [
    {
      product_id: 'product-1',
      product_name: 'Bike seat cover',
      color: 'Black',
      quantity: 2,
      unit_price: 1500,
    },
  ],
  createdAt: '2026-10-04T09:15:00.000Z',
};

describe('InvoiceTemplate', () => {
  it('uses Indian number grouping and handles rupee/paise wording', () => {
    expect(amountInWords(2500)).toBe('Two Thousand Five Hundred Rupees Only');
    expect(amountInWords(1)).toBe('One Rupee Only');
    expect(amountInWords(1001)).toBe('One Thousand One Rupees Only');
    expect(amountInWords(1.5)).toBe('One Rupee and Fifty Paise Only');
  });

  it('maps admin order fields to the shared customer invoice record', () => {
    expect(toCustomerOrderRecord(adminOrder)).toEqual({
      id: 'RGC-TEST123',
      order_number: 'RGC-TEST123',
      order_slug: '',
      customer_name: 'Test Customer',
      customer_phone: '9876543210',
      payment_method: 'PAY_AT_STORE',
      payment_status: 'PENDING',
      status: 'NEW',
      subtotal: 3000,
      discount: 500,
      total: 2500,
      vehicle_model: 'Hero Splendor Plus',
      fulfillment_method: 'STORE_PICKUP',
      pickup_store: 'Rofik Godi Centre',
      created_at: '2026-10-04T09:15:00.000Z',
      order_items: [
        {
          product_id: 'product-1',
          product_name: 'Bike seat cover',
          color: 'Black',
          quantity: 2,
          unit_price: 1500,
        },
      ],
    });
  });

  it('renders the configured shop, pending balance, terms and optional pickup code', () => {
    const html = renderToStaticMarkup(
      <InvoiceTemplate order={toCustomerOrderRecord(adminOrder)} pickupToken="RGCPICKUP123" />,
    );

    expect(DEFAULT_STORE.address).toContain('Berhampore');
    expect(html).toContain('Kadbeltal, Petrol Pump More');
    expect(html).toContain('support@rofikgodi.com');
    expect(html).toContain('PENDING');
    expect(html).toContain('Balance due at store');
    expect(html).toContain('RGCPICKUP123');
    expect(html).toContain('7 days');
    expect(html).toContain('Two Thousand Five Hundred Rupees Only');
  });

  it('does not claim that online orders are payable at the store', () => {
    const onlineOrder = toCustomerOrderRecord({
      ...adminOrder,
      paymentMethod: 'PAY_ONLINE',
    });
    const html = renderToStaticMarkup(<InvoiceTemplate order={onlineOrder} />);

    expect(html).toContain('Pay online');
    expect(html).not.toContain('Balance due at store');
    expect(html).not.toContain('Pickup code');
    expect(html).toContain('Download PDF');
    expect(html).toContain('Print');
  });

  it('renders custom thickness, stitch, and embroidery details on line items', () => {
    const customOrder = toCustomerOrderRecord({
      ...adminOrder,
      items: [
        {
          product_id: 'product-1',
          product_name: 'Custom Bike Seat',
          color: 'Crimson',
          quantity: 1,
          unit_price: 1500,
          selected_thickness: '18mm',
          selected_stitch: 'Diamond',
          custom_embroidery_text: 'ROFIK',
        },
      ],
    });
    const html = renderToStaticMarkup(<InvoiceTemplate order={customOrder} />);

    expect(html).toContain('Colour: Crimson');
    expect(html).toContain('Thickness: 18mm');
    expect(html).toContain('Stitch: Diamond');
    expect(html).toContain('Embroidery: ROFIK');
  });

  it('renders ordered item images and the authorised workshop signature', () => {
    const orderWithImage = toCustomerOrderRecord(adminOrder);
    orderWithImage.order_items[0].image_url = 'https://cdn.example.com/seat-black.jpg';

    const html = renderToStaticMarkup(<InvoiceTemplate order={orderWithImage} />);

    expect(html).toContain('https://cdn.example.com/seat-black.jpg');
    expect(html).toContain('/assets/aistudio/brittany-signature_775bf19a.png');
    expect(html).toContain('Authorised signature');
  });

  it('displays the admin-set guarantee valid-until date and updated normal-use & exclusion terms', () => {
    const html = renderToStaticMarkup(
      <InvoiceTemplate
        order={toCustomerOrderRecord(adminOrder)}
        guaranteePolicy={{
          enabled: true,
          mode: 'fixed_date',
          validUntilDate: '2028-06-30',
          durationMonths: 12,
        }}
      />,
    );

    expect(html).toContain('Replacement Guarantee:');
    expect(html).toContain('30 Jun 2028');
    expect(html).toContain('Terms &amp; Guarantee Policy');
    expect(html).toContain('natural splitting/cracking, seam tearing, or rexine/leatherette surface peeling');
    expect(html).toContain('cat or animal scratches');
    expect(html).toContain('blade or sharp-object cuts');
    expect(html).toContain('fire or burn damage');
    expect(html).toContain('intentional misuse');
  });
});
