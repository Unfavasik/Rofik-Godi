import React from 'react';
import {
  Eye,
  FileSignature,
  Lock,
  Phone,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';
import {
  LegalDocumentLayout,
  type LegalClauseSection,
  type LegalCrossLinkItem,
  type LegalHighlightItem,
} from './LegalDocumentLayout';

interface PersonalDataViewProps {
  onBack: () => void;
  onOpenStoreInfo?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenDeleteAccount?: () => void;
  primaryCtaLabel?: string;
}

export const PersonalDataView: React.FC<PersonalDataViewProps> = ({
  onBack,
  onOpenStoreInfo,
  onOpenPrivacy,
  onOpenTerms,
  onOpenDeleteAccount,
  primaryCtaLabel = 'Back & Continue',
}) => {
  const highlights: LegalHighlightItem[] = [
    {
      icon: Lock,
      title: 'Password Never Readable',
      description: 'Account credentials are cryptographically hashed; banking PINs or OTPs are never stored.',
    },
    {
      icon: ShieldCheck,
      title: 'Never Sold or Rented',
      description: 'Your name, phone number, vehicle specs, and orders are strictly for workshop service.',
    },
    {
      icon: Trash2,
      title: 'Withdraw Consent Anytime',
      description: 'Manage your details or schedule account removal anytime with a 7-day grace window.',
    },
  ];

  const sections: LegalClauseSection[] = [
    {
      id: 'scope',
      number: '01',
      icon: FileSignature,
      title: 'What This Consent Covers',
      shortTitle: 'Consent Scope',
      summary: 'Explains exactly what happens when you agree to the processing of personal data at sign up.',
      keywords: ['consent', 'signup', 'name', 'email', 'password', 'vehicle', 'measurements', 'pickup'],
      details: [
        {
          label: 'Your Agreement',
          text: 'By ticking the consent checkbox and creating an account, you allow Rofik Godi Centre to collect and process the personal data listed below for running your account, orders, and workshop fitment.',
        },
        {
          label: 'Data Processed at Sign Up',
          text: 'Your full name, email address, and password. Your password is never stored in readable form—it is cryptographically hashed by our authentication provider.',
        },
        {
          label: 'Data Processed While Using the App',
          text: 'Vehicle model and seat-cover measurements, order history, pickup notes, phone number, and any messages or photos you explicitly send to support.',
        },
      ],
    },
    {
      id: 'purpose',
      number: '02',
      icon: Eye,
      title: 'Why We Process Your Data',
      shortTitle: 'Data Uses',
      summary: 'Used strictly to run your rider account, tailor your seat cover, and deliver workshop support.',
      keywords: ['purpose', 'account', 'tailoring', 'stitching', 'orders', 'updates', 'support'],
      details: [
        {
          label: 'Account & Sign In',
          text: 'Your name and email create and secure your account so you can sign in, track orders, and save your vehicle model in My Fitment Garage.',
        },
        {
          label: 'Orders & Custom Tailoring',
          text: 'Vehicle model, foam thickness, stitch style, and pickup notes guide our workshop craftsmen to stitch your seat cover accurately and prepare store pickup.',
        },
        {
          label: 'Order Updates & Customer Care',
          text: 'We use your contact details to deliver order confirmations, pickup readiness alerts, and replies to your support requests.',
        },
      ],
    },
    {
      id: 'withdraw',
      number: '03',
      icon: Trash2,
      title: 'Consent Is Voluntary & Withdrawable',
      shortTitle: 'Withdraw',
      summary: 'You stay in full control—withdraw consent or opt out of marketing anytime.',
      keywords: ['withdraw', 'voluntary', 'guest', 'delete', 'opt-out', 'marketing', 'stop'],
      details: [
        {
          label: 'Withdraw Consent & Delete Account',
          text: 'Open Settings → Delete Account or contact our workshop support team to remove your account. Personal data is purged after the 7-day cancellation grace window.',
        },
        {
          label: 'Guest Browsing Without Sign Up',
          text: 'If you prefer not to agree to account data processing, you can still browse our catalog and workshop details in guest mode—consent is required only when creating an account.',
        },
        {
          label: 'Marketing Preferences Stay Separate',
          text: 'Agreeing to essential account processing does not force promotional alerts. You can mute offers anytime in Notification Settings or reply "STOP" on WhatsApp.',
        },
      ],
    },
    {
      id: 'security',
      number: '04',
      icon: Lock,
      title: 'How Your Data Is Stored & Protected',
      shortTitle: 'Security',
      summary: 'Encrypted HTTPS transmission, hashed passwords, and zero storage of banking credentials.',
      keywords: ['security', 'encrypted', 'tls', 'upi', 'mpin', 'cvv', 'otp', 'retention'],
      details: [
        {
          label: 'Encrypted Storage & Transport',
          text: 'All account and order data travels over HTTPS/TLS encryption and is stored securely with our authentication and database infrastructure providers.',
        },
        {
          label: 'Banking Secrets Are Never Requested',
          text: 'We never ask for or store your UPI MPIN, card CVV, ATM PIN, bank password, or OTP. Online payments are processed inside Razorpay Checkout or your own UPI app.',
        },
        {
          label: 'Purpose-Bound Retention',
          text: 'We retain your personal data only while your account remains active or as required to complete workshop orders, honor guarantees, and meet Indian record-keeping duties.',
        },
      ],
    },
    {
      id: 'sharing',
      number: '05',
      icon: ShieldCheck,
      title: 'Sharing & Your Data Rights',
      shortTitle: 'Your Rights',
      summary: 'Zero data resale or telemarketing—access, correct, or erase your details anytime.',
      keywords: ['sharing', 'rights', 'access', 'correct', 'delete', 'legal', 'third-party'],
      details: [
        {
          label: 'Who Sees Your Data',
          text: 'Only the Rofik Godi Centre workshop team and essential infrastructure providers running authentication, hosting, payments, and transactional email—nothing is sold or rented.',
        },
        {
          label: 'Access, Correct & Erase',
          text: 'Review and update your name, phone number, avatar, and saved vehicle anytime from your Account screen, or request export or deletion through workshop support.',
        },
        {
          label: 'Legal & Regulatory Disclosures',
          text: 'Personal data is disclosed solely when mandatory under applicable Indian law or official law enforcement orders.',
        },
      ],
    },
    {
      id: 'contact',
      number: '06',
      icon: Phone,
      title: 'Questions About Your Data',
      shortTitle: 'Contact',
      summary: 'Reach our Berhampore workshop directly for consent, correction, or deletion help.',
      keywords: ['contact', 'workshop', 'phone', 'whatsapp', 'email', 'berhampore', 'murshidabad'],
      details: [
        {
          label: 'Store & Workshop Location',
          text: `${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}.`,
        },
        {
          label: 'Support Phone & WhatsApp',
          text: `${WORKSHOP_INFO.phone}${WORKSHOP_INFO.phoneAlt ? ` / ${WORKSHOP_INFO.phoneAlt}` : ''} (${WORKSHOP_INFO.workingHours})`,
        },
        {
          label: 'Official Store Email',
          text: WORKSHOP_INFO.email,
        },
      ],
    },
  ];

  const crossLinks: LegalCrossLinkItem[] = [];
  if (onOpenPrivacy) {
    crossLinks.push({
      label: 'Read Privacy Policy',
      description: 'Full breakdown of storage, push alerts, media uploads & retention',
      onClick: onOpenPrivacy,
    });
  }
  if (onOpenTerms) {
    crossLinks.push({
      label: 'Read Terms & Conditions',
      description: 'Workshop tailoring rules, Razorpay, pickup holds & refunds',
      onClick: onOpenTerms,
    });
  }
  if (onOpenDeleteAccount && crossLinks.length < 2) {
    crossLinks.push({
      label: 'Manage or Delete Account',
      description: 'Schedule or cancel account deletion with 7-day grace window',
      onClick: onOpenDeleteAccount,
    });
  }

  return (
    <LegalDocumentLayout
      documentTitle="Personal Data"
      documentSubtitle="Sign-up consent & data rights"
      heroTitle="How Your Personal Data Is Processed"
      heroDescription={`A clear breakdown of what ${WORKSHOP_INFO.name} collects when you create an account, why it is needed for your seat covers and pickup orders, and how you stay in full control.`}
      lastUpdated="November 2026"
      versionLabel="v2.1"
      highlights={highlights}
      sections={sections}
      searchPlaceholder="Search personal data notice (e.g. consent, withdraw, password, rights)..."
      whatsappMessage="Hello Rofik Godi Centre, I have a question regarding Personal Data Processing."
      primaryCtaLabel={primaryCtaLabel}
      acceptanceNote="Ticking the consent box during sign up records your agreement to this Personal Data notice."
      onBack={onBack}
      onOpenStoreInfo={onOpenStoreInfo}
      crossLinks={crossLinks}
    />
  );
};
