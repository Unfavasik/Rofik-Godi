import React from 'react';
import { Tag } from 'lucide-react';
import { VehicleCategory } from '../types';
import { useI18n, type TranslationKey } from '../lib/i18n';
import { useStorefrontCategories } from '../lib/supabaseCategories';

// Category keys are usually one of the VehicleCategory values, but admins can
// add custom categories; the extra (string & {}) branch keeps autocomplete
// for the known keys while allowing those custom keys.
export type CategoryFilter = VehicleCategory | 'all' | (string & {});

interface CategorySectionProps {
  selectedCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
}

const SCHEMES = [
  { bgClass: 'bg-[#FFF1F1]/80 hover:bg-[#FFE8E8]', activeBgClass: 'ring-2 ring-[#D9232D] bg-[#FFE8E8]', buttonBg: 'bg-[#FEE2E2]', buttonText: 'text-[#D9232D]' },
  { bgClass: 'bg-[#EBFBF3]/90 hover:bg-[#E2F7EC]', activeBgClass: 'ring-2 ring-[#059669] bg-[#E2F7EC]', buttonBg: 'bg-[#D1FAE5]', buttonText: 'text-[#059669]' },
  { bgClass: 'bg-[#EEF6FF]/90 hover:bg-[#E3EFFF]', activeBgClass: 'ring-2 ring-[#2563EB] bg-[#E3EFFF]', buttonBg: 'bg-[#DBEAFE]', buttonText: 'text-[#2563EB]' },
  { bgClass: 'bg-[#FFF8E7]/90 hover:bg-[#FEF1D4]', activeBgClass: 'ring-2 ring-[#D97706] bg-[#FEF1D4]', buttonBg: 'bg-[#FEF3C7]', buttonText: 'text-[#D97706]' },
];

type CategoryCard = {
  id: string;
  title: string;
  image: string;
  scheme: (typeof SCHEMES)[number];
};

const FALLBACK_CATEGORIES: Array<{ id: VehicleCategory; titleKey: TranslationKey; image?: string }> = [
  {
    id: 'bike',
    titleKey: 'home.bikeCovers',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzTHkKzZX3hEhUBbabXIUneCj4SbDLyVsoF5AC3mdG30c9fCfPXqTgtBkXXWSD-RQBMK9hGQ7z84-5HlSRv8pNH-4-nhZsrWMMJUF69Mc1C6yg3hIwq74HgmiQK54CCZs4pxtjnZHbNYGDr2Fr3XmUg5eQWe2mID_3rZrHE3_63rpzsGPmT3YgGkE0N8MSSMBr0lyBJaJ31aqCyTuF8-Gp68q6FO8TI5qD0duMd8hT-Do-pGwNJO4E',
  },
  { id: 'toto', titleKey: 'home.totoCovers' },
  {
    id: 'cushion',
    titleKey: 'home.cushions',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXb-sDFoKe1hr9HZ8QJS-_Y5MZ1Vskn9GUIw74w5kxFEuO81OX2Th9U7J6vhCVUbMO8NeRulf7EghBpWwi6Uatj7ddzbViVQp2nUm085zPoLKcg4PntDCTe4HR7WVT_0GkQEbniLuknwt-Mjid1ejdW48pt2W1od3QWLE8inEBJzqRf534dmczQPBref_y-l3kgLfK7YxZvv1PwkaC8jDn5nehOFP2ilvgTCOdvFgFatyqcBXNjqa6',
  },
  {
    id: 'accessory',
    titleKey: 'home.accessories',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuO4XQdWqc-kUg5IUB_VTmVBLmMffKdds2ZTy87k3Q0B82ZVYRWuPT_c9mSYEek1eHo2Sip9Dp2NaKTxuLDQBUS6iAyj3rtQER7qjJUJ37nUu1XeKuAsc92EV_q-JKRWEGgEYwUdbhyfDpXh1mFd9IcEynUgyVmv4GHF9jYMx4Qk-PLD_IKADWXzmxQwe1QmF4qADxPyZOl4yjS3YLSSnALZgy-cuhWWSWFV8X9Ie_mMD4wYO96lxe',
  },
];

export const CategorySection: React.FC<CategorySectionProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { t } = useI18n();
  const { categories: stored, ready } = useStorefrontCategories();

  const cards: CategoryCard[] = ready
    ? stored.map((category, index) => ({
        id: category.key,
        title: category.name,
        image: category.image,
        scheme: SCHEMES[index % SCHEMES.length],
      }))
    : FALLBACK_CATEGORIES.map((category, index) => ({
        id: category.id,
        title: t(category.titleKey),
        image: category.image || '',
        scheme: SCHEMES[index % SCHEMES.length],
      }));

  return (
    <section className="px-3.5 sm:px-5 mb-4" data-purpose="category-list">
      <div className="flex justify-between items-baseline mb-2">
        <div>
          <h3 className="text-[15px] sm:text-base font-black text-gray-900 tracking-tight">{t('home.shopByCategory')}</h3>
          <p className="text-[11px] text-gray-400 font-medium">{t('home.categoryHint')}</p>
        </div>
        <button
          onClick={() => onSelectCategory('all')}
          className={`text-[11.5px] font-bold flex items-center space-x-1 transition-colors ${
            selectedCategory === 'all' ? 'text-[#D9232D]' : 'text-gray-500 hover:text-[#D9232D]'
          }`}
        >
          <span>{selectedCategory === 'all' ? t('home.showingAll') : t('home.viewAll')}</span>
          <span className="text-xs">→</span>
        </button>
      </div>

      <div className={`grid gap-2 ${cards.length <= 4 ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'}`}>
        {cards.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(isActive ? 'all' : cat.id)}
              className={`w-full rounded-xl p-1.5 sm:p-2 pb-2 flex flex-col items-center justify-between text-center transition-all cursor-pointer shadow-xs group select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                isActive ? cat.scheme.activeBgClass : cat.scheme.bgClass
              }`}
            >
              <div className="mb-1 flex h-10 w-full items-center justify-center sm:h-12">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="h-9 w-9 object-contain rounded-lg drop-shadow-xs transition-transform group-hover:scale-105 sm:h-11 sm:w-11"
                    loading="lazy"
                  />
                ) : (
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${cat.scheme.buttonBg} transition-transform group-hover:scale-105 sm:h-11 sm:w-11`}>
                    <Tag className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${cat.scheme.buttonText}`} />
                  </span>
                )}
              </div>

              <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-900 leading-tight mb-1 text-center break-words w-full px-0.5">
                {cat.title}
              </span>

              <div
                className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center transition-transform ${cat.scheme.buttonBg} ${cat.scheme.buttonText} ${
                  isActive ? 'scale-110 ring-1 ring-white' : ''
                }`}
              >
                <span className="text-[9.5px] sm:text-[10px] font-bold leading-none">{isActive ? '✓' : '→'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
