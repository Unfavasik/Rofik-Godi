import React from 'react';
import {
  Bell,
  Clock3,
  Database,
  Eye,
  Image,
  Lock,
  Phone,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';
import {
  LegalDocumentLayout,
  type LegalClauseSection,
  type LegalCrossLinkItem,
  type LegalHighlightItem,
} from './LegalDocumentLayout';

interface PrivacyPolicyViewProps {
  onBack: () => void;
  onOpenStoreInfo?: () => void;
  onOpenTerms?: () => void;
  onOpenDeleteAccount?: () => void;
  onOpenPersonalData?: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({
  onBack,
  onOpenStoreInfo,
  onOpenTerms,
  onOpenDeleteAccount,
  onOpenPersonalData,
}) => {
  const highlights: LegalHighlightItem[] = [
    {
      icon: Lock,
      title: 'Zero PIN or OTP Storage',
      description: 'We never ask for or store your UPI MPIN, card CVV, bank password, or OTP.',
    },
    {
      icon: ShieldCheck,
      title: 'No Telemarketing or Resale',
      description: 'Your phone number, vehicle info, and order history are never sold or rented.',
    },
    {
      icon: Trash2,
      title: '7-Day Deletion Grace Period',
      description: 'Schedule account deletion in Settings anytime with a 7-day window to cancel.',
    },
  ];

  const sections: LegalClauseSection[] = [
    {
      id: 'collection',
      number: '01',
      icon: Database,
      title: 'Information We Collect',
      shortTitle: 'Collection',
      summary: 'Account details, saved vehicle fitment garage, custom embroidery notes, and order records.',
      keywords: ['name', 'phone', 'email', 'vehicle', 'bike', 'scooter', 'toto', 'embroidery', 'measurements'],
      details: [
        {
          label: 'Account & Contact Identity',
          text: 'Your full name, phone number, optional email address, and workshop pickup notes submitted during registration, checkout, or profile editing.',
        },
        {
          label: 'Saved Vehicle & Custom Fitment Garage',
          text: 'Your motorcycle, scooter, or Toto E-Rickshaw type, brand, and model (saved in My Fitment Garage), along with chosen foam density, stitch pattern, color variant, and custom embroidery lettering (up to 12 characters).',
        },
        {
          label: 'Orders & Payment References',
          text: 'Ordered items, discount coupon codes used, pickup token/QR identifiers, payment method (Razorpay Online or Pay at Workshop), and payment status or transaction reference IDs.',
        },
      ],
    },
    {
      id: 'media',
      number: '02',
      icon: Image,
      title: 'Profile Photos & Support Media Uploads',
      shortTitle: 'Media Uploads',
      summary: 'Images or documents you explicitly upload for your profile avatar or support tickets.',
      keywords: ['avatar', 'photo', 'camera', 'gallery', 'upload', 'attachment', 'storage'],
      details: [
        {
          label: 'Avatar Uploads',
          text: 'If you upload a profile picture from your Account screen, the image is converted and stored in our avatar storage bucket so it appears across your sessions.',
        },
        {
          label: 'Customer Support Attachments',
          text: 'Photos or documents attached to help or warranty tickets are stored in a private support-attachments bucket and viewed by workshop staff only through temporary signed URLs.',
        },
        {
          label: 'Explicit User Selection Only',
          text: 'The app never accesses your camera or photo library in the background; media is read only when you explicitly pick a file to upload.',
        },
      ],
    },
    {
      id: 'notifications',
      number: '03',
      icon: Bell,
      title: 'Device Storage, Cache & Push Notifications',
      shortTitle: 'Push & Cache',
      summary: 'Local browser preferences, cart/wishlist state, and Firebase push alert controls.',
      keywords: ['fcm', 'firebase', 'push', 'notification', 'cache', 'localstorage', 'cookie', 'language', 'haptic'],
      details: [
        {
          label: 'Local Browser & Device Storage',
          text: 'We use local device storage to preserve your shopping bag, guest cart, wishlist, cached catalog products, 7-day notification cache, selected language (English, Bengali, or Hindi), and haptic feedback preference.',
        },
        {
          label: 'Push Notification Tokens & Delivery',
          text: 'When you grant notification permission, a Firebase Cloud Messaging (FCM) device token is registered so we can deliver real-time order pickup updates, support replies, and offer alerts.',
        },
        {
          label: 'Granular Notification Controls',
          text: 'Your Notification Settings preferences (Offers, Order Updates, Workshop Alerts, and System Updates) are synced to your account metadata so disabled categories are filtered out automatically.',
        },
      ],
    },
    {
      id: 'usage',
      number: '04',
      icon: Eye,
      title: 'How We Use Your Information',
      shortTitle: 'Data Usage',
      summary: 'Tailoring preparation, store pickup verification, confirmations, and customer care.',
      keywords: ['tailoring', 'pickup', 'qr', 'email', 'confirmation', 'review', 'support'],
      details: [
        {
          label: 'Workshop Tailoring & Pickup Queue',
          text: 'Vehicle models, foam thickness choices, stitch styles, and embroidery text guide our craftsmen when preparing or fitting your seat cover at the Berhampore workshop.',
        },
        {
          label: 'Order Confirmations & Pickup Verification',
          text: 'Order details power your My Orders tracker, downloadable invoice PDFs, confirmation emails (when an email is linked), and counter pickup QR verification.',
        },
        {
          label: 'Verified Reviews & Support Tickets',
          text: 'Completed order status confirms verified-purchase eligibility when you submit a product rating or review, and links support requests directly to the right order.',
        },
      ],
    },
    {
      id: 'security',
      number: '05',
      icon: Lock,
      title: 'Payment & Security Safeguards',
      shortTitle: 'Security',
      summary: 'Encrypted sessions, hashed authentication, and strict separation from banking secrets.',
      keywords: ['razorpay', 'upi', 'mpin', 'cvv', 'otp', 'password', 'encryption', 'pay at workshop'],
      details: [
        {
          label: 'Razorpay Online & Workshop Payments',
          text: 'Online payments are handled securely through Razorpay Checkout (supporting UPI, cards, netbanking, and wallets) or you may choose Pay at Workshop on pickup.',
        },
        {
          label: 'No Banking Credential Storage',
          text: 'Rofik Godi Centre never requests, sees, or stores your UPI MPIN, card CVV, ATM PIN, netbanking password, or bank OTP. Never share these credentials with anyone.',
        },
        {
          label: 'Account & Transport Security',
          text: 'All traffic runs over HTTPS/TLS encryption, and account passwords are cryptographically hashed by our authentication provider—never stored in readable form.',
        },
      ],
    },
    {
      id: 'sharing',
      number: '06',
      icon: ShieldCheck,
      title: 'Service Providers & Zero-Sale Guarantee',
      shortTitle: 'Sharing',
      summary: 'Essential cloud infrastructure partners only—never sold to advertisers or brokers.',
      keywords: ['supabase', 'razorpay', 'firebase', 'third party', 'spam', 'telemarketing', 'law'],
      details: [
        {
          label: 'Infrastructure Partners',
          text: 'We rely on trusted service providers strictly to operate app features: Supabase (authentication, database, private storage), Razorpay (online payment processing), Firebase (push alerts), and transactional email delivery.',
        },
        {
          label: 'Zero Telemarketing or Data Resale',
          text: 'We never sell, rent, or trade your phone number, address, or riding details to ad networks, insurance dialers, or marketing brokers.',
        },
        {
          label: 'Legal & Regulatory Disclosures',
          text: 'Information is disclosed only if strictly required under applicable Indian law, court order, or valid government authority request.',
        },
      ],
    },
    {
      id: 'retention',
      number: '07',
      icon: Clock3,
      title: 'Data Retention & Expiry Periods',
      shortTitle: 'Retention',
      summary: 'Clear retention timelines for active profiles, short-lived alerts, and billing records.',
      keywords: ['retention', 'expiry', '7 days', 'anonymized', 'billing', 'records'],
      details: [
        {
          label: 'Active Account Lifecycle',
          text: 'Your profile details, saved vehicle model, and wishlist remain available while your account is active so you do not have to re-enter your bike details on every visit.',
        },
        {
          label: '7-Day In-App Notification Window',
          text: 'Customer inbox notifications and local notification caches expire automatically after 7 days to keep your inbox lightweight and relevant.',
        },
        {
          label: 'Order & Tax Record Keeping',
          text: 'Completed order invoices and payment statuses are retained as required for workshop warranty checks and Indian accounting rules. When an account is permanently deleted, past orders are retained only as anonymized transaction records.',
        },
      ],
    },
    {
      id: 'rights',
      number: '08',
      icon: UserCheck,
      title: 'Your Rights & 7-Day Account Deletion',
      shortTitle: 'Rights & Deletion',
      summary: 'Edit your details anytime, adjust notifications, or delete your account self-serve.',
      keywords: ['rights', 'delete', 'deletion', 'erase', 'grace period', 'opt out', 'settings'],
      details: [
        {
          label: 'Review & Correct Personal Details',
          text: 'Inspect or update your display name, mobile number, avatar, and My Fitment Garage vehicle selection anytime from your Account screen.',
        },
        {
          label: 'Self-Serve Account Deletion (7-Day Grace Period)',
          text: 'In Settings → Delete Account, signed-in customers can schedule permanent account removal. A 7-day grace period lets you cancel the request anytime before profile info, wishlist, notifications, and support threads are purged.',
        },
        {
          label: 'Communication Opt-Out',
          text: 'Turn off promotional or alert categories in Notification Settings, or reply "STOP" to WhatsApp promotional broadcasts anytime.',
        },
      ],
    },
    {
      id: 'grievance',
      number: '09',
      icon: Phone,
      title: 'Age Eligibility, Updates & Grievance Contact',
      shortTitle: 'Grievance Contact',
      summary: 'Minimum age guidance, policy updates, and direct workshop grievance escalation.',
      keywords: ['children', 'minor', 'age', 'grievance', 'officer', 'contact', 'berhampore', 'murshidabad'],
      details: [
        {
          label: 'Age & Guardian Eligibility',
          text: 'Our ordering and account features are intended for individuals aged 18 years or older, or minors accessing the platform under parent or legal guardian supervision.',
        },
        {
          label: 'Policy Updates',
          text: 'When new app capabilities or legal obligations require policy adjustments, we update this page and refresh the "Updated" date at the top.',
        },
        {
          label: 'Workshop & Grievance Officer Contact',
          text: `For privacy questions, data correction, or grievance resolution, contact ${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address} · Phone: ${WORKSHOP_INFO.phone} / ${WORKSHOP_INFO.phoneAlt} · Email: ${WORKSHOP_INFO.email} · Hours: ${WORKSHOP_INFO.workingHours}.`,
        },
      ],
    },
  ];

  const crossLinks: LegalCrossLinkItem[] = [];
  if (onOpenTerms) {
    crossLinks.push({
      label: 'Read Terms & Conditions',
      description: 'Workshop tailoring rules, Razorpay, pickup holds & refunds',
      onClick: onOpenTerms,
    });
  }
  if (onOpenDeleteAccount) {
    crossLinks.push({
      label: 'Manage or Delete Account',
      description: 'Schedule or cancel account deletion with 7-day grace window',
      onClick: onOpenDeleteAccount,
    });
  }
  if (onOpenPersonalData && crossLinks.length < 2) {
    crossLinks.push({
      label: 'Personal Data Sign-Up Notice',
      description: 'Summary of consent requested when creating a new account',
      onClick: onOpenPersonalData,
    });
  }

  return (
    <LegalDocumentLayout
      documentTitle="Privacy Policy"
      documentSubtitle="Data protection & user rights"
      heroTitle="Your Privacy, Vehicle Specs & Account Protection"
      heroDescription={`At ${WORKSHOP_INFO.name} in Murshidabad, we collect only what is needed to tailor your seat cover, manage Razorpay or workshop-pickup orders, send requested alerts, and keep your account secure.`}
      lastUpdated="November 2026"
      versionLabel="v2.1"
      highlights={highlights}
      sections={sections}
      searchPlaceholder="Search privacy policy (e.g. Razorpay, push, delete, photos)..."
      whatsappMessage="Hello Rofik Godi Centre, I have a question regarding the Privacy Policy."
      primaryCtaLabel="I Understand & Accept"
      acceptanceNote="By shopping, saving vehicle specs, or creating an account at Rofik Godi Centre, you acknowledge these data practices."
      onBack={onBack}
      onOpenStoreInfo={onOpenStoreInfo}
      crossLinks={crossLinks}
    />
  );
};
