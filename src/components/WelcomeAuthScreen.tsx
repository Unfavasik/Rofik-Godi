import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Truck, Star, Phone, Mail, User, ChevronRight } from 'lucide-react';

interface WelcomeAuthScreenProps {
  onContinueGoogle: () => void;
  onContinuePhone: () => void;
  onContinueEmail: () => void;
  onContinueGuest: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const WelcomeAuthScreen: React.FC<WelcomeAuthScreenProps> = ({
  onContinueGoogle,
  onContinuePhone,
  onContinueEmail,
  onContinueGuest,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const showcaseSlides = [
    {
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDb5u48v7PwFdzn4_BDUM6odmmk6dQ6EEFTBHcMU2Vvqmj-mj8_HCSFiKFjFHFE28XP0BEf29q0dNjhDNJWeg1YF6PXBX_ZDE4cNO5vnZNt8sXT1Gg1clWlo0JhPzMC6b8SW0xe55pAzGblTlmIYLFNO42qMW1tZll0FORMuLzrSyCzfeKOTsViJYDp698zO-5g-hSJWj67NhZWKkiMtBiEXY3ANGfMGU7GBpKmeFflSdXYihz2Tf9g',
      title: 'Diamond Quilted Rexine',
    },
    {
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAXb-sDFoKe1hr9HZ8QJS-_Y5MZ1Vskn9GUIw74w5kxFEuO81OX2Th9U7J6vhCVUbMO8NeRulf7EghBpWwi6Uatj7ddzbViVQp2nUm085zPoLKcg4PntDCTe4HR7WVT_0GkQEbniLuknwt-Mjid1ejdW48pt2W1od3QWLE8inEBJzqRf534dmczQPBref_y-l3kgLfK7YxZvv1PwkaC8jDn5nehOFP2ilvgTCOdvFgFatyqcBXNjqa6',
      title: '3D Airflow Mesh Pad',
    },
    {
      image:
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
      title: 'Toto Heavy-Duty Cushion',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-between p-5 max-w-[440px] mx-auto select-none font-sans animate-fade-in">
      {/* Top Header Row with Skip Button (Matching Image 2) */}
      <div className="flex justify-end items-center pt-2">
        <button
          onClick={onContinueGuest}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-1 rounded-full hover:bg-gray-100 transition-all active:scale-95"
        >
          Skip
        </button>
      </div>

      {/* Main Hero Header */}
      <div className="space-y-1.5 mt-2">
        <h1 className="text-[28px] sm:text-[32px] font-extrabold text-gray-950 tracking-tight leading-[1.15]">
          Welcome to <br />
          <span className="text-[#D9232D]">Rofik Godi</span> Centre
        </h1>
        <p className="text-[13.5px] text-gray-500 font-normal leading-relaxed">
          Premium seat covers for bike, toto and more.
        </p>

        {/* 3 Value Proposition Badges (Matching Image 2) */}
        <div className="grid grid-cols-3 gap-2.5 pt-3">
          <div className="bg-[#FAF9FB] border border-gray-100/90 rounded-2xl p-2.5 flex flex-col items-center text-center shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]">
            <div className="w-8 h-8 rounded-full bg-[#FEECEC] flex items-center justify-center text-[#EF4444] mb-1.5">
              <Shield className="w-4 h-4 fill-[#EF4444]/20 stroke-[2.2]" />
            </div>
            <span className="text-[11.5px] font-bold text-gray-900 leading-none">Durable</span>
            <span className="text-[9.5px] text-gray-400 mt-0.5">Quality</span>
          </div>

          <div className="bg-[#FAF9FB] border border-gray-100/90 rounded-2xl p-2.5 flex flex-col items-center text-center shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]">
            <div className="w-8 h-8 rounded-full bg-[#FEECEC] flex items-center justify-center text-[#EF4444] mb-1.5">
              <Truck className="w-4 h-4 fill-[#EF4444]/20 stroke-[2.2]" />
            </div>
            <span className="text-[11.5px] font-bold text-gray-900 leading-none">Local</span>
            <span className="text-[9.5px] text-gray-400 mt-0.5">Service</span>
          </div>

          <div className="bg-[#FAF9FB] border border-gray-100/90 rounded-2xl p-2.5 flex flex-col items-center text-center shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]">
            <div className="w-8 h-8 rounded-full bg-[#FEECEC] flex items-center justify-center text-[#EF4444] mb-1.5">
              <Star className="w-4 h-4 fill-[#EF4444]/20 stroke-[2.2]" />
            </div>
            <span className="text-[11.5px] font-bold text-gray-900 leading-none">Trusted</span>
            <span className="text-[9.5px] text-gray-400 mt-0.5">Store</span>
          </div>
        </div>
      </div>

      {/* Center Showcase Visual with Dual-Tone Seat Cover & Shadow (Matching Image 2) */}
      <div className="py-2 flex flex-col items-center">
        <motion.div
          key={activeSlide}
          initial={{ opacity: 0.8, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-[280px] aspect-[1.3/1] flex items-center justify-center"
        >
          {/* Soft background oval backdrop */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#FDECE9]/70 via-[#FDF5F3]/50 to-transparent rounded-[40px] transform rotate-1 scale-95" />
          <img
            src={showcaseSlides[activeSlide].image}
            alt={showcaseSlides[activeSlide].title}
            className="w-[88%] h-auto object-contain drop-shadow-[0_16px_20px_rgba(0,0,0,0.18)] z-10 transform -rotate-3 transition-transform duration-500 hover:scale-105"
          />
        </motion.div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center space-x-1.5 mt-2">
          {showcaseSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeSlide === idx ? 'w-5 bg-[#D9232D]' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Auth Action Buttons (Matching Image 2) */}
      <div className="space-y-2.5 pb-2">
        {/* 1. Continue with Google */}
        <button
          onClick={onContinueGoogle}
          className="banner-cta-shine group/cta w-full h-12 bg-gradient-to-r from-[#D9232D] via-[#E11D48] to-[#B91822] hover:brightness-105 hover:shadow-[0_8px_20px_rgba(217,35,45,0.38)] active:scale-[0.98] text-white rounded-2xl flex items-center justify-center space-x-3 shadow-[0_4px_14px_rgba(217,35,45,0.3)] transition-all font-semibold text-[14.5px]"
        >
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </div>
          <span>Continue with Google</span>
        </button>

        {/* 2. Continue with Phone */}
        <button
          onClick={onContinuePhone}
          className="w-full h-12 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-900 border border-gray-200 rounded-2xl flex items-center justify-center space-x-3 transition-all font-semibold text-[14.5px] shadow-xs"
        >
          <Phone className="w-4 h-4 text-gray-700" />
          <span>Continue with Phone</span>
        </button>

        {/* 3. Continue with Email */}
        <button
          onClick={onContinueEmail}
          className="w-full h-12 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-900 border border-gray-200 rounded-2xl flex items-center justify-center space-x-3 transition-all font-semibold text-[14.5px] shadow-xs"
        >
          <Mail className="w-4 h-4 text-gray-700" />
          <span>Continue with Email</span>
        </button>

        {/* OR Divider */}
        <div className="flex items-center space-x-3 py-0.5">
          <div className="flex-1 h-[1px] bg-gray-200" />
          <span className="text-[11px] font-bold text-gray-400 tracking-wider">OR</span>
          <div className="flex-1 h-[1px] bg-gray-200" />
        </div>

        {/* 4. Continue as Guest (Matching Image 2) */}
        <button
          onClick={onContinueGuest}
          className="w-full h-12 bg-[#FDECE9] hover:bg-[#FCD8CF] active:scale-[0.98] text-[#D9232D] rounded-2xl flex items-center justify-between px-5 transition-all font-bold text-[14px]"
        >
          <div className="flex items-center space-x-2.5">
            <User className="w-4 h-4 text-[#D9232D]" />
            <span>Continue as Guest</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#D9232D]" />
        </button>

        {/* Terms and Privacy Footer Note */}
        <p className="text-[11px] text-center text-gray-400 pt-1 leading-normal">
          By continuing, you agree to our{' '}
          <button
            onClick={onOpenTerms}
            className="text-[#D9232D] hover:underline font-medium"
          >
            Terms &amp; Conditions
          </button>{' '}
          and{' '}
          <button
            onClick={onOpenPrivacy}
            className="text-[#D9232D] hover:underline font-medium"
          >
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
};
