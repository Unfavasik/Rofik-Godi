import React from 'react';
import { AlertCircle, PackageSearch, RotateCw } from 'lucide-react';
import { CloudLoader } from './CloudLoader';

export type CatalogStatusKind = 'loading' | 'error' | 'empty';

interface CatalogStatusProps {
  state: CatalogStatusKind;
  onRetry?: () => void;
  compact?: boolean;
}

export const CatalogStatus: React.FC<CatalogStatusProps> = ({ state, onRetry, compact = false }) => {
  const spacing = compact ? 'px-4 py-5' : 'px-6 py-10';
  const baseClass = `w-full rounded-2xl border border-[#E8D8C4] bg-white text-center shadow-xs ${spacing}`;

  if (state === 'loading') {
    return (
      <div className={baseClass} role="status" aria-live="polite">
        <CloudLoader label="Loading products…" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={baseClass} role="alert" aria-live="assertive">
        <AlertCircle className="mx-auto h-7 w-7 text-[#9A4D16]" aria-hidden="true" />
        <h2 className="mt-3 text-base font-bold text-[#2B1611]">Couldn’t load the product catalog</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[#6B4C44]">
          Check your connection and try again. Your account and saved data are not affected.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#6B352A] px-4 py-2 text-sm font-bold text-[#FFFCF4] transition-colors hover:bg-[#53271E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B352A] focus-visible:ring-offset-2 cursor-pointer"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={baseClass} role="status" aria-live="polite">
      <PackageSearch className="mx-auto h-7 w-7 text-[#8A6C63]" aria-hidden="true" />
      <h2 className="mt-3 text-base font-bold text-[#2B1611]">No active products yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[#6B4C44]">
        New products will appear here once they’re published.
      </p>
    </div>
  );
};
