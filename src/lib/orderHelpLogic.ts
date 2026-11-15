import type { CustomerOrderRecord } from '../types';
import type { SupportRequestCategory, SupportRequestRecord } from './supabaseSupport';
import { getOrderStatusLabel, isOrderComplete } from './orderPresentation';

export type OrderHelpTopicId =
  | 'order_status'
  | 'payment_issue'
  | 'change_order'
  | 'pickup_store'
  | 'return_exchange'
  | 'other_help';

export interface OrderHelpTopicMeta {
  id: OrderHelpTopicId;
  title: string;
  hint: string;
  supportCategory: SupportRequestCategory;
  accent: 'rose' | 'blue' | 'amber' | 'emerald' | 'violet' | 'sky';
}

export const ORDER_HELP_TOPICS: OrderHelpTopicMeta[] = [
  {
    id: 'order_status',
    title: 'Order Status',
    hint: 'Check preparation progress or readiness',
    supportCategory: 'Order issue',
    accent: 'rose',
  },
  {
    id: 'payment_issue',
    title: 'Payment Issue',
    hint: 'Failed payment, refund or UPI issue',
    supportCategory: 'Payment',
    accent: 'amber',
  },
  {
    id: 'change_order',
    title: 'Change Order',
    hint: 'Modify colour, foam or cancel before pickup',
    supportCategory: 'Order issue',
    accent: 'violet',
  },
  {
    id: 'pickup_store',
    title: 'Pickup & Store',
    hint: 'Pickup time, free fitment or store location',
    supportCategory: 'Pickup / installation',
    accent: 'emerald',
  },
  {
    id: 'return_exchange',
    title: 'Return / Exchange',
    hint: '7-day defect check or guarantee replacement',
    supportCategory: 'Product question',
    accent: 'blue',
  },
  {
    id: 'other_help',
    title: 'Other Help',
    hint: 'Anything else? Ask our workshop desk',
    supportCategory: 'Other',
    accent: 'sky',
  },
];

export interface OrderHelpStatusGuidance {
  badgeLabel: string;
  headline: string;
  description: string;
  tone: 'emerald' | 'blue' | 'amber' | 'rose';
  canModifyOrder: boolean;
  isPaid: boolean;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
}

export function getOrderHelpStatusGuidance(order: CustomerOrderRecord): OrderHelpStatusGuidance {
  const rawStatus = (order.status || 'NEW').toUpperCase();
  const rawPaymentStatus = (order.payment_status || 'PENDING').toUpperCase();
  const rawPaymentMethod = (order.payment_method || 'PAY_AT_STORE').toUpperCase();

  const isPaid = rawPaymentStatus === 'PAID';
  const isPayOnline = rawPaymentMethod === 'PAY_ONLINE' || rawPaymentMethod === 'ONLINE';
  const paymentMethodLabel = isPayOnline ? 'Online Payment (Razorpay / UPI)' : 'Pay at Workshop Counter';
  const paymentStatusLabel = isPaid
    ? 'Paid & Confirmed'
    : rawStatus === 'CANCELLED'
      ? 'Cancelled (Unpaid)'
      : isPayOnline
        ? 'Payment Pending Verification'
        : `Due at Store Pickup (₹${Number(order.total || 0).toLocaleString('en-IN')})`;

  const badgeLabel = getOrderStatusLabel(rawStatus);

  if (rawStatus === 'CANCELLED') {
    return {
      badgeLabel,
      headline: 'This order has been cancelled',
      description: isPaid
        ? 'If your online payment was debited, approved refunds are credited back to the original payment method within 3–5 working banking days.'
        : 'No payment is due for this cancelled order. You can place a new order anytime or message us below if you need assistance.',
      tone: 'rose',
      canModifyOrder: false,
      isPaid,
      paymentMethodLabel,
      paymentStatusLabel,
    };
  }

  if (isOrderComplete(rawStatus)) {
    return {
      badgeLabel,
      headline: 'Picked up & completed at workshop',
      description:
        'Your order is complete. Standard unused items have a 7-day stitching/fitment check, and products with an active guarantee date are covered for normal-use cracking, seam tearing, or rexine peeling.',
      tone: 'emerald',
      canModifyOrder: false,
      isPaid,
      paymentMethodLabel,
      paymentStatusLabel,
    };
  }

  if (rawStatus === 'READY_FOR_PICKUP') {
    return {
      badgeLabel,
      headline: 'Ready for pickup & free workshop fitment',
      description:
        'Visit Rofik Godi Centre (Kadbeltal, Petrol Pump More, Berhampore) with your Order ID or Pickup QR code for complimentary on-spot seat installation.',
      tone: 'blue',
      canModifyOrder: false,
      isPaid,
      paymentMethodLabel,
      paymentStatusLabel,
    };
  }

  return {
    badgeLabel,
    headline: 'Being prepared at Rofik Godi Centre',
    description:
      'Our craftsmen are preparing your seat cover. You can still request colour, foam thickness, stitch pattern, or pickup timing updates before pickup readiness.',
    tone: 'amber',
    canModifyOrder: true,
    isPaid,
    paymentMethodLabel,
    paymentStatusLabel,
  };
}

