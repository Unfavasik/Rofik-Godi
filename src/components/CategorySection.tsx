import React, { useState } from 'react';
import { Bike, CarFront, Layers, Tag, Wrench } from 'lucide-react';
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

type CategoryCard = {
  id: string;
  title: string;
  image: string;
};

const FALLBACK_CATEGORIES: Array<{ id: VehicleCategory; titleKey: TranslationKey }> = [
  { id: 'bike', titleKey: 'home.bikeCovers' },
  { id: 'toto', titleKey: 'home.totoCovers' },
  { id: 'cushion', titleKey: 'home.cushions' },
  { id: 'accessory', titleKey: 'home.accessories' },
];

const renderCategoryFallbackIcon = (id: string, isActive: boolean) => {
  const key = id.toLowerCase();
  const iconClass = `h-4.5 w-4.5 sm:h-5 sm:w-5 transition-colors ${
    isActive ? 'text-[#D9232D]' : 'text-slate-600 group-hover:text-slate-900'
  }`;

  if (key.includes('bike') || key.includes('scoot')) {
    return <Bike className={iconClass} aria-hidden="true" />;
  }
  if (key.includes('toto') || key.includes('rickshaw') || key.includes('car')) {
    return <CarFront className={iconClass} aria-hidden="true" />;
  }
  if (key.includes('cushion') || key.includes('gel') || key.includes('foam')) {
    return <Layers className={iconClass} aria-hidden="true" />;
  }
  if (key.includes('accessor') || key.includes('care') || key.includes('tool')) {
    return <Wrench className={iconClass} aria-hidden="true" />;
  }
  return <Tag className={iconClass} aria-hidden="true" />;
};

export const CategorySection: React.FC<CategorySectionProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { t } = useI18n();
  const { categories: stored, ready } = useStorefrontCategories();
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const cards: CategoryCard[] = ready
    ? stored.map((category) => ({
        id: category.key,
        title: category.name,
        image: category.image,
      }))
    : FALLBACK_CATEGORIES.map((category) => ({
        id: category.id,
        title: t(category.titleKey),
        image: '',
      }));

  return (
    <section className="px-3.5 sm:px-5 mb-4" data-purpose="category-list">
      <div className="flex justify-between items-baseline mb-2.5">
        <div>
          <h3 className="text-[15px] sm:text-base font-extrabold text-slate-900 tracking-tight">
            {t('home.shopByCategory')}
          </h3>
          <p className="text-[11.5px] text-slate-500 font-medium">{t('home.categoryHint')}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`text-[11.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
            selectedCategory === 'all' ? 'text-[#D9232D]' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>{selectedCategory === 'all' ? t('home.showingAll') : t('home.viewAll')}</span>
          <span aria-hidden="true" className="text-xs">→</span>
        </button>
      </div>

      <div className={`grid gap-2 ${cards.length <= 4 ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'}`}>
        {cards.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const hasImageUrl = Boolean(cat.image?.trim()) && !failedImages[cat.id];
          const isImageReady = hasImageUrl && Boolean(loadedImages[cat.id]);

          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectCategory(isActive ? 'all' : cat.id)}
              className={`relative w-full rounded-xl px-1.5 py-2.5 sm:p-2.5 flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer border group select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                isActive
                  ? 'bg-rose-50/55 border-[#D9232D] shadow-[0_2px_8px_rgba(217,35,45,0.08)]'
                  : 'bg-white border-slate-200/85 hover:border-slate-300 hover:bg-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
              }`}
            >
              <div
                className={`relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg overflow-hidden transition-colors ${
                  isImageReady
                    ? 'bg-slate-50/90 p-1'
                    : isActive
                      ? 'bg-rose-100/75'
                      : 'bg-slate-100/85 group-hover:bg-slate-200/70'
                }`}
              >
                {!isImageReady && renderCategoryFallbackIcon(cat.id, isActive)}
                {hasImageUrl && (
                  <img
                    src={cat.image}
                    alt={cat.title}
                    onLoad={() =>
                      setLoadedImages((prev) => (prev[cat.id] ? prev : { ...prev, [cat.id]: true }))
                    }
                    onError={() =>
                      setFailedImages((prev) => (prev[cat.id] ? prev : { ...prev, [cat.id]: true }))
                    }
                    className={`h-full w-full object-contain transition-all duration-200 group-hover:scale-105 ${
                      isImageReady ? 'opacity-100' : 'absolute inset-0 opacity-0 pointer-events-none'
                    }`}
                    loading="lazy"
                  />
                )}
              </div>

              <span
                className={`text-[10.5px] sm:text-[11px] font-bold leading-tight text-center break-words w-full px-0.5 transition-colors ${
                  isActive ? 'text-[#D9232D]' : 'text-slate-800 group-hover:text-slate-950'
                }`}
              >
                {cat.title}
              </span>

              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-[#D9232D]"
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
