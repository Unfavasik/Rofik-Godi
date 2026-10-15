import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { WORKSHOP_INFO } from '../data/products';

interface TermsConditionsViewProps {
  onBack: () => void;
  onOpenStoreInfo?: () => void;
}

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({
  onBack,
}) => {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const toggleSection = (id: number) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const termsList = [
    {
      id: 1,
      number: '1',
      title: 'Acceptance of Terms',
      subtitle: 'By using our app, you agree to these terms.',
      iconBg: 'bg-[#FEE2E2]/60',
      iconColor: 'text-[#EF4444]',
      badgeBg: 'bg-[#F5EBE6] text-[#6B2828]',
      details: [
        `By downloading, accessing, browsing, or placing an order through the Rofik Godi Centre app or visiting our workshop at ${WORKSHOP_INFO.address}, you agree to these Terms and Conditions.`,
        'If you do not agree to any part of these terms, please discontinue using the application and services.',
        'These terms apply to all visitors, registered riders, commercial toto fleet operators, and retail customers.',
      ],
    },
    {
      id: 2,
      number: '2',
      title: 'About Our Services',
      subtitle: 'We provide bike and toto seat covers and related accessories.',
      iconBg: 'bg-[#E0F2FE]/70',
      iconColor: 'text-[#0284C7]',
      badgeBg: 'bg-[#F5EBE6] text-[#6B2828]',
      details: [
        'Rofik Godi Centre specializes in precision-tailored motorcycle, scooter, and electric toto e-rickshaw seat covers, memory foam cushioning pads, waterproof rain guards, and custom embroidery fitments.',
        'All standard seat covers are manufactured with heavy-duty automotive rexine, reinforced Japanese tensile stitching cord, and high-density foam backing.',
        'On-site fitting availability and timing may vary. Contact the workshop before travelling if you need a specific service.',
      ],
    },
    {
      id: 3,
      number: '3',
      title: 'Orders & Payments',
      subtitle: 'Order confirmation, pricing and payment rules.',
      iconBg: 'bg-[#DCFCE7]/70',
      iconColor: 'text-[#16A34A]',
      badgeBg: 'bg-[#F5EBE6] text-[#6B2828]',
      details: [
        'Prices are shown in Indian Rupees (₹ INR). Review the final amount and payment option shown at checkout before placing your order.',
        'The app currently offers UPI online payment or payment at the workshop on pickup, as displayed at checkout.',
        'For bespoke custom embroidery (custom rider name/phone punch), a nominal non-refundable advance may be requested before fabric cutting commences.',
        'Orders placed through the app appear in your account. A confirmation email may be sent when a valid email address is available.',
      ],
    },
    {
      id: 4,
      number: '4',
      title: 'Shipping & Delivery',
      subtitle: 'Delivery time, charges and availability.',
      iconBg: 'bg-[#FFEDD5]/70',
      iconColor: 'text-[#EA580C]',
      badgeBg: 'bg-[#F5EBE6] text-[#6B2828]',
      details: [
        'Orders placed in the app are prepared for collection at Rofik Godi Centre. We update the order status when it is ready for pickup.',
        `Pickup is from ${WORKSHOP_INFO.address}. Check ${WORKSHOP_INFO.workingHours} before visiting.`,
        'The app currently supports store pickup; courier delivery and courier-tracking links are not offered through this checkout flow.',
      ],
    },
    {
      id: 5,
      number: '5',
      title: 'Returns & Refunds',
      subtitle: 'Conditions for return and refund.',
      iconBg: 'bg-[#FFE4E6]/70',
      iconColor: 'text-[#E11D48]',
      badgeBg: 'bg-[#F5EBE6] text-[#6B2828]',
      details: [
        'We offer a 7-day hassle-free replacement window for standard, non-customized seat covers if the item received has a stitching defect, incorrect vehicle fitment size, or transit damage.',
        'Items must be unused, uninstalled, in original packaging with brand tags intact.',
        'Custom-embossed or personalised seats (stitched with your personal name or custom logo punch) cannot be returned once stitched, except in cases of verifiable manufacturing flaws.',
        'Refunds for approved cancellations/returns are credited back to the original source payment method within 3–5 working banking days.',
      ],
    },
    {
      id: 6,
      number: '6',
      title: 'User Responsibilities',
      subtitle: 'Your proper use of the app.',
      iconBg: 'bg-[#E0F2FE]/70',
      iconColor: 'text-[#0284C7]',
      badgeBg: 'bg-[#F5EBE6] text-[#6B2828]',
      details: [
        'Users must provide accurate vehicle make, model, year, and seat dimensions when placing custom tailoring requests.',
        'You are responsible for maintaining the confidentiality of your mobile OTP login credentials and account access.',
        'Misuse of the platform, fraudulent COD orders, abusive inquiries, or automated scraping of product catalog data is strictly prohibited and subject to account suspension.',
      ],
    },
    {
      id: 7,
      number: '7',
      title: 'Limitation of Liability',
      subtitle: 'Our responsibility and limitations.',
      iconBg: 'bg-[#FEF3C7]/70',
      iconColor: 'text-[#D97706]',
      badgeBg: 'bg-[#F5EBE6] text-[#6B2828]',
      details: [
        'Any return or replacement request is handled under the conditions stated in the Returns & Refunds section above. No additional warranty is implied by these terms.',
        'Use and care requirements depend on the product; contact the workshop if you need product-specific guidance.',
        'Total liability for any claim arising from a product purchase shall not exceed the amount actually paid by the customer for that item.',
      ],
    },
    {
      id: 8,
      number: '8',
      title: 'Changes to Terms',
      subtitle: 'We may update these terms anytime.',
      iconBg: 'bg-[#F3E8FF]/70',
      iconColor: 'text-[#9333EA]',
      badgeBg: 'bg-[#F5EBE6] text-[#6B2828]',
      details: [
        'Rofik Godi Centre reserves the right to modify or update these Terms and Conditions at any time to reflect operational, legal, or regulatory updates.',
        'Any updates will be posted directly within this page with the modified "Last Updated" timestamp.',
        'Continued usage of the app following published amendments constitutes binding agreement to the revised terms.',
      ],
    },
  ];

  return (
    <div className="w-full flex-1 bg-[#F7F9FC] min-h-screen flex flex-col font-sans select-none">
      {/* BEGIN: TopNavigationBar (Matching exact screenshot HTML) */}
      <div className="px-5 pt-3 pb-3 flex items-center gap-3.5 bg-white border-b border-slate-100/80 sticky top-0 z-30 shadow-xs">
        {/* Back button */}
        <button
          onClick={onBack}
          aria-label="Go Back"
          className="text-slate-800 hover:text-slate-600 transition-colors p-1 -ml-1 cursor-pointer active:scale-95"
          type="button"
        >
          <svg className="w-6 h-6 stroke-[2.4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {/* App Header Title and Subtitle */}
        <div className="flex flex-col">
          <h1 className="text-[21px] font-extrabold text-[#0B1528] tracking-tight leading-snug">Terms &amp; Conditions</h1>
          <p className="text-[12px] font-medium text-slate-500 leading-none mt-0.5">Rules for using Rofik Godi Centre app</p>
        </div>
      </div>
      {/* END: TopNavigationBar */}

      {/* BEGIN: MainContentScrollArea */}
      <main className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 custom-scroll">
        {/* BEGIN: HeroCard (Matching exact HTML with soft peach gradient and 3D paper scroll illustration) */}
        <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FFF2ED] via-[#FDECE7] to-[#FCE6E2] p-5 border border-red-50/80 shadow-xs">
          {/* Background subtle decorative glow circles */}
          <div className="absolute -right-6 -bottom-8 w-44 h-44 rounded-full bg-red-200/30 blur-2xl pointer-events-none" />
          <div className="absolute right-12 top-2 w-28 h-28 rounded-full bg-rose-200/25 blur-xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            {/* Text Column */}
            <div className="max-w-[56%] pr-1">
              <span className="text-[11px] font-extrabold text-[#DC2626] tracking-wider uppercase inline-block mb-1.5 font-mono">
                ROFIK GODI CENTRE
              </span>
              <h2 className="text-[25px] font-black tracking-tight leading-[1.1] mb-2 text-[#0B1528]">
                Terms &amp;<br />
                <span className="text-[#DC2626]">Conditions</span>
              </h2>
              <p className="text-[11.5px] font-medium text-slate-600 leading-[1.35]">
                Please read these terms carefully before using our app.
              </p>
            </div>

            {/* 3D Style Scroll/Paper Illustration (Exact reproduction) */}
            <div className="relative w-32 h-32 flex items-center justify-center mr-1">
              {/* 3D Document Scroll Body */}
              <div className="relative w-[86px] h-[106px] bg-white rounded-xl shadow-[0_12px_28px_-4px_rgba(100,116,139,0.18)] border-t-[3px] border-slate-100 flex flex-col pt-4 px-2.5 pb-2 transform -rotate-1">
                {/* Top curled roll edge imitation */}
                <div className="absolute -top-1.5 inset-x-0 h-3 bg-gradient-to-b from-slate-200 to-white rounded-full shadow-inner opacity-60" />
                {/* Red Bookmark Ribbon Hanging from Top */}
                <div className="absolute top-0 right-4 w-4 h-7 bg-gradient-to-b from-red-600 to-red-500 rounded-b shadow-md flex items-end justify-center pb-0.5">
                  <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[5px] border-b-white/90" />
                </div>
                {/* Document horizontal content lines */}
                <div className="space-y-2 mt-2 w-full pr-4">
                  <div className="h-2 w-full bg-slate-300/80 rounded-full" />
                  <div className="h-2 w-11/12 bg-slate-300/80 rounded-full" />
                  <div className="h-2 w-4/5 bg-slate-300/80 rounded-full" />
                  <div className="h-2 w-3/4 bg-slate-300/80 rounded-full" />
                </div>
                {/* Bottom curl roll effect */}
                <div className="absolute -bottom-2 -left-1 -right-1 h-3.5 bg-gradient-to-b from-slate-100 to-slate-200 rounded-full shadow-sm border-t border-slate-200/50" />
              </div>
              {/* Floating 3D Checkmark Badge */}
              <div className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full bg-gradient-to-tr from-[#DC2626] via-[#EF4444] to-[#F87171] shadow-[0_10px_20px_-3px_rgba(220,38,38,0.35)] flex items-center justify-center p-0.5 border-2 border-white transform transition hover:scale-105">
                <svg className="w-6 h-6 text-white stroke-[3.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </section>
        {/* END: HeroCard */}

        {/* BEGIN: LastUpdatedCard */}
        <section className="bg-[#F1F3F7] rounded-[20px] px-3.5 py-3 flex items-center gap-3.5 border border-slate-200/60 shadow-2xs">
          {/* Circle info icon */}
          <div className="w-10 h-10 rounded-full bg-[#FCE8E8] flex-shrink-0 flex items-center justify-center border border-red-200/50 text-[#E53E3E]">
            <svg className="w-5 h-5 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008zM12 6.75h.008v.008H12V6.75z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 leading-tight">
            <p className="text-[13.5px] font-bold text-slate-900 tracking-tight">Last Updated: 1 September 2025</p>
            <p className="text-[11.5px] font-normal text-slate-500 mt-0.5 leading-snug">
              These Terms &amp; Conditions govern your use of Rofik Godi Centre app and services.
            </p>
          </div>
        </section>
        {/* END: LastUpdatedCard */}

        {/* BEGIN: TermsSectionsList (Interactive 8 items list representing terms breakdown) */}
        <section aria-label="Terms List" className="space-y-2.5 pt-0.5">
          {termsList.map((item) => {
            const isExpanded = expandedSection === item.id;
            return (
              <div
                key={item.id}
                onClick={() => toggleSection(item.id)}
                className="bg-white rounded-[20px] p-3 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04),0_1px_3px_-1px_rgba(0,0,0,0.02)] hover:bg-slate-50/80 transition-all border border-slate-100 cursor-pointer group select-none"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    {/* Icon container */}
                    <div className={`w-10 h-10 rounded-2xl ${item.iconBg} flex items-center justify-center ${item.iconColor} flex-shrink-0`}>
                      {item.id === 1 && (
                        <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {item.id === 2 && (
                        <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {item.id === 3 && (
                        <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6-10.5h19.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H2.25A1.5 1.5 0 01.75 18V7.5a1.5 1.5 0 011.5-1.5z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {item.id === 4 && (
                        <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v10.875c0 .621.504 1.125 1.125 1.125h1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {item.id === 5 && (
                        <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {item.id === 6 && (
                        <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {item.id === 7 && (
                        <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002A11.959 11.959 0 0112 2.714zm0 10.286h.008v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {item.id === 8 && (
                        <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Number badge */}
                    <div className={`w-6 h-6 rounded-full ${item.badgeBg} text-[12px] font-bold flex items-center justify-center flex-shrink-0`}>
                      {item.number}
                    </div>

                    {/* Content */}
                    <div className="truncate">
                      <h3 className="text-[13.5px] font-bold text-slate-900 truncate tracking-tight">{item.title}</h3>
                      <p className="text-[11.5px] text-slate-500 font-normal truncate mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>

                  {/* Chevron / Toggle Indicator */}
                  <svg
                    className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 flex-shrink-0 stroke-[2.5] ${
                      isExpanded ? 'rotate-90 text-[#DC2626]' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Expanded Details Accordion */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pt-3 mt-3 border-t border-slate-100"
                    >
                      <div className="bg-slate-50/80 rounded-xl p-3 space-y-2 text-[12px] text-slate-600 leading-relaxed">
                        {item.details.map((point, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 flex-shrink-0" />
                            <p>{point}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </section>
        {/* END: TermsSectionsList */}

        {/* Support & Contact Card */}
        <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs mt-3 flex items-center justify-between">
          <div>
            <h4 className="text-[13px] font-bold text-slate-900 leading-tight">Questions about our Terms?</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Reach out to our local Murshidabad team</p>
          </div>
          <a
            href={`https://wa.me/${WORKSHOP_INFO.whatsapp.replace(/\D/g, '')}?text=Hello%20Rofik%20Godi,%20I%20have%20a%20question%20regarding%20Terms%20%26%20Conditions.`}
            target="_blank"
            rel="noreferrer"
            className="bg-[#DC2626] hover:bg-red-700 text-white text-[11.5px] font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 active:scale-95"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Ask Us</span>
          </a>
        </section>

        {/* Footer info note */}
        <div className="text-center py-2 text-[10.5px] text-slate-400">
          {WORKSHOP_INFO.name} · {WORKSHOP_INFO.address}
        </div>
      </main>
      {/* END: MainContentScrollArea */}
    </div>
  );
};
