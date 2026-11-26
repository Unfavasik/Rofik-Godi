import React, { useState } from 'react';
import { Bike, CarFront, Layers, Tag, Wrench } from 'lucide-react';
import { VehicleCategory } from '../types';
import { useI18n, type TranslationKey } from '../lib/i18n';
import { useStorefrontCategories } from '../lib/supabaseCategories';

import { VIGNETTE_FADE_STAGE_CLASS } from './VignetteBarBackdrop';

// Category keys are usually one of the VehicleCategory values, but admins can
// add custom categories; the extra (string & {}) branch keeps autocomplete
// for the known keys while allowing those custom keys.
export type CategoryFilter = VehicleCategory | 'all' | (string & {});

interface CategorySectionProps {
  selectedCategory: CategoryFilter;
  onSelectCategory: (cat: CategoryFilter) => void;
  vignetteBackdrop?: boolean;
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

const renderCategoryFallbackIcon = (id: string, isActive: boolean, darkSurface = false) => {
  const key = id.toLowerCase();
  const iconClass = `h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors ${
    darkSurface
      ? 'text-white'
      : isActive
        ? 'text-[#D9232D]'
        : 'text-slate-600 group-hover:text-slate-900'
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
  vignetteBackdrop = false,
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
    <section
      className={
        vignetteBackdrop
          ? `relative -mt-px mb-3 px-3.5 pt-3.5 pb-6 sm:px-5 sm:pt-4 sm:pb-7 ${VIGNETTE_FADE_STAGE_CLASS}`
          : 'px-3.5 sm:px-5 mb-4'
      }
      data-purpose="category-list"
    >
      <div className="flex justify-between items-baseline mb-2.5">
        <div>
          <h3
            className={`text-[15px] sm:text-base font-extrabold tracking-tight ${
              vignetteBackdrop ? 'text-white' : 'text-slate-900'
            }`}
          >
            {t('home.shopByCategory')}
          </h3>
          <p
            className={`text-[11.5px] font-medium ${
              vignetteBackdrop ? 'text-white/75' : 'text-slate-500'
            }`}
          >
            {t('home.categoryHint')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`text-[11.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
            vignetteBackdrop
              ? selectedCategory === 'all'
                ? 'text-rose-300 hover:text-white'
                : 'text-white/75 hover:text-white'
              : selectedCategory === 'all'
                ? 'text-[#D9232D]'
                : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>{selectedCategory === 'all' ? t('home.showingAll') : t('home.viewAll')}</span>
          <span aria-hidden="true" className="text-xs">→</span>
        </button>
      </div>

      <div
        className={`grid gap-2 ${
          cards.length <= 4
            ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8'
            : 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8'
        }`}
      >
        {cards.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const trimmedImage = cat.image?.trim() || '';
          const imageKey = `${cat.id}::${trimmedImage}`;
          const hasImageUrl = Boolean(trimmedImage) && !failedImages[imageKey];
          const isImageReady = hasImageUrl && Boolean(loadedImages[imageKey]);

          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectCategory(isActive ? 'all' : cat.id)}
              data-has-category-image={isImageReady ? 'true' : 'false'}
              className={`relative isolate aspect-square w-full overflow-hidden rounded-xl flex flex-col text-center transition-[transform,scale,translate,box-shadow,border-color,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer border group select-none hover:scale-[1.04] hover:-translate-y-0.5 active:scale-[0.96] motion-reduce:transform-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9232D] ${
                isImageReady
                  ? isActive
                    ? 'justify-end border-[#D9232D] ring-2 ring-[#D9232D]/35 shadow-[0_8px_18px_-6px_rgba(217,35,45,0.4)] hover:shadow-[0_12px_24px_-6px_rgba(217,35,45,0.46)]'
                    : vignetteBackdrop
                      ? 'justify-end border-white/30 hover:border-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_10px_20px_-10px_rgba(9,8,8,0.5)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_14px_26px_-10px_rgba(9,8,8,0.62)]'
                      : 'justify-end border-white/60 hover:border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_18px_-10px_rgba(15,23,42,0.26)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_14px_24px_-10px_rgba(15,23,42,0.34)]'
                  : isActive
                    ? vignetteBackdrop
                      ? 'justify-center items-center gap-1 px-1 py-1.5 sm:p-2 bg-[#D9232D]/25 backdrop-blur-xl backdrop-saturate-150 border-[#FF4D58] ring-2 ring-[#D9232D]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_18px_-8px_rgba(217,35,45,0.45)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_22px_-8px_rgba(217,35,45,0.55)]'
                      : 'justify-center items-center gap-1 px-1 py-1.5 sm:p-2 bg-gradient-to-b from-rose-50/90 to-rose-100/75 backdrop-blur-xl backdrop-saturate-150 border-[#D9232D] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_16px_-6px_rgba(217,35,45,0.24)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_22px_-6px_rgba(217,35,45,0.3)]'
                    : vignetteBackdrop
                      ? 'justify-center items-center gap-1 px-1 py-1.5 sm:p-2 bg-white/14 hover:bg-white/22 backdrop-blur-xl backdrop-saturate-150 border-white/25 hover:border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_20px_-10px_rgba(9,8,8,0.45)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_14px_24px_-10px_rgba(9,8,8,0.55)]'
                      : 'justify-center items-center gap-1 px-1 py-1.5 sm:p-2 bg-gradient-to-b from-white/88 to-slate-100/75 hover:to-slate-100/95 backdrop-blur-xl backdrop-saturate-150 border-slate-200/85 hover:border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_16px_-10px_rgba(15,23,42,0.14)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_10px_22px_-10px_rgba(15,23,42,0.22)]'
              }`}
            >
              {hasImageUrl && (
                <img
                  src={trimmedImage}
                  alt={cat.title}
                  referrerPolicy="no-referrer"
                  ref={(el) => {
                    if (el && el.complete && el.naturalWidth > 0 && !loadedImages[imageKey]) {
                      queueMicrotask(() => {
                        setLoadedImages((prev) => (prev[imageKey] ? prev : { ...prev, [imageKey]: true }));
                      });
                    }
                  }}
                  onLoad={() =>
                    setLoadedImages((prev) => (prev[imageKey] ? prev : { ...prev, [imageKey]: true }))
                  }
                  onError={() =>
                    setFailedImages((prev) => (prev[imageKey] ? prev : { ...prev, [imageKey]: true }))
                  }
                  className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-center transition-all duration-300 ease-out group-hover:scale-105 ${
                    isImageReady ? 'opacity-100' : 'opacity-0'
                  }`}
                  loading="eager"
                  decoding="async"
                />
              )}

              {isImageReady ? (
                <>
                  {/* Specular glass reflection + measured contrast scrim for full-bleed admin photo */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.03)_34%,rgba(9,8,8,0.12)_60%,rgba(9,8,8,0.68)_100%)] ring-1 ring-inset ring-white/25 rounded-xl"
                  />
                  <div
                    className={`relative z-10 w-full px-1 py-1 sm:px-1.5 sm:py-1 backdrop-blur-md backdrop-saturate-150 border-t transition-colors ${
                      isActive
                        ? 'bg-[#D9232D]/85 border-white/35'
                        : 'bg-[#0B0A0C]/48 border-white/20 group-hover:bg-[#0B0A0C]/58'
                    }`}
                  >
                    <span className="line-clamp-2 block text-[9.5px] sm:text-[10.5px] font-bold leading-[1.15] text-center break-words text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                      {cat.title}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border backdrop-blur-md transition-transform duration-200 group-hover:scale-105 ${
                      vignetteBackdrop
                        ? isActive
                          ? 'bg-white/25 border-white/35 text-white'
                          : 'bg-white/16 border-white/25 text-white group-hover:bg-white/24'
                        : isActive
                          ? 'bg-rose-100/80 border-rose-200/80'
                          : 'bg-white/80 border-slate-200/70 group-hover:bg-white'
                    }`}
                  >
                    {renderCategoryFallbackIcon(cat.id, isActive, vignetteBackdrop)}
                  </div>

                  <span
                    className={`relative z-10 line-clamp-2 text-[9.5px] sm:text-[10.5px] font-bold leading-[1.15] text-center break-words w-full px-0.5 transition-colors ${
                      vignetteBackdrop
                        ? 'text-white'
                        : isActive
                          ? 'text-[#D9232D]'
                          : 'text-slate-800 group-hover:text-slate-950'
                    }`}
                  >
                    {cat.title}
                  </span>

                  {isActive && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full ${
                        vignetteBackdrop ? 'bg-white' : 'bg-[#D9232D]'
                      }`}
                    />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
