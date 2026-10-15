import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Database,
  Eye,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Share2,
  ChevronRight,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';

interface PrivacyPolicyViewProps {
  onBack: () => void;
  onOpenStoreInfo?: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({
  onBack,
  onOpenStoreInfo,
}) => {
  const [activeSection, setActiveSection] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const sections = [
    {
      id: 'collection',
      icon: Database,
      badge: 'Transparent',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: '1. Information We Collect',
      summary: 'Information needed to manage your account, order and store pickup.',
      details: [
        {
          label: 'Customer Identification & Contact',
          text: 'Your name, phone number, vehicle model, pickup notes, and optional email address that you provide to manage your account and orders.',
        },
        {
          label: 'Vehicle & Custom Seat Dimensions',
          text: 'Motorcycle, Scooter, or Toto E-Rickshaw make and model (e.g. Royal Enfield, Splendor, Activa, Toto Benching), foam density preference, customized embroidery name/lettering punch details.',
        },
        {
          label: 'Order & Transaction History',
          text: 'Order totals, payment status, the recorded UPI reference when applicable, and order-item details.',
        },
      ],
    },
    {
      id: 'usage',
      icon: Eye,
      badge: 'Operational',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      title: '2. How We Use Your Data',
      summary: 'Used to manage account access, orders, store pickup and customer support.',
      details: [
        {
          label: 'Custom Tailoring & Workshop Queue',
          text: 'We use the vehicle specifications and options you submit to prepare and manage your requested seat-cover order.',
        },
        {
          label: 'Order confirmations and account updates',
          text: 'Order details are used to send confirmation emails when an email address is available and to show order status in your account. Store-pickup details are shown in the app.',
        },
        {
          label: 'Order and service records',
          text: 'We keep the order details needed to prepare pickup, verify payment and respond to questions about your order.',
        },
      ],
    },
    {
      id: 'security',
      icon: Lock,
      badge: 'Payment safety',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      title: '3. Payment & Security',
      summary: 'We do not ask for or store your card PIN, UPI MPIN, bank password or OTP.',
      details: [
        {
          label: 'Payments through your chosen method',
          text: 'If you choose online UPI, complete the payment in your UPI app and verify the transaction with the store. Do not share private banking credentials.',
        },
        {
          label: 'Private payment credentials',
          text: 'Do not share your UPI MPIN, card CVV, bank password or OTP with anyone. These credentials are not required by the store to verify an order.',
        },
        {
          label: 'Payment choices',
          text: 'The app currently offers online UPI payment or payment at the workshop on pickup, as shown at checkout.',
        },
      ],
    },
    {
      id: 'sharing',
      icon: ShieldCheck,
      badge: 'Zero Telemarketing',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      title: '4. Data Protection & Sharing Safeguards',
      summary: 'We never sell, trade, or rent your personal contact information to any third parties.',
      details: [
        {
          label: 'Service providers',
          text: 'We use service providers for authentication, database hosting and transactional email. We do not sell your personal information.',
        },
        {
          label: 'No Telemarketing or Spam Lists',
          text: 'Your phone number is never shared with third-party advertising aggregators, insurance dialers, or spam call centers.',
        },
        {
          label: 'Legal & Regulatory Compliance',
          text: 'Data is disclosed solely when mandatory under Indian laws or official law enforcement requests.',
        },
      ],
    },
    {
      id: 'rights',
      icon: CheckCircle2,
      badge: 'Your Control',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      title: '5. Your Rights & Privacy Choices',
      summary: 'You control your data. Edit or purge your stored information at any time.',
      details: [
        {
          label: 'Review & Update Information',
          text: 'Access your vehicle specs, pickup orders, and profile details anytime from your Account screen.',
        },
        {
          label: 'Right to Erase & Delete Data',
          text: 'Request permanent deletion of saved pickup notes and account records by messaging our support.',
        },
        {
          label: 'Opt-Out of WhatsApp Notifications',
          text: 'Simply reply "STOP" to any promotional broadcast to immediately cease receiving discount updates.',
        },
      ],
    },
    {
      id: 'contact',
      icon: Phone,
      badge: 'Direct Workshop',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: '6. Workshop & Grievance Contact',
      summary: 'Contact the workshop using the current store details.',
      details: [
        {
          label: 'Store & Workshop Location',
          text: `${WORKSHOP_INFO.name}, ${WORKSHOP_INFO.address}.`,
        },
        {
          label: 'Support Phone & WhatsApp',
          text: `${WORKSHOP_INFO.phone} (${WORKSHOP_INFO.workingHours})`,
        },
        {
          label: 'Store Email',
          text: WORKSHOP_INFO.email,
        },
      ],
    },
  ];

  const filteredSections = activeSection === 'all'
    ? sections
    : sections.filter((s) => s.id === activeSection);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-800">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center text-slate-700"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Privacy Policy</h1>
            <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ROFIK GODI CENTRE · Privacy information</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleShare}
          className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center text-slate-600 relative"
          title="Share Policy"
          aria-label="Share Privacy Policy"
        >
          <Share2 className="w-4 h-4" />
          {copiedLink && (
            <span className="absolute -bottom-8 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-md">
              Copied!
            </span>
          )}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Hero Card */}
        <section
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#065F46] via-[#047857] to-[#0F766E] text-white p-5 sm:p-6 shadow-xl shadow-emerald-900/10"
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-8 w-44 h-44 bg-teal-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Customer Trust & Safety
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-100/90 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                Updated Oct 2026
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                Your Privacy & Vehicle Data Protection
              </h2>
              <p className="text-xs sm:text-[13px] text-emerald-100/90 leading-relaxed font-normal">
                At <strong>Rofik Godi Centre</strong>, Murshidabad, we treat your custom automotive measurements, vehicle model, pickup notes, and WhatsApp contact details with the highest care and absolute confidentiality.
              </p>
            </div>

            {/* Quick Guarantees Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              <div className="bg-white/15 backdrop-blur-xs rounded-xl p-2.5 flex items-center gap-2 border border-white/15">
                <Lock className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                <span className="text-[11px] font-bold leading-tight">No PIN/OTP Storage</span>
              </div>
              <div className="bg-white/15 backdrop-blur-xs rounded-xl p-2.5 flex items-center gap-2 border border-white/15">
                <ShieldCheck className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                <span className="text-[11px] font-bold leading-tight">Zero Telemarketing</span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white/15 backdrop-blur-xs rounded-xl p-2.5 flex items-center gap-2 border border-white/15">
                <MessageCircle className="w-4 h-4 text-emerald-200 flex-shrink-0" />
                <span className="text-[11px] font-bold leading-tight">Direct WhatsApp Updates</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filter / Quick Jump Category Pills */}
        <section className="flex gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          {[
            { id: 'all', label: 'All Policy' },
            { id: 'collection', label: '1. What We Collect' },
            { id: 'usage', label: '2. How Used' },
            { id: 'security', label: '3. Payment & Security' },
            { id: 'sharing', label: '4. No Spam Guarantee' },
            { id: 'rights', label: '5. Your Rights' },
            { id: 'contact', label: '6. Workshop Contact' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setActiveSection(pill.id)}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 border ${
                activeSection === pill.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </section>

        {/* Detailed Sections List */}
        <div className="space-y-3.5">
          {filteredSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <motion.article
                key={sec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100/60">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold text-slate-900 leading-snug">{sec.title}</h3>
                      <p className="text-[11.5px] text-slate-500 mt-0.5">{sec.summary}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${sec.badgeColor} flex-shrink-0`}>
                    {sec.badge}
                  </span>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-3.5 space-y-2.5 border border-slate-100/80 text-xs">
                  {sec.details.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <h4 className="font-bold text-slate-800 text-[12px] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {item.label}
                      </h4>
                      <p className="text-slate-600 text-[11.5px] pl-3 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Local Workshop Location & Guarantee Box */}
        <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D9232D]" />
              <h3 className="text-xs font-bold text-slate-900">Physical Store & Workshop</h3>
            </div>
            {onOpenStoreInfo && (
              <button
                onClick={onOpenStoreInfo}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                View Store Details
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900">ROFIK GODI CENTRE</p>
              <p className="text-[11px] text-slate-600">{WORKSHOP_INFO.address}</p>
              <p className="text-[11px] text-slate-500 font-medium">{WORKSHOP_INFO.workingHours}</p>
            </div>
            <a
              href={`https://wa.me/${WORKSHOP_INFO.whatsapp.replace(/\D/g, '')}?text=Hello%20Rofik%20Godi%20Centre,%20I%20have%20a%20question%20regarding%20Privacy%20Policy.`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white" />
              WhatsApp Help
            </a>
          </div>
        </section>

        {/* Bottom Accept Action */}
        <section className="pt-2 text-center space-y-3">
          <button
            onClick={onBack}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>I Understand & Accept</span>
          </button>

          <p className="text-[11px] text-slate-400">
            By shopping or requesting customized seat tailoring at Rofik Godi Centre, you agree to these transparent privacy terms.
          </p>
        </section>
      </main>
    </div>
  );
};
