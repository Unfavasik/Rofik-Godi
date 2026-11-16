import React from 'react';

/**
 * Full-page shimmer skeleton for the Account page (matches AccountView layout:
 * Header, ProfileHeroCard, QuickActionsGrid, ActivityServicesSection, and NeedHelpSection).
 */
export const AccountPageSkeleton: React.FC = () => {
  return (
    <div
      data-testid="account-page-skeleton"
      aria-busy="true"
      aria-label="Loading account"
      className="w-full flex-1 flex flex-col space-y-4 pb-12 text-[#2B1611] bg-[#FFFCF4]"
    >
      {/* Account Page Header Skeleton */}
      <section className="px-4 sm:px-5 pt-4 pb-1 flex justify-between items-center">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-7 w-36 rounded-lg bg-[#E8D8C4]/80" />
          <div className="skeleton-shimmer h-3.5 w-52 rounded-md bg-[#E8D8C4]/60" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-11 w-11 rounded-2xl bg-white border border-[#E8D8C4] shadow-2xs" />
          <div className="skeleton-shimmer h-11 w-11 rounded-2xl bg-white border border-[#E8D8C4] shadow-2xs" />
        </div>
      </section>

      <div className="px-4 space-y-4">
        {/* ProfileHeroCard Skeleton */}
        <section className="relative overflow-hidden rounded-3xl bg-white border border-[#E8D8C4] shadow-[0_10px_30px_-14px_rgba(43,22,17,0.08)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-[#FFF8D6] via-[#FFFDF5] to-transparent"
          />

          <div className="relative p-4 sm:p-5 space-y-3.5">
            {/* Top Row: Avatar + Name + Edit Action */}
            <div className="flex items-center gap-3.5">
              <div className="relative h-[68px] w-[68px] sm:h-[74px] sm:w-[74px] shrink-0 rounded-full p-[2.5px] bg-gradient-to-br from-[#6B352A]/40 via-[#FFF1A6] to-[#E8D8C4]">
                <div className="skeleton-shimmer h-full w-full rounded-full bg-[#FFF8D6] ring-2 ring-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="skeleton-shimmer h-5 w-40 max-w-[80%] rounded-lg bg-[#E8D8C4]/80" />
              </div>

              <div className="skeleton-shimmer h-11 w-11 sm:w-24 shrink-0 rounded-xl bg-[#FAF4EA] border border-[#E8D8C4]" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="skeleton-shimmer h-3.5 w-44 rounded bg-[#E8D8C4]/65" />
              <div className="skeleton-shimmer h-3.5 w-28 rounded bg-[#E8D8C4]/65" />
            </div>

            {/* Completeness Progress Nudge Skeleton */}
            <div className="rounded-2xl bg-[#FAF4EA] border border-[#E8D8C4]/80 px-3.5 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="skeleton-shimmer h-3.5 w-52 max-w-[75%] rounded bg-[#E8D8C4]/75" />
                <div className="skeleton-shimmer h-3.5 w-8 rounded bg-[#FFF1A6]" />
              </div>
              <div className="skeleton-shimmer h-1.5 w-full rounded-full bg-[#E8D8C4]/80" />
            </div>

            {/* My Fitment Garage Sub-Card Skeleton */}
            <div className="rounded-2xl bg-[#FFFCF4] border border-[#E8D8C4] p-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="skeleton-shimmer h-16 w-24 sm:h-[72px] sm:w-28 rounded-xl bg-white border border-[#E8D8C4] shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="skeleton-shimmer h-2.5 w-28 rounded bg-[#E8D8C4]/65" />
                  <div className="skeleton-shimmer h-4 w-44 max-w-[90%] rounded bg-[#E8D8C4]/80" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:shrink-0">
                <div className="skeleton-shimmer h-11 sm:w-24 rounded-xl bg-[#FFF8D6]" />
                <div className="skeleton-shimmer h-11 sm:w-20 rounded-xl bg-white border border-[#E8D8C4]" />
              </div>
            </div>
          </div>

          {/* 3-Column Metrics Footer Skeleton */}
          <div className="grid grid-cols-3 divide-x divide-[#EFE2D2] border-t border-[#EFE2D2] bg-[#FAF4EA]/60">
            {[0, 1, 2].map((col) => (
              <div key={col} className="py-2.5 px-2 flex flex-col items-center justify-center space-y-1.5">
                <div className="skeleton-shimmer h-4 w-10 rounded bg-[#E8D8C4]/80" />
                <div className="skeleton-shimmer h-2.5 w-12 rounded bg-[#E8D8C4]/60" />
              </div>
            ))}
          </div>
        </section>

        {/* QuickActionsGrid Skeleton (2x2) */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="skeleton-shimmer h-4 w-28 rounded bg-[#E8D8C4]/80" />
            <div className="skeleton-shimmer h-3 w-32 rounded bg-[#E8D8C4]/60" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="min-h-14 bg-white rounded-2xl p-3 flex items-center gap-2.5 border border-[#E8D8C4] shadow-2xs"
              >
                <div className="skeleton-shimmer h-9 w-9 rounded-xl bg-[#FAF4EA] shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="skeleton-shimmer h-3.5 w-20 rounded bg-[#E8D8C4]/80" />
                  <div className="skeleton-shimmer h-2.5 w-16 rounded bg-[#E8D8C4]/60" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Activity & Services Grouped List Skeleton */}
        <section className="space-y-2">
          <div className="px-1">
            <div className="skeleton-shimmer h-4 w-36 rounded bg-[#E8D8C4]/80" />
          </div>
          <div className="bg-white rounded-2xl border border-[#E8D8C4] shadow-2xs divide-y divide-[#EFE2D2] overflow-hidden">
            {[0, 1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="w-full min-h-14 px-3.5 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="skeleton-shimmer w-9 h-9 rounded-xl bg-[#FAF4EA] shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="skeleton-shimmer h-3.5 w-32 rounded bg-[#E8D8C4]/80" />
                    <div className="skeleton-shimmer h-2.5 w-44 max-w-[80%] rounded bg-[#E8D8C4]/60" />
                  </div>
                </div>
                <div className="skeleton-shimmer w-4 h-4 rounded bg-[#FAF4EA] shrink-0" />
              </div>
            ))}
          </div>
        </section>

        {/* Need Help Card Skeleton */}
        <section className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <div className="skeleton-shimmer h-4 w-24 rounded bg-[#E8D8C4]/80" />
            <div className="skeleton-shimmer h-3 w-20 rounded bg-[#E8D8C4]/60" />
          </div>
          <div className="bg-white rounded-2xl p-3.5 border border-[#E8D8C4] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="skeleton-shimmer w-10 h-10 rounded-xl bg-[#FAF4EA] shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="skeleton-shimmer h-3.5 w-36 rounded bg-[#E8D8C4]/80" />
                <div className="skeleton-shimmer h-2.5 w-48 max-w-[85%] rounded bg-[#E8D8C4]/60" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="skeleton-shimmer h-10 w-24 rounded-xl bg-[#FAF4EA]" />
              <div className="skeleton-shimmer h-10 w-28 rounded-xl bg-[#FFF8D6]" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

/**
 * Shimmer skeleton for the Rider Profile Editor drawer while profile details are loading.
 */
export const AccountProfileEditorSkeleton: React.FC = () => {
  return (
    <div
      data-testid="account-profile-editor-skeleton"
      aria-busy="true"
      aria-label="Loading profile details"
      className="space-y-3"
    >
      {/* Glassmorphic Rider ID Card Skeleton */}
      <div className="relative overflow-hidden rounded-[22px] border border-[#E8D8C4] bg-gradient-to-br from-[#FFF8D6] via-[#FFFCF4] to-[#F6EAE4] p-3.5 sm:p-4 shadow-[0_10px_28px_-16px_rgba(107,53,42,0.14)] space-y-3">
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer h-15 w-15 sm:h-16 sm:w-16 shrink-0 rounded-full border-2 border-white bg-[#FFF1A6]/70 shadow-sm" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="skeleton-shimmer h-3.5 w-32 rounded-md bg-[#E8D8C4]/80" />
              <div className="skeleton-shimmer h-4.5 w-20 rounded-md bg-[#FFF1A6]" />
            </div>
            <div className="flex flex-wrap gap-1">
              <div className="skeleton-shimmer h-4.5 w-24 rounded-md bg-white/90 border border-[#E8D8C4]" />
              <div className="skeleton-shimmer h-4.5 w-28 rounded-md bg-white/90 border border-[#E8D8C4]" />
            </div>
            <div className="flex gap-1.5 pt-1">
              <div className="skeleton-shimmer h-8 w-24 rounded-lg bg-[#6B352A]/25" />
              <div className="skeleton-shimmer h-8 w-24 rounded-lg bg-white border border-[#E8D8C4]" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5 rounded-xl bg-white/80 px-2.5 py-2 border border-[#E8D8C4]">
          <div className="skeleton-shimmer h-1 w-full rounded-full bg-[#FFF1A6]" />
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((chip) => (
              <div key={chip} className="skeleton-shimmer h-4.5 w-14 rounded-md bg-[#FAF4EA]" />
            ))}
          </div>
        </div>
      </div>

      {/* Personal Details Form Skeleton */}
      <div className="rounded-[22px] border border-[#E8D8C4] bg-white/95 p-3.5 sm:p-4 shadow-[0_6px_22px_-12px_rgba(43,22,17,0.06)] space-y-3">
        <div className="flex items-center justify-between border-b border-[#EFE2D2] pb-2.5">
          <div className="space-y-1">
            <div className="skeleton-shimmer h-3.5 w-28 rounded bg-[#E8D8C4]/80" />
            <div className="skeleton-shimmer h-2.5 w-44 rounded bg-[#E8D8C4]/60" />
          </div>
          <div className="skeleton-shimmer h-7 w-7 rounded-lg bg-[#FFF8D6]" />
        </div>
        {[0, 1, 2].map((field) => (
          <div key={field} className="space-y-1">
            <div className="skeleton-shimmer h-2.5 w-24 rounded bg-[#E8D8C4]/70" />
            <div className="skeleton-shimmer h-9.5 w-full rounded-xl bg-[#FAF4EA]" />
          </div>
        ))}
      </div>

      {/* Vehicle Fitment Garage Card Skeleton */}
      <div className="rounded-[22px] border border-[#E8D8C4] bg-white/95 p-3.5 sm:p-4 shadow-[0_6px_22px_-12px_rgba(43,22,17,0.06)] space-y-3">
        <div className="flex items-center gap-2.5 border-b border-[#EFE2D2] pb-2.5">
          <div className="skeleton-shimmer h-7 w-7 rounded-lg bg-[#FFF8D6] shrink-0" />
          <div className="space-y-1 flex-1">
            <div className="skeleton-shimmer h-3.5 w-36 rounded bg-[#E8D8C4]/80" />
            <div className="skeleton-shimmer h-2.5 w-52 max-w-[85%] rounded bg-[#E8D8C4]/60" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 1, 2, 3, 4].map((pill) => (
            <div key={pill} className="skeleton-shimmer h-8 rounded-lg bg-[#FAF4EA]" />
          ))}
        </div>
        <div className="skeleton-shimmer h-9.5 w-full rounded-xl bg-[#FAF4EA]" />
        <div className="skeleton-shimmer h-9.5 w-full rounded-xl bg-[#FAF4EA]" />
      </div>
    </div>
  );
};

/**
 * Full-page shimmer skeleton for the Settings Hub & sub-pages.
 */
export const SettingsPageSkeleton: React.FC = () => {
  return (
    <div
      data-testid="settings-page-skeleton"
      aria-busy="true"
      aria-label="Loading settings"
      className="w-full flex-1 bg-gradient-to-br from-[#FFFCF4] via-[#FAF3E6] to-[#FFF8D6]/50 min-h-full flex flex-col space-y-4 pb-10"
    >
      <div className="sticky top-0 z-20 border-b border-[#E8D8C4] bg-[#FFFCF4]/95 px-4 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer h-10 w-10 rounded-2xl bg-[#FAF4EA]" />
          <div className="space-y-1.5 flex-1">
            <div className="skeleton-shimmer h-5 w-32 rounded-lg bg-[#E8D8C4]/80" />
            <div className="skeleton-shimmer h-3 w-48 rounded-md bg-[#E8D8C4]/60" />
          </div>
          <div className="skeleton-shimmer h-6 w-20 rounded-full bg-[#FFF8D6]" />
        </div>
      </div>

      <div className="px-4 space-y-5 pt-1">
        {[
          { group: 'Preferences', rows: 3 },
          { group: 'Offers & activity', rows: 4 },
          { group: 'Workshop & support', rows: 2 },
          { group: 'Legal & about', rows: 4 },
        ].map((section) => (
          <div key={section.group} className="space-y-2.5">
            <div className="skeleton-shimmer h-3 w-28 rounded bg-[#E8D8C4]/75 ml-1" />
            <div className="space-y-2">
              {Array.from({ length: section.rows }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-[#E8D8C4] bg-white/95 p-3.5 shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 flex-1">
                    <div className="skeleton-shimmer h-11 w-11 rounded-2xl bg-[#FAF4EA] shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="skeleton-shimmer h-3.5 w-36 rounded bg-[#E8D8C4]/80" />
                      <div className="skeleton-shimmer h-2.5 w-48 max-w-[85%] rounded bg-[#E8D8C4]/60" />
                    </div>
                  </div>
                  <div className="skeleton-shimmer h-4 w-4 rounded bg-[#FAF4EA] shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Ticket-styled shimmer skeleton for the Settings -> Coupons sub-page while offers load.
 */
export const SettingsCouponsSkeleton: React.FC = () => {
  return (
    <div
      data-testid="settings-coupons-skeleton"
      aria-busy="true"
      className="space-y-3"
    >
      <p className="sr-only">Loading active offers…</p>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-2xl border border-[#E6CE73] bg-white/95 p-4 shadow-[0_8px_24px_-12px_rgba(107,53,42,0.08)]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="skeleton-shimmer h-11 w-11 rounded-2xl bg-[#FFF8D6] shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="skeleton-shimmer h-5 w-28 rounded-lg bg-[#FFF1A6]" />
                  <div className="skeleton-shimmer h-4 w-16 rounded-full bg-[#E8D8C4]/70" />
                </div>
                <div className="skeleton-shimmer h-3 w-52 max-w-[90%] rounded bg-[#E8D8C4]/65" />
                <div className="skeleton-shimmer h-2.5 w-32 rounded bg-[#FAF4EA]" />
              </div>
            </div>
            <div className="skeleton-shimmer h-9 w-20 rounded-xl bg-[#FAF4EA] shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Shimmer skeleton for the Saved (Wishlist) drawer/page while items load.
 */
export const WishlistPageSkeleton: React.FC = () => {
  return (
    <div
      data-testid="wishlist-page-skeleton"
      aria-busy="true"
      aria-label="Loading saved items"
      className="space-y-3 py-1"
    >
      <div className="flex gap-2 overflow-hidden pb-1">
        {[0, 1, 2].map((chip) => (
          <div key={chip} className="skeleton-shimmer h-7 w-20 rounded-full bg-[#E8D8C4]/70 shrink-0" />
        ))}
      </div>
      {[0, 1, 2, 3].map((row) => (
        <div
          key={row}
          className="flex gap-3.5 rounded-2xl border border-[#E8D8C4] bg-white/95 p-3.5 shadow-2xs"
        >
          <div className="skeleton-shimmer h-20 w-20 shrink-0 rounded-2xl bg-[#E8D8C4]/75" />
          <div className="flex flex-1 flex-col justify-between space-y-2">
            <div className="space-y-1.5">
              <div className="flex justify-between gap-2">
                <div className="skeleton-shimmer h-4 w-36 rounded bg-[#E8D8C4]/80" />
                <div className="skeleton-shimmer h-6 w-6 rounded-lg bg-[#FAF4EA]" />
              </div>
              <div className="skeleton-shimmer h-3 w-24 rounded-full bg-[#FFF8D6]" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="skeleton-shimmer h-5 w-16 rounded bg-[#E8D8C4]/80" />
              <div className="skeleton-shimmer h-8 w-28 rounded-xl bg-[#FFF1A6]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Shimmer skeleton for the Contact Workshop Team page.
 */
export const ContactSupportPageSkeleton: React.FC = () => {
  return (
    <div
      data-testid="contact-support-page-skeleton"
      aria-busy="true"
      aria-label="Loading contact support"
      className="min-h-dvh w-full flex-1 bg-gradient-to-br from-[#FFFCF4] via-[#FAF3E6] to-[#FFF8D6]/50 pb-10"
    >
      <div className="sticky top-0 z-20 border-b border-[#E8D8C4] bg-[#FFFCF4]/95 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="skeleton-shimmer h-10 w-10 rounded-2xl bg-[#FAF4EA]" />
            <div className="space-y-1.5">
              <div className="skeleton-shimmer h-4 w-44 rounded bg-[#E8D8C4]/80" />
              <div className="skeleton-shimmer h-2.5 w-32 rounded bg-[#E8D8C4]/60" />
            </div>
          </div>
          <div className="skeleton-shimmer h-9 w-28 rounded-xl bg-[#FFF8D6]" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#E6CE73] bg-gradient-to-br from-[#FFF8D6] via-[#FFFCF4] to-[#F6EAE4] p-4 flex items-start gap-3">
            <div className="skeleton-shimmer h-12 w-12 shrink-0 rounded-2xl bg-[#FFF1A6]" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-shimmer h-4 w-36 rounded bg-[#E8D8C4]/80" />
              <div className="skeleton-shimmer h-3 w-full rounded bg-[#E8D8C4]/60" />
              <div className="skeleton-shimmer h-3 w-3/4 rounded bg-[#E8D8C4]/55" />
            </div>
          </div>
          <div className="rounded-3xl border border-[#E8D8C4] bg-white/95 p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((chip) => (
                <div key={chip} className="skeleton-shimmer h-8 w-24 rounded-xl bg-[#FAF4EA]" />
              ))}
            </div>
            <div className="skeleton-shimmer h-11 w-full rounded-xl bg-[#FAF4EA]" />
            <div className="skeleton-shimmer h-11 w-full rounded-xl bg-[#FAF4EA]" />
            <div className="skeleton-shimmer h-28 w-full rounded-xl bg-[#FAF4EA]" />
            <div className="skeleton-shimmer h-12 w-full rounded-xl bg-[#6B352A]/25" />
          </div>
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((card) => (
            <div key={card} className="rounded-2xl border border-[#E8D8C4] bg-white/95 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="skeleton-shimmer h-10 w-10 rounded-xl bg-[#FAF4EA] shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton-shimmer h-3.5 w-32 rounded bg-[#E8D8C4]/80" />
                  <div className="skeleton-shimmer h-2.5 w-24 rounded bg-[#E8D8C4]/60" />
                </div>
              </div>
              <div className="skeleton-shimmer h-7 w-14 rounded-lg bg-[#FAF4EA]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Shimmer skeleton for the ticket list panel inside SupportCenter.
 */
export const SupportTicketListSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      data-testid="support-ticket-list-skeleton"
      aria-busy="true"
      className="space-y-2 p-2.5"
    >
      <span className="sr-only">Loading requests…</span>
      {[0, 1, 2, 3].map((row) => (
        <div
          key={row}
          className="rounded-2xl border border-[#E8D8C4] bg-white/95 p-3.5 space-y-2.5 shadow-2xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="skeleton-shimmer h-4 w-40 max-w-[70%] rounded bg-[#E8D8C4]/80" />
            <div className="skeleton-shimmer h-5 w-16 rounded-full bg-[#FFF8D6]" />
          </div>
          <div className="skeleton-shimmer h-3 w-36 rounded bg-[#E8D8C4]/60" />
          <div className="flex items-center justify-between pt-0.5">
            <div className="skeleton-shimmer h-2.5 w-24 rounded bg-[#FAF4EA]" />
            <div className="skeleton-shimmer h-3 w-3 rounded bg-[#FAF4EA]" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Full-page shimmer skeleton for My Support Requests route-level loading.
 */
export const SupportCenterPageSkeleton: React.FC = () => {
  return (
    <div
      data-testid="support-center-page-skeleton"
      aria-busy="true"
      aria-label="Loading support requests"
      className="min-h-dvh w-full flex-1 bg-gradient-to-br from-[#FFFCF4] via-[#FAF3E6] to-[#FFF8D6]/50 flex flex-col pb-8"
    >
      <div className="border-b border-[#E8D8C4] bg-[#FFFCF4]/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="skeleton-shimmer h-10 w-10 rounded-2xl bg-[#FAF4EA]" />
            <div className="space-y-1.5">
              <div className="skeleton-shimmer h-5 w-32 rounded bg-[#E8D8C4]/80" />
              <div className="skeleton-shimmer h-3 w-52 max-w-[75%] rounded bg-[#E8D8C4]/60" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton-shimmer h-10 w-10 sm:w-24 rounded-xl bg-[#FAF4EA]" />
            <div className="skeleton-shimmer h-10 w-28 rounded-xl bg-[#6B352A]/25" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pt-4 space-y-4">
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3].map((tab) => (
            <div key={tab} className="skeleton-shimmer h-9 w-24 rounded-xl bg-white border border-[#E8D8C4] shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[350px_minmax(0,1fr)]">
          <div className="min-w-0 rounded-3xl border border-[#E8D8C4] bg-white/95 p-2 shadow-2xs">
            <div className="p-2">
              <div className="skeleton-shimmer h-10 w-full rounded-xl bg-[#FAF4EA]" />
            </div>
            <SupportTicketListSkeleton />
          </div>
          <div className="hidden min-w-0 lg:block">
            <SupportConversationSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Shimmer skeleton for the SupportConversation thread while messages load.
 */
export const SupportConversationSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      data-testid="support-conversation-skeleton"
      aria-busy="true"
      className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-3xl border border-[#E8D8C4] bg-white/95 backdrop-blur-md shadow-[0_12px_32px_-16px_rgba(43,22,17,0.08)]"
    >
      <span className="sr-only">Loading conversation…</span>
      <div className="border-b border-[#EFE2D2] px-4 py-3.5 sm:px-5 flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="skeleton-shimmer h-3 w-36 rounded bg-[#FFF8D6]" />
          <div className="skeleton-shimmer h-4 w-56 max-w-[85%] rounded bg-[#E8D8C4]/80" />
          <div className="skeleton-shimmer h-3 w-28 rounded bg-[#FAF4EA]" />
        </div>
        <div className="skeleton-shimmer h-6 w-20 rounded-full bg-[#FAF4EA] shrink-0" />
      </div>

      <div className="flex-1 space-y-4 bg-[#FAF4EA]/60 p-4 sm:p-5">
        <div className="flex justify-start">
          <div className="w-3/4 max-w-sm rounded-2xl rounded-bl-md border border-[#E8D8C4] bg-white p-3.5 space-y-2">
            <div className="skeleton-shimmer h-2.5 w-28 rounded bg-[#E8D8C4]/70" />
            <div className="skeleton-shimmer h-3 w-full rounded bg-[#E8D8C4]/75" />
            <div className="skeleton-shimmer h-3 w-2/3 rounded bg-[#E8D8C4]/60" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="w-2/3 max-w-xs rounded-2xl rounded-br-md bg-[#FFF8D6] p-3.5 space-y-2">
            <div className="skeleton-shimmer h-2.5 w-24 rounded bg-[#E6CE73]/70" />
            <div className="skeleton-shimmer h-3 w-full rounded bg-[#E6CE73]/80" />
          </div>
        </div>
        <div className="flex justify-start">
          <div className="w-3/5 max-w-sm rounded-2xl rounded-bl-md border border-[#E8D8C4] bg-white p-3.5 space-y-2">
            <div className="skeleton-shimmer h-2.5 w-32 rounded bg-[#E8D8C4]/70" />
            <div className="skeleton-shimmer h-3 w-4/5 rounded bg-[#E8D8C4]/75" />
          </div>
        </div>
      </div>

      <div className="border-t border-[#EFE2D2] bg-white p-3.5 sm:p-4 flex items-end gap-2">
        <div className="skeleton-shimmer h-10 w-10 rounded-xl bg-[#FAF4EA] shrink-0" />
        <div className="skeleton-shimmer h-12 flex-1 rounded-xl bg-[#FAF4EA]" />
        <div className="skeleton-shimmer h-10 w-20 rounded-xl bg-[#6B352A]/25 shrink-0" />
      </div>
    </div>
  );
};

/**
 * Shimmer skeleton for CheckoutModal while customer profile and vehicle catalog load.
 */
export const CheckoutPageSkeleton: React.FC<{ label?: string }> = ({
  label = 'Loading your secure account details…',
}) => {
  return (
    <div
      role="status"
      data-testid="checkout-page-skeleton"
      aria-busy="true"
      className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] lg:items-start"
    >
      <span className="sr-only">{label}</span>

      <div className="min-w-0 space-y-4">
        {/* Rider Details Card Skeleton */}
        <div className="rounded-3xl border border-[#E8D8C4] bg-white/95 p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="skeleton-shimmer h-4 w-32 rounded bg-[#E8D8C4]/80" />
            <div className="skeleton-shimmer h-5 w-24 shrink-0 rounded-full bg-[#FFF8D6]" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#FAF4EA] p-3 space-y-1.5">
              <div className="skeleton-shimmer h-2.5 w-16 rounded bg-[#E8D8C4]/65" />
              <div className="skeleton-shimmer h-3.5 w-32 max-w-full rounded bg-[#E8D8C4]/80" />
            </div>
            <div className="rounded-2xl bg-[#FAF4EA] p-3 space-y-1.5">
              <div className="skeleton-shimmer h-2.5 w-16 rounded bg-[#E8D8C4]/65" />
              <div className="skeleton-shimmer h-3.5 w-40 max-w-full rounded bg-[#E8D8C4]/80" />
            </div>
          </div>
          <div className="rounded-2xl border border-[#E8D8C4] p-3 space-y-1.5">
            <div className="skeleton-shimmer h-2.5 w-20 rounded bg-[#E8D8C4]/65" />
            <div className="skeleton-shimmer h-4 w-36 max-w-full rounded bg-[#E8D8C4]/80" />
          </div>
        </div>

        {/* Vehicle Fitment Card Skeleton */}
        <div className="rounded-3xl border border-[#E8D8C4] bg-white/95 p-4 sm:p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 space-y-1.5">
              <div className="skeleton-shimmer h-4 w-36 max-w-full rounded bg-[#E8D8C4]/80" />
              <div className="skeleton-shimmer h-3 w-44 max-w-full rounded bg-[#E8D8C4]/60" />
            </div>
            <div className="skeleton-shimmer h-8 w-24 shrink-0 rounded-xl bg-[#FFF8D6]" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {[0, 1, 2, 3, 4].map((pill) => (
              <div key={pill} className="skeleton-shimmer h-10 rounded-xl bg-[#FAF4EA]" />
            ))}
          </div>
          <div className="skeleton-shimmer h-11 w-full rounded-xl bg-[#FAF4EA]" />
        </div>

        {/* Pickup Schedule Card Skeleton */}
        <div className="rounded-3xl border border-[#E8D8C4] bg-white/95 p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="skeleton-shimmer h-4 w-40 max-w-full rounded bg-[#E8D8C4]/80" />
          <div className="flex max-w-full gap-2 overflow-hidden">
            {[0, 1, 2, 3, 4].map((day) => (
              <div key={day} className="skeleton-shimmer h-14 w-20 shrink-0 rounded-2xl bg-[#FAF4EA]" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((slot) => (
              <div key={slot} className="skeleton-shimmer h-11 rounded-xl bg-[#FAF4EA]" />
            ))}
          </div>
        </div>
      </div>

      {/* Right Sticky Order Summary Skeleton */}
      <div className="min-w-0 rounded-3xl border border-[#E8D8C4] bg-white/95 p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="skeleton-shimmer h-4 w-32 rounded bg-[#E8D8C4]/80" />
          <div className="skeleton-shimmer h-3.5 w-14 rounded bg-[#E8D8C4]/60" />
        </div>
        {[0, 1].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <div className="skeleton-shimmer h-14 w-14 shrink-0 rounded-2xl bg-[#FAF4EA]" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-3.5 w-36 rounded bg-[#E8D8C4]/80" />
              <div className="skeleton-shimmer h-3 w-20 rounded bg-[#FAF4EA]" />
            </div>
            <div className="skeleton-shimmer h-4 w-14 rounded bg-[#E8D8C4]/75" />
          </div>
        ))}
        <div className="border-t border-dashed border-[#E8D8C4] pt-3 space-y-2">
          <div className="flex justify-between">
            <div className="skeleton-shimmer h-3 w-20 rounded bg-[#FAF4EA]" />
            <div className="skeleton-shimmer h-3 w-16 rounded bg-[#E8D8C4]/70" />
          </div>
          <div className="flex justify-between">
            <div className="skeleton-shimmer h-3 w-24 rounded bg-[#FAF4EA]" />
            <div className="skeleton-shimmer h-3 w-12 rounded bg-[#FFF1A6]" />
          </div>
          <div className="flex justify-between pt-2 border-t border-[#EFE2D2]">
            <div className="skeleton-shimmer h-4 w-28 rounded bg-[#E8D8C4]/80" />
            <div className="skeleton-shimmer h-5 w-20 rounded bg-[#FFF1A6]" />
          </div>
        </div>
      </div>
    </div>
  );
};



