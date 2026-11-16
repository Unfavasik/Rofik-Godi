import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Eye,
  Phone,
  Calendar,
  CheckCircle2,
  Share2,
  FileSignature,
  UserCheck,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';

interface PersonalDataViewProps {
  onBack: () => void;
  onOpenStoreInfo?: () => void;
}

export const PersonalDataView: React.FC<PersonalDataViewProps> = ({
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
      id: 'scope',
      icon: FileSignature,
      badge: 'Signup Consent',
      badgeColor: 'bg-[#F6EAE4] text-[#6B352A] border-[#E8D8C4]',
      title: '1. What This Consent Covers',
      summary: 'This page explains exactly what happens when you tick "I agree to the processing of Personal data" at sign up.',
      details: [
        {
          label: 'Your agreement',
          text: 'By ticking the box and creating an account, you allow Rofik Godi Centre to collect and process the personal data listed below for the purposes described on this page.',
        },
        {
          label: 'Data processed at sign up',
          text: 'Your full name, email address and password. Your password is never stored in readable form — it is handled by our authentication provider.',
        },
        {
          label: 'Data processed while you use the app',
          text: 'Vehicle model and seat-cover measurements, order history, pickup notes, phone number and any messages you send to support.',
        },
      ],
    },
    {
      id: 'purpose',
      icon: Eye,
      badge: 'Only These Uses',
      badgeColor: 'bg-[#FFF8D6] text-[#6B352A] border-[#E6CE73]',
      title: '2. Why We Process Your Data',
      summary: 'Your data is used only to run your account, your orders and your workshop support.',
      details: [
        {
          label: 'Account & sign in',
          text: 'Your name and email create and secure your account so you can sign in, track orders and save your vehicle details.',
        },
        {
          label: 'Orders & custom tailoring',
          text: 'Vehicle model, measurements and pickup notes are used to stitch your seat cover correctly and prepare store pickup.',
        },
        {
          label: 'Order updates & support',
          text: 'We use your contact details to send order confirmations, status updates and to answer your questions.',
        },
      ],
    },
    {
      id: 'withdraw',
      icon: Trash2,
      badge: 'Your Choice',
      badgeColor: 'bg-[#FFF1A6] text-[#53271E] border-[#E6CE73]',
      title: '3. Consent Is Voluntary & Withdrawable',
      summary: 'You can withdraw your consent at any time without affecting past orders.',
      details: [
        {
          label: 'Withdraw consent',
          text: 'Message our support team and ask us to delete your account. We remove your personal data and confirm once it is done.',
        },
        {
          label: 'No consent, no account',
          text: 'If you prefer not to agree, you can still browse the shop and use guest mode — only account creation requires this consent.',
        },
        {
          label: 'Marketing is separate',
          text: 'Agreeing to data processing is not the same as agreeing to marketing. Promotional messages are opt-out anytime by replying "STOP".',
        },
      ],
    },
    {
      id: 'security',
      icon: Lock,
      badge: 'Protected',
      badgeColor: 'bg-[#F6EAE4] text-[#53271E] border-[#D8BFA8]',
      title: '4. How Your Data Is Stored & Protected',
      summary: 'Encrypted transmission, hashed passwords and no storage of banking credentials.',
      details: [
        {
          label: 'Secure storage',
          text: 'Data is transmitted over encrypted connections and stored with our authentication and database providers.',
        },
        {
          label: 'Never asked for',
          text: 'We never ask for or store your UPI MPIN, card CVV, bank password or OTP. Payment happens in your own UPI app.',
        },
        {
          label: 'Retention',
          text: 'We keep your data only as long as your account is active or as needed to complete orders and meet legal record-keeping duties.',
        },
      ],
    },
    {
      id: 'sharing',
      icon: ShieldCheck,
      badge: 'Zero Selling',
      badgeColor: 'bg-[#FFF8D6] text-[#53271E] border-[#E6CE73]',
      title: '5. Sharing & Your Rights',
      summary: 'We never sell, trade or rent your personal data. You stay in control of it.',
      details: [
        {
          label: 'Who sees your data',
          text: 'Only the workshop team and the service providers that run authentication, hosting and email — nothing is sold or rented.',
        },
        {
          label: 'Access, correct, delete',
          text: 'Review and edit your details anytime from your Account screen, or ask support for a copy or deletion of your data.',
        },
        {
          label: 'Legal requests',
          text: 'Data is disclosed solely when mandatory under Indian laws or official law enforcement requests.',
        },
      ],
    },
    {
      id: 'contact',
      icon: Phone,
      badge: 'Direct Workshop',
      badgeColor: 'bg-[#F6EAE4] text-[#6B352A] border-[#E8D8C4]',
      title: '6. Questions About Your Data',
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
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#FFFCF4] pb-[max(6rem,env(safe-area-inset-bottom))] text-[#2B1611]">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#FFFCF4]/95 backdrop-blur-md border-b border-[#E8D8C4] shadow-[0_2px_12px_rgba(43,22,17,0.03)] px-4 py-3.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 shrink-0 rounded-full bg-[#FAF4EA] hover:bg-[#FFF8D6] active:scale-95 transition-all flex items-center justify-center text-[#2B1611]"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold text-[#2B1611] leading-tight">Personal Data Processing</h1>
            <p className="truncate text-[11px] font-semibold text-[#6B352A] flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">ROFIK GODI CENTRE · Sign up consent</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleShare}
          className="w-11 h-11 shrink-0 rounded-full bg-white border border-[#E8D8C4] hover:bg-[#FAF4EA] active:scale-95 transition-all flex items-center justify-center text-[#4A2B23] relative"
          title="Share"
          aria-label="Share Personal Data Processing page"
        >
          <Share2 className="w-4 h-4" />
          {copiedLink && (
            <span className="absolute -bottom-8 right-0 bg-[#2B1611] text-[#FFF1A6] text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-md">
              Copied!
            </span>
          )}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Hero Card */}
        <section
          className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#4A221A] via-[#6B352A] to-[#834639] text-[#FFFCF4] p-5 sm:p-6 shadow-xl shadow-[#2B1611]/15"
        >
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-[#FFF1A6]/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-8 w-44 h-44 bg-[#FFF1A6]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#FFF1A6]" />
                Sign up Consent Notice
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#FFF8D6]/90 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                Updated Oct 2026
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                Processing of Your Personal Data
              </h2>
              <p className="text-xs sm:text-[13px] text-[#FFF8D6]/90 leading-relaxed font-normal">
                Before you tick <strong>"I agree to the processing of Personal data"</strong> at sign up, read this short notice. It explains what we collect, why we use it, and how you stay in control.
              </p>
            </div>

            {/* Quick Guarantees Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              <div className="bg-white/12 backdrop-blur-xs rounded-xl p-2.5 flex items-center gap-2 border border-white/15">
                <Lock className="w-4 h-4 text-[#FFF1A6] flex-shrink-0" />
                <span className="text-[11px] font-bold leading-tight">Password Never Readable</span>
              </div>
              <div className="bg-white/12 backdrop-blur-xs rounded-xl p-2.5 flex items-center gap-2 border border-white/15">
                <ShieldCheck className="w-4 h-4 text-[#FFF1A6] flex-shrink-0" />
                <span className="text-[11px] font-bold leading-tight">Never Sold or Rented</span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white/12 backdrop-blur-xs rounded-xl p-2.5 flex items-center gap-2 border border-white/15">
                <Trash2 className="w-4 h-4 text-[#FFF1A6] flex-shrink-0" />
                <span className="text-[11px] font-bold leading-tight">Withdraw Consent Anytime</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filter / Quick Jump Category Pills */}
        <section className="flex gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          {[
            { id: 'all', label: 'All Sections' },
            { id: 'scope', label: '1. What Consent Covers' },
            { id: 'purpose', label: '2. Why Processed' },
            { id: 'withdraw', label: '3. Withdraw Anytime' },
            { id: 'security', label: '4. Storage & Security' },
            { id: 'sharing', label: '5. Sharing & Rights' },
            { id: 'contact', label: '6. Contact' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setActiveSection(pill.id)}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-150 border ${
                activeSection === pill.id
                  ? 'bg-[#6B352A] text-[#FFF1A6] border-[#6B352A] shadow-sm'
                  : 'bg-white text-[#4A2B23] border-[#E8D8C4] hover:bg-[#FAF4EA]'
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
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8D8C4] shadow-[0_2px_10px_rgba(43,22,17,0.03)] space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FFF8D6] text-[#6B352A] flex items-center justify-center flex-shrink-0 border border-[#E6CE73]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14.5px] font-bold text-[#2B1611] leading-snug">{sec.title}</h3>
                      <p className="text-[11.5px] text-[#6B4C44] mt-0.5">{sec.summary}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${sec.badgeColor} flex-shrink-0`}>
                    {sec.badge}
                  </span>
                </div>

                <div className="bg-[#FAF4EA]/75 rounded-xl p-3.5 space-y-2.5 border border-[#EFE2D2] text-xs">
                  {sec.details.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <h4 className="font-bold text-[#2B1611] text-[12px] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6B352A]" />
                        {item.label}
                      </h4>
                      <p className="text-[#4A2B23] leading-relaxed pl-3">{item.text}</p>
                    </div>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Consent Summary Card */}
        <section className="rounded-2xl bg-[#FFF8D6]/55 border border-[#E6CE73] p-4 sm:p-5 shadow-[0_2px_10px_rgba(43,22,17,0.03)] space-y-3">
          <h3 className="text-[14.5px] font-bold text-[#2B1611] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#6B352A]" />
            In Short
          </h3>
          <ul className="space-y-2 text-xs text-[#4A2B23]">
            {[
              'We process your name, email, vehicle details and orders only to run your account and orders.',
              'Your password is always encrypted; banking PINs and OTPs are never asked for or stored.',
              'Your data is never sold, traded or rented to anyone.',
              'You can withdraw consent and delete your account anytime by contacting support.',
            ].map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6B352A] flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
          {onOpenStoreInfo && (
            <button
              type="button"
              onClick={onOpenStoreInfo}
              className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#6B352A] hover:underline"
            >
              Visit our store page
            </button>
          )}
        </section>

        {/* Back CTA */}
        <div className="pt-1 pb-4">
          <button
            type="button"
            onClick={onBack}
            className="w-full h-13 rounded-[26px] bg-gradient-to-r from-[#6B352A] via-[#7A3F32] to-[#53271E] py-3.5 text-[15px] font-bold text-white shadow-[0_10px_22px_rgba(107,53,42,0.28)] transition-transform active:scale-[0.985]"
          >
            Back to Sign Up
          </button>
          <p className="mt-2.5 text-center text-[11px] text-[#8A6C63]">
            Ticking the box on the sign up screen records your agreement to this notice.
          </p>
        </div>
      </main>
    </div>
  );
};
