import React from 'react';
import { WORKSHOP_INFO } from '../data/products';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Phone, MessageCircle, Clock, Wrench, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface StoreLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreLocationModal: React.FC<StoreLocationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-[460px] max-h-[90vh] bg-white rounded-[28px] shadow-2xl flex flex-col z-10 overflow-hidden text-gray-800"
        >
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-[#1e232a] text-white p-5 pt-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#D9232D] flex items-center justify-center font-black text-sm">
                R
              </div>
              <h3 className="text-xl font-black tracking-tight">{WORKSHOP_INFO.name}</h3>
            </div>
            <p className="text-[11px] text-gray-300">{WORKSHOP_INFO.subtitle}</p>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
            {/* Address Card */}
            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 text-[#D9232D] flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[12px] font-black text-gray-900 block">Workshop & Retail Hub</span>
                <p className="text-[11.5px] text-gray-600 mt-0.5">{WORKSHOP_INFO.address}</p>
              </div>
            </div>

            {/* Timings */}
            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[12px] font-black text-gray-900 block">Working Hours</span>
                <p className="text-[11.5px] text-gray-600 mt-0.5">{WORKSHOP_INFO.workingHours}</p>
              </div>
            </div>

            {/* Direct Contacts */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${WORKSHOP_INFO.phone}`}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-bold text-gray-900 transition-colors"
              >
                <Phone className="w-4 h-4 text-[#D9232D]" />
                <span>Call Workshop</span>
              </a>

              <a
                href={`https://wa.me/919832145678?text=Hello%20Rofik%20Godi,%20I%20want%20to%20inquire%20about%20seat%20covers.`}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-emerald-600 hover:bg-emerald-700 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-bold text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Chat</span>
              </a>
            </div>

            {/* Free Fitment Services */}
            <div>
              <h4 className="text-[12px] font-black text-gray-900 mb-2 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#D9232D]" />
                <span>On-Site Workshop Services:</span>
              </h4>
              <div className="space-y-1.5">
                {WORKSHOP_INFO.services.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11.5px] text-gray-700 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Guarantee Notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-900">
                <strong>100% Genuine Stitched Quality:</strong> Every seat cover crafted at Rofik Godi is quality inspected with UV-resistant Japanese thread and 1-year tear guarantee.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
