import React from 'react';
import {
  BadgePercent,
  CheckCircle2,
  CreditCard,
  FileText,
  Gavel,
  RefreshCw,
  Scale,
  Scissors,
  ShieldAlert,
  Store,
  UserCheck,
} from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';
import {
  LegalDocumentLayout,
  type LegalClauseSection,
  type LegalCrossLinkItem,
  type LegalHighlightItem,
} from './LegalDocumentLayout';

interface TermsConditionsViewProps {
  onBack: () => void;
  onOpenStoreInfo?: () => void;
  onOpenPrivacy?: () => void;
  onOpenDeleteAccount?: () => void;
}

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({
  onBack,
  onOpenStoreInfo,
  onOpenPrivacy,
  onOpenDeleteAccount,
}) => {
  const highlights: LegalHighlightItem[] = [
    {
      icon: Store,
      title: 'Workshop Pickup & Free Fitment',
      description: 'App orders are prepared for collection at our Berhampore workshop with QR verification.',
    },
    {
      icon: CreditCard,
      title: 'Razorpay or Pay at Workshop',
      description: 'Pay online via Razorpay Checkout or settle directly at the counter on pickup.',
    },
    {
      icon: RefreshCw,
      title: '7-Day Defect Replacement',
      description: 'Standard unused seat covers with stitching flaws qualify for a 7-day replacement.',
    },
  ];

  const sections: LegalClauseSection[] = [
    {
      id: 'acceptance',
      number: '01',
      icon: FileText,
      title: 'Acceptance & Scope of Terms',
      shortTitle: 'Acceptance',
      summary: 'Applies to all Rofik Godi Centre app visitors, riders, and workshop customers.',
      keywords: ['acceptance', 'agreement', 'scope', 'toto', 'riders', 'workshop'],
      details: [
        {
          label: 'Binding Agreement',
          text: `By browsing, creating an account, or placing an order through the Rofik Godi Centre web or mobile app—or visiting our workshop at ${WORKSHOP_INFO.address}—you agree to these Terms & Conditions.`,
        },
        {
          label: 'Who These Terms Cover',
          text: 'These terms govern retail motorcycle and scooter riders, commercial Toto E-Rickshaw operators, and workshop walk-in customers placing orders through this platform.',
        },
        {
          label: 'Discontinuation',
          text: 'If you do not agree with any section of these terms, please refrain from placing orders or using account-based features on the platform.',
        },
      ],
    },
    {
      id: 'custom-tailoring',
      number: '02',
      icon: Scissors,
      title: 'Products, Custom Tailoring & Embroidery Rules',
      shortTitle: 'Custom Tailoring',
      summary: 'Fitment accuracy, custom name embroidery limits, foam upgrades, and hand-craft tolerances.',
      keywords: ['custom', 'embroidery', 'foam', 'stitching', 'fitment', 'vehicle', 'tolerance', 'rexine'],
      details: [
        {
          label: 'Vehicle Fitment Selection',
          text: 'Customers are responsible for confirming the exact motorcycle, scooter, or Toto model and seat layout before ordering. Custom-fitted covers are patterned strictly for the selected vehicle variant.',
        },
        {
          label: 'Personalized Embroidery Guidelines',
          text: 'Custom machine embroidery supports personalized names or text up to 12 characters. Rofik Godi Centre reserves the right to decline offensive, abusive, or trademark-infringing embroidery requests.',
        },
        {
          label: 'Craftsmanship & Shade Tolerances',
          text: 'Because covers are cut and stitched using automotive rexine, high-density foam, and Japanese tensile thread, minor variations in texture, piping sheen, or stitch spacing between batches are natural and not considered defects.',
        },
      ],
    },
    {
      id: 'pricing-coupons',
      number: '03',
      icon: BadgePercent,
      title: 'Pricing, Coupons & Promotional Offers',
      shortTitle: 'Pricing & Coupons',
      summary: 'INR pricing, coupon eligibility criteria, minimum order values, and single-code limits.',
      keywords: ['price', 'inr', 'coupon', 'discount', 'promo', 'offer', 'minimum order', 'expiry'],
      details: [
        {
          label: 'Transparent INR Pricing',
          text: 'All product prices, thickness/foam upgrades, embroidery fees, and coupon savings are displayed clearly in Indian Rupees (₹ INR) at checkout before you confirm an order.',
        },
        {
          label: 'Coupon Eligibility & Single-Code Limit',
          text: 'Only one valid coupon code may be applied per order. Offers may specify minimum order value, maximum discount caps, eligible products or categories, customer eligibility (such as First Order or Existing Customers), expiry dates, and per-customer usage limits.',
        },
        {
          label: 'Right to Cancel Abuse or Errors',
          text: 'We reserve the right to decline or reverse orders placed using expired coupons, automated abuse, or obvious pricing display glitches prior to handover.',
        },
      ],
    },
    {
      id: 'orders-payments',
      number: '04',
      icon: CreditCard,
      title: 'Orders, Razorpay Online Payment & Pay at Workshop',
      shortTitle: 'Orders & Payment',
      summary: 'Supported checkout methods, confirmation tracking, and custom embroidery advance rules.',
      keywords: ['order', 'razorpay', 'upi', 'pay at store', 'pay at workshop', 'advance', 'confirmation'],
      details: [
        {
          label: 'Available Payment Options',
          text: 'Checkout currently offers two real methods: Pay Online via Razorpay Checkout (UPI, debit/credit cards, netbanking, and supported wallets) or Pay at Workshop on Pickup.',
        },
        {
          label: 'Advance on Personalized Orders',
          text: 'For custom machine-embroidered covers or bespoke foam modifications, the workshop may verify confirmation or require a nominal advance before fabric cutting begins.',
        },
        {
          label: 'Order Confirmation & Tracking',
          text: 'Every placed order appears in your My Orders history with live status updates, and an order confirmation email is sent automatically when a valid email address is attached to your account.',
        },
      ],
    },
    {
      id: 'pickup-holds',
      number: '05',
      icon: Store,
      title: 'Workshop Pickup, Verification & Hold Window',
      shortTitle: 'Pickup & Holds',
      summary: 'Store-pickup-only model, QR/code handover, free workshop fitment, and 14-day hold policy.',
      keywords: ['pickup', 'qr', 'token', 'store', 'hold', 'shipping', 'courier', 'fitment', 'hours'],
      details: [
        {
          label: 'Workshop Pickup Only (No Courier Shipping)',
          text: `App orders are prepared exclusively for pickup at ${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address} (${WORKSHOP_INFO.workingHours}). Courier shipping and third-party courier tracking are not offered through this checkout flow.`,
        },
        {
          label: 'Pickup QR & Order Verification',
          text: 'When collecting your order at the workshop counter, present your Order Number and in-app Pickup QR / Pickup Code so our staff can verify ownership and hand over or fit your seat cover.',
        },
        {
          label: 'Free On-Spot Fitment & 14-Day Hold Window',
          text: 'Standard pickup visits include complimentary on-spot workshop seat fitment. Ready pickup orders are held at the workshop for up to 14 days—please call or message us if you need more time before arriving.',
        },
      ],
    },
    {
      id: 'cancellations-returns',
      number: '06',
      icon: RefreshCw,
      title: 'Cancellations, Returns & Refunds',
      shortTitle: 'Returns & Refunds',
      summary: 'When orders can be cancelled, 7-day standard replacement rules, and refund timelines.',
      keywords: ['cancel', 'cancellation', 'return', 'refund', 'replacement', 'defect', '3-5 days'],
      details: [
        {
          label: 'Order Cancellation Rules',
          text: 'Standard uncustomized orders may be cancelled from your order screen before preparation or workshop fitment begins. Custom-embroidered or cut-to-order seats cannot be cancelled once stitching starts.',
        },
        {
          label: '7-Day Defect & Fitment Replacement',
          text: 'Standard, non-personalized seat covers qualify for a 7-day replacement window if you discover a stitching flaw or incorrect vehicle sizing, provided the cover is unused, uninstalled, and clean.',
        },
        {
          label: 'Personalized Items & Refund Processing',
          text: 'Custom name-embroidered items cannot be returned unless there is a verifiable workshop manufacturing defect. Approved refunds for Razorpay online payments are returned to the original payment source within 3–5 working banking days.',
        },
      ],
    },
    {
      id: 'conduct-reviews',
      number: '07',
      icon: UserCheck,
      title: 'Account Conduct, Reviews & Customer Content',
      shortTitle: 'Conduct & Reviews',
      summary: 'Accurate credentials, honest verified reviews, and prohibited misuse.',
      keywords: ['conduct', 'review', 'rating', 'otp', 'fraud', 'scraping', 'abuse'],
      details: [
        {
          label: 'Account & Contact Accuracy',
          text: 'You agree to provide accurate contact details and vehicle information, and to keep your login password and OTP verification codes private.',
        },
        {
          label: 'Verified Product Reviews',
          text: 'Customers with completed orders may submit ratings and reviews. Reviews must be genuine and respectful; we may unpublish spam, offensive language, or unrelated promotional content.',
        },
        {
          label: 'Prohibited Activity',
          text: 'Fake payment claims, repeated uncollected workshop holds without notice, coupon manipulation, abusive conduct toward workshop staff, or automated scraping of catalog data are strictly prohibited and may lead to account suspension.',
        },
      ],
    },
    {
      id: 'intellectual-property',
      number: '08',
      icon: CheckCircle2,
      title: 'Intellectual Property & Brand Assets',
      shortTitle: 'Intellectual Property',
      summary: 'Ownership of Rofik Godi Centre trademarks, tailoring designs, and digital content.',
      keywords: ['intellectual property', 'copyright', 'trademark', 'logo', 'catalog', 'photos'],
      details: [
        {
          label: 'Brand & Catalog Ownership',
          text: 'All Rofik Godi Centre branding, workshop logos, original product photography, custom seat pattern designs, and app software belong to Rofik Godi Centre.',
        },
        {
          label: 'Permitted Personal Use',
          text: 'You may view, bookmark, and share product or policy pages for personal shopping only. Commercial reproduction, catalog mirroring, or unauthorized reuse of our brand marks is prohibited.',
        },
      ],
    },
    {
      id: 'liability',
      number: '09',
      icon: ShieldAlert,
      title: 'Service Availability & Limitation of Liability',
      shortTitle: 'Liability',
      summary: 'Stock availability, product care guidance, and statutory liability cap.',
      keywords: ['liability', 'warranty', 'stock', 'care', 'availability', 'damages'],
      details: [
        {
          label: 'Inventory & App Uptime',
          text: 'While we keep catalog pricing, material stock, and pickup queues updated in real time, occasional raw-material shortages or maintenance windows may affect preparation timing.',
        },
        {
          label: 'Care & Normal Wear',
          text: 'Normal fading from prolonged sun exposure, sharp-object tears, or improper DIY stapling are not covered as manufacturing defects. Contact the workshop for care recommendations.',
        },
        {
          label: 'Maximum Liability Cap',
          text: 'To the fullest extent permitted by law, Rofik Godi Centre’s total liability for any claim relating to an order or product shall not exceed the actual amount paid by you for that specific item.',
        },
      ],
    },
    {
      id: 'changes',
      number: '10',
      icon: Scale,
      title: 'Updates to These Terms',
      shortTitle: 'Updates',
      summary: 'How we communicate legal, operational, or feature updates.',
      keywords: ['update', 'changes', 'revised', 'modified', 'amendment'],
      details: [
        {
          label: 'Periodic Revisions',
          text: 'We may update these Terms & Conditions to reflect new checkout options, workshop services, or regulatory requirements.',
        },
        {
          label: 'Effective Date & Acceptance',
          text: 'Revisions take effect as soon as they are published here with an updated effective date. Continued use of the app after updates constitutes acceptance of the revised terms.',
        },
      ],
    },
    {
      id: 'jurisdiction',
      number: '11',
      icon: Gavel,
      title: 'Governing Law, Disputes & Workshop Contact',
      shortTitle: 'Governing Law',
      summary: 'Direct workshop resolution first, Indian law, and Murshidabad jurisdiction.',
      keywords: ['law', 'india', 'murshidabad', 'berhampore', 'west bengal', 'dispute', 'court'],
      details: [
        {
          label: 'Friendly Workshop Resolution First',
          text: 'If anything goes wrong with your fitment, payment, or pickup, please call or visit our workshop first—almost every issue is resolved quickly at our counter.',
        },
        {
          label: 'Governing Law & Courts',
          text: 'These Terms & Conditions are governed by the laws of India, and any unresolved legal disputes shall be subject to the exclusive jurisdiction of competent courts in Murshidabad, West Bengal.',
        },
        {
          label: 'Official Workshop Details',
          text: `${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address} · Phone: ${WORKSHOP_INFO.phone} / ${WORKSHOP_INFO.phoneAlt} · Email: ${WORKSHOP_INFO.email} · Hours: ${WORKSHOP_INFO.workingHours}.`,
        },
      ],
    },
  ];

  const crossLinks: LegalCrossLinkItem[] = [];
  if (onOpenPrivacy) {
    crossLinks.push({
      label: 'Read Privacy Policy',
      description: 'How we protect your phone, vehicle specs, photos & push alerts',
      onClick: onOpenPrivacy,
    });
  }
  if (onOpenDeleteAccount) {
    crossLinks.push({
      label: 'Manage or Delete Account',
      description: 'Schedule or cancel account deletion with 7-day grace window',
      onClick: onOpenDeleteAccount,
    });
  }

  return (
    <LegalDocumentLayout
      documentTitle="Terms & Conditions"
      documentSubtitle="Workshop rules, orders & pickup terms"
      heroTitle="Clear Rules for Custom Tailoring, Payments & Pickup"
      heroDescription={`Everything you should know before ordering motorcycle, scooter, or Toto seat covers from ${WORKSHOP_INFO.name} in Berhampore, Murshidabad.`}
      lastUpdated="November 2026"
      versionLabel="v2.1"
      highlights={highlights}
      sections={sections}
      searchPlaceholder="Search terms (e.g. embroidery, coupon, Razorpay, refund)..."
      whatsappMessage="Hello Rofik Godi Centre, I have a question regarding Terms & Conditions."
      primaryCtaLabel="Back & Continue"
      acceptanceNote="By placing an order or visiting our workshop, you agree to these Terms & Conditions."
      onBack={onBack}
      onOpenStoreInfo={onOpenStoreInfo}
      crossLinks={crossLinks}
    />
  );
};
