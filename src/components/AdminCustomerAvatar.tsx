import React, { useState } from 'react';

interface AdminCustomerAvatarProps {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  className?: string;
  textClassName?: string;
}

export const AdminCustomerAvatar: React.FC<AdminCustomerAvatarProps> = ({
  name,
  initials,
  avatarUrl,
  className = 'h-11 w-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-2xs',
  textClassName = 'font-mono text-xs font-black',
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const cleanUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  const showImage = Boolean(cleanUrl && failedUrl !== cleanUrl);

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden select-none ${className}`}
    >
      <span aria-hidden="true" className={textClassName}>
        {initials || 'RG'}
      </span>
      {showImage && (
        <img
          src={cleanUrl}
          alt={`${name || 'Customer'} avatar`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(cleanUrl)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
};