export interface OrderHelpStep {
  key: 'placed' | 'preparing' | 'ready' | 'completed';
  label: string;
  state: 'done' | 'current' | 'upcoming' | 'cancelled';
}

export function getOrderStepProgress(status: string): OrderHelpStep[] {
  const raw = (status || 'NEW').toUpperCase();
  if (raw === 'CANCELLED') {
    return [
      { key: 'placed', label: 'Order Placed', state: 'done' },
      { key: 'preparing', label: 'Cancelled', state: 'cancelled' },
      { key: 'ready', label: 'Ready at Store', state: 'upcoming' },
      { key: 'completed', label: 'Picked Up', state: 'upcoming' },
    ];
  }
  if (isOrderComplete(raw)) {
    return [
      { key: 'placed', label: 'Order Placed', state: 'done' },
      { key: 'preparing', label: 'Crafting', state: 'done' },
      { key: 'ready', label: 'Ready at Store', state: 'done' },
      { key: 'completed', label: 'Picked Up', state: 'done' },
    ];
  }
  if (raw === 'READY_FOR_PICKUP') {
    return [
      { key: 'placed', label: 'Order Placed', state: 'done' },
      { key: 'preparing', label: 'Crafting', state: 'done' },
      { key: 'ready', label: 'Ready at Store', state: 'current' },
      { key: 'completed', label: 'Picked Up', state: 'upcoming' },
    ];
  }
  return [
    { key: 'placed', label: 'Order Placed', state: 'done' },
    { key: 'preparing', label: 'Crafting', state: 'current' },
    { key: 'ready', label: 'Ready at Store', state: 'upcoming' },
    { key: 'completed', label: 'Picked Up', state: 'upcoming' },
  ];
}

export interface TopicResolutionGuide {
  topic: OrderHelpTopicMeta;
  heading: string;
  summary: string;
  bullets: string[];
  quickPrompts: string[];
  defaultSubject: string;
}

