import React from 'react';
import { VehicleCategory } from '../types';
import { motion } from 'motion/react';

interface CategorySectionProps {
  selectedCategory: VehicleCategory | 'all';
  onSelectCategory: (cat: VehicleCategory | 'all') => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories = [
    {
      id: 'bike' as VehicleCategory,
      title: 'Bike Covers',
      count: '30+ Models',
      bgClass: 'bg-[#FFF1F1]/80 hover:bg-[#FFE8E8]',
      activeBgClass: 'ring-2 ring-[#D9232D] bg-[#FFE8E8]',
      buttonBg: 'bg-[#FEE2E2]',
      buttonText: 'text-[#D9232D]',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzTHkKzZX3hEhUBbabXIUneCj4SbDLyVsoF5AC3mdG30c9fCfPXqTgtBkXXWSD-RQBMK9hGQ7z84-5HlSRv8pNH-4-nhZsrWMMJUF69Mc1C6yg3hIwq74HgmiQK54CCZs4pxtjnZHbNYGDr2Fr3XmUg5eQWe2mID_3rZrHE3_63rpzsGPmT3YgGkE0N8MSSMBr0lyBJaJ31aqCyTuF8-Gp68q6FO8TI5qD0duMd8hT-Do-pGwNJO4E',
    },
    {
      id: 'toto' as VehicleCategory,
      title: 'Toto Covers',
      count: 'Commercial Sets',
      bgClass: 'bg-[#EBFBF3]/90 hover:bg-[#E2F7EC]',
      activeBgClass: 'ring-2 ring-[#059669] bg-[#E2F7EC]',
      buttonBg: 'bg-[#D1FAE5]',
      buttonText: 'text-[#059669]',
      isEmoji: true,
      emoji: '🛺',
    },
    {
      id: 'cushion' as VehicleCategory,
      title: 'Cushions',
      count: 'Gel & Air Mesh',
      bgClass: 'bg-[#EEF6FF]/90 hover:bg-[#E3EFFF]',
      activeBgClass: 'ring-2 ring-[#2563EB] bg-[#E3EFFF]',
      buttonBg: 'bg-[#DBEAFE]',
      buttonText: 'text-[#2563EB]',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXb-sDFoKe1hr9HZ8QJS-_Y5MZ1Vskn9GUIw74w5kxFEuO81OX2Th9U7J6vhCVUbMO8NeRulf7EghBpWwi6Uatj7ddzbViVQp2nUm085zPoLKcg4PntDCTe4HR7WVT_0GkQEbniLuknwt-Mjid1ejdW48pt2W1od3QWLE8inEBJzqRf534dmczQPBref_y-l3kgLfK7YxZvv1PwkaC8jDn5nehOFP2ilvgTCOdvFgFatyqcBXNjqa6',
    },
    {
      id: 'accessory' as VehicleCategory,
      title: 'Accessories',
      count: 'Rain & Care',
      bgClass: 'bg-[#FFF8E7]/90 hover:bg-[#FEF1D4]',
      activeBgClass: 'ring-2 ring-[#D97706] bg-[#FEF1D4]',
      buttonBg: 'bg-[#FEF3C7]',
      buttonText: 'text-[#D97706]',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuO4XQdWqc-kUg5IUB_VTmVBLmMffKdds2ZTy87k3Q0B82ZVYRWuPT_c9mSYEek1eHo2Sip9Dp2NaKTxuLDQBUS6iAyj3rtQER7qjJUJ37nUu1XeKuAsc92EV_q-JKRWEGgEYwUdbhyfDpXh1mFd9IcEynUgyVmv4GHF9jYMx4Qk-PLD_IKADWXzmxQwe1QmF4qADxPyZOl4yjS3YLSSnALZgy-cuhWWSWFV8X9Ie_mMD4wYO96lxe',
    },
  ];

  return (
    <section className="px-5 mb-6" data-purpose="category-list">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <h3 className="text-[17px] font-black text-gray-900 tracking-tight">Shop by category</h3>
          <p className="text-[11.5px] text-gray-400 font-medium">Find the right fit for your ride</p>
        </div>
        <button
          onClick={() => onSelectCategory('all')}
          className={`text-[12px] font-bold flex items-center space-x-1 transition-colors ${
            selectedCategory === 'all' ? 'text-[#D9232D]' : 'text-gray-500 hover:text-[#D9232D]'
          }`}
        >
          <span>{selectedCategory === 'all' ? 'Showing all' : 'View all'}</span>
          <span className="text-xs">→</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(isActive ? 'all' : cat.id)}
              className={`w-full rounded-2xl p-2 sm:p-2.5 pb-2.5 flex flex-col items-center justify-between text-center transition-all cursor-pointer shadow-xs group select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                isActive ? cat.activeBgClass : cat.bgClass
              }`}
            >
              <div className="h-10 sm:h-12 w-full flex items-center justify-center mb-1">
                {cat.isEmoji ? (
                  <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl filter drop-shadow-xs group-hover:scale-110 transition-transform">
                      {cat.emoji}
                    </span>
                  </div>
                ) : (
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-lg drop-shadow-xs group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                )}
              </div>

              <span className="text-[10px] sm:text-[11px] font-bold text-gray-900 leading-tight mb-1.5 text-center break-words w-full px-0.5">
                {cat.title}
              </span>

              <div
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-transform ${cat.buttonBg} ${cat.buttonText} ${
                  isActive ? 'scale-110 ring-1 ring-white' : ''
                }`}
              >
                <span className="text-[10px] sm:text-[11px] font-bold leading-none">{isActive ? '✓' : '→'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
