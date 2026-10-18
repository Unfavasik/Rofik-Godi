import React from 'react';

export type SkeletonKind = 'text' | 'image' | 'card' | 'list' | 'table' | 'avatar' | 'button';

interface SkeletonProps {
  kind?: SkeletonKind;
  lines?: number;
  count?: number;
  className?: string;
}

const shimmer = 'skeleton-shimmer bg-slate-200/90';

export const Skeleton: React.FC<SkeletonProps> = ({ kind = 'text', lines = 3, count = 3, className = '' }) => {
  if (kind === 'text') {
    return <div className={`space-y-2 ${className}`} aria-hidden="true">{Array.from({ length: lines }, (_, index) => <div key={index} className={`${shimmer} h-3 rounded-full ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />)}</div>;
  }
  if (kind === 'image') return <div className={`${shimmer} aspect-[4/3] w-full rounded-2xl ${className}`} aria-hidden="true" />;
  if (kind === 'avatar') return <div className={`${shimmer} h-11 w-11 shrink-0 rounded-full ${className}`} aria-hidden="true" />;
  if (kind === 'button') return <div className={`${shimmer} h-11 w-full rounded-xl ${className}`} aria-hidden="true" />;
  if (kind === 'list') {
    return <div className={`space-y-3 ${className}`} aria-hidden="true">{Array.from({ length: count }, (_, index) => <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3"><Skeleton kind="avatar" /><div className="min-w-0 flex-1"><div className={`${shimmer} h-3 w-3/4 rounded-full`} /><div className={`${shimmer} mt-2 h-2.5 w-1/2 rounded-full`} /></div><div className={`${shimmer} h-7 w-16 rounded-lg`} /></div>)}</div>;
  }
  if (kind === 'table') {
    return <div className={`space-y-2 ${className}`} aria-hidden="true">{Array.from({ length: count }, (_, index) => <div key={index} className="grid grid-cols-4 gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3"><div className={`${shimmer} h-3 rounded-full`} /><div className={`${shimmer} h-3 rounded-full`} /><div className={`${shimmer} h-3 rounded-full`} /><div className={`${shimmer} h-3 rounded-full`} /></div>)}</div>;
  }
  return <div className={`rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm ${className}`} aria-hidden="true"><div className="flex gap-3"><div className={`${shimmer} h-16 w-16 shrink-0 rounded-xl`} /><div className="flex-1"><div className={`${shimmer} h-3 w-3/4 rounded-full`} /><div className={`${shimmer} mt-2 h-2.5 w-1/2 rounded-full`} /><Skeleton kind="text" lines={2} className="mt-3" /></div></div></div>;
};

export const SkeletonStatus: React.FC<{ label?: string; children: React.ReactNode }> = ({ label = 'Loading content', children }) => (
  <div role="status" aria-label={label}>{children}</div>
);