export function getTopicResolutionGuide(
  topicId: OrderHelpTopicId,
  order: CustomerOrderRecord,
): TopicResolutionGuide {
  const topic =
    ORDER_HELP_TOPICS.find((item) => item.id === topicId) ?? ORDER_HELP_TOPICS[0]!;
  const orderNum = order.order_number || order.id;
  const firstItemName = order.order_items?.[0]?.product_name || 'seat cover';
  const vehicleLabel = order.vehicle_model ? ` (${order.vehicle_model})` : '';
  const guidance = getOrderHelpStatusGuidance(order);

  switch (topicId) {
    case 'order_status':
      return {
        topic,
        heading: `Status & Preparation for #${orderNum}`,
        summary: guidance.description,
        bullets: [
          `Current status: ${guidance.badgeLabel}`,
          `Fulfillment: Store Pickup at ${order.pickup_store || 'Rofik Godi Centre, Berhampore'}`,
          order.vehicle_model
            ? `Configured vehicle model: ${order.vehicle_model}`
            : 'Bring your bike, scooter, or toto for complimentary workshop fitment.',
        ],
        quickPrompts: [
          `When will my order #${orderNum} (${firstItemName}${vehicleLabel}) be ready for workshop pickup?`,
          `Please share a preparation update on order #${orderNum}.`,
          `Is my order #${orderNum} ready for on-spot installation today?`,
        ],
        defaultSubject: `Order Status Inquiry · #${orderNum}`,
      };

    case 'payment_issue':
      return {
        topic,
        heading: `Payment & Billing Help for #${orderNum}`,
        summary:
          'We verify all Razorpay/UPI transactions and counter payments against your order ledger.',
        bullets: [
          `Payment method: ${guidance.paymentMethodLabel}`,
          `Current payment status: ${guidance.paymentStatusLabel}`,
          'Approved refunds for cancelled or duplicate online payments are processed to your original payment method within 3–5 working banking days.',
        ],
        quickPrompts: [
          `My UPI / online payment of ₹${Number(order.total || 0).toLocaleString('en-IN')} for order #${orderNum} was debited, please confirm status.`,
          `I would like to check the refund status for order #${orderNum}.`,
          `Please help me with the invoice or payment receipt for order #${orderNum}.`,
        ],
        defaultSubject: `Payment / Billing Help · #${orderNum}`,
      };

    case 'change_order':
      return {
        topic,
        heading: guidance.canModifyOrder
          ? `Modify or Cancel Order #${orderNum}`
          : `Order Modification Rules for #${orderNum}`,
        summary: guidance.canModifyOrder
          ? 'Because your order has not been picked up yet, our workshop team can help update colour, foam cushioning, vehicle model, or cancellation.'
          : 'This order is already completed, ready, or cancelled. Message us below if you need special post-order assistance.',
        bullets: [
          'Colour finish, foam thickness, or stitch pattern changes can be requested before final cutting.',
          'All orders are for in-person workshop pickup only (no online/courier delivery), and we do not write custom names or text on seat covers.',
          'Need to update your vehicle model? Mention the exact bike/scooter model below.',
        ],
        quickPrompts: [
          `I want to change the colour or foam thickness on order #${orderNum} before pickup.`,
          `Please update the compatible vehicle model for order #${orderNum} to: `,
          `Please cancel order #${orderNum} as my plans have changed.`,
        ],
        defaultSubject: `Change / Modify Request · #${orderNum}`,
      };

    case 'pickup_store':
      return {
        topic,
        heading: `Workshop Pickup & Free Installation · #${orderNum}`,
        summary:
          'Every seat cover order includes complimentary on-spot fitting by our technicians at our Berhampore workshop.',
        bullets: [
          'Location: Kadbeltal, Petrol Pump More, Berhampore, Murshidabad, WB 742101',
          'Working Hours: Mon – Sun, 9:00 AM – 8:00 PM',
          'Show your Order ID or Pickup QR code at the counter when you arrive.',
        ],
        quickPrompts: [
          `I plan to visit the workshop today to pick up and install order #${orderNum}.`,
          `Can I reschedule my pickup date for order #${orderNum} to this weekend?`,
          `Can a family member or friend collect order #${orderNum} using my pickup code?`,
        ],
        defaultSubject: `Pickup & Fitment Scheduling · #${orderNum}`,
      };

    case 'return_exchange':
      return {
        topic,
        heading: `Replacement & Guarantee Policy · #${orderNum}`,
        summary:
          'We stand behind our workshop stitching and material quality with transparent replacement rules.',
        bullets: [
          '7-Day Defect Check: Standard unused, uninstalled items with original tags may be replaced within 7 days for stitching defects or incorrect fitment.',
          'Workshop Guarantee (Normal Use): Products with an active admin guarantee date are replaced if natural material cracking/splitting, seam tearing, or rexine surface peeling occurs before expiry.',
          'Guarantee Void (Not Covered): Cat or animal claw scratches, blade (bilet) or sharp-object cuts, fire/cigarette/exhaust burns, and intentional or accidental self-inflicted damage are strictly excluded.',
        ],
        quickPrompts: [
          `I noticed a stitching or fitment defect on ${firstItemName} from order #${orderNum} and would like a replacement check.`,
          `My seat cover from order #${orderNum} developed seam tearing / rexine peeling under normal use; requesting a guarantee inspection.`,
          `I received the wrong size/fitment for ${order.vehicle_model || 'my vehicle'} on order #${orderNum}.`,
        ],
        defaultSubject: `Replacement / Guarantee Claim · #${orderNum}`,
      };

    case 'other_help':
    default:
      return {
        topic,
        heading: `Direct Workshop Assistance · #${orderNum}`,
        summary:
          'Describe your question or attach a photo of your bike seat, and our workshop team will reply directly in your support thread.',
        bullets: [
          `Linked automatically to Order #${orderNum} (${firstItemName})`,
          'You can attach up to 3 photos or PDF receipts (up to 5 MB each).',
          'Track replies anytime under Account → Support Requests.',
        ],
        quickPrompts: [
          `Please call me back regarding my order #${orderNum}.`,
          `I have a custom seat cushioning question regarding order #${orderNum}.`,
        ],
        defaultSubject: `Support Request · #${orderNum}`,
      };
  }
}

export function buildOrderHelpWhatsappUrl(
  whatsappNumber: string,
  order: CustomerOrderRecord,
  topicId?: OrderHelpTopicId | null,
  draftMessage?: string,
): string {
  const digits = whatsappNumber.replace(/\D/g, '');
  const topic = topicId ? ORDER_HELP_TOPICS.find((t) => t.id === topicId) : null;
  const itemSummary = (order.order_items || [])
    .map((item) => `${item.product_name}${item.color ? ` (${item.color})` : ''} x${item.quantity}`)
    .join(', ');

  const lines = [
    `Hello Rofik Godi Centre, I need help with my order *#${order.order_number}*.`,
    topic ? `Topic: *${topic.title}*` : null,
    itemSummary ? `Items: ${itemSummary}` : null,
    order.vehicle_model ? `Vehicle: ${order.vehicle_model}` : null,
    draftMessage?.trim() ? `Message: ${draftMessage.trim()}` : null,
  ].filter(Boolean);

  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function filterOrderSupportRequests(
  requests: SupportRequestRecord[],
  order: Pick<CustomerOrderRecord, 'id' | 'order_number'>,
): SupportRequestRecord[] {
  const targetId = (order.id || '').trim().toLowerCase();
  const targetNumber = (order.order_number || '').trim().toLowerCase();

  return requests.filter((req) => {
    if (targetId && req.related_order_id?.trim().toLowerCase() === targetId) {
      return true;
    }
    if (targetNumber && req.order_number?.trim().toLowerCase() === targetNumber) {
      return true;
    }
    if (targetNumber && req.subject?.toLowerCase().includes(`#${targetNumber}`)) {
      return true;
    }
    return false;
  });
}
