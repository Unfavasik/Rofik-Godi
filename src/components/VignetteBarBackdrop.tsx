import React from 'react';
import topbarVignetteBg from '../assets/images/topbar_vignette_blur_bg_1795611325931.jpg';

export const VIGNETTE_FADE_STAGE_CLASS =
  'bg-[linear-gradient(180deg,#090808_0%,#0C0B0C_16%,#201F22_36%,#5F5E64_58%,#BCBCC2_78%,#EAEAEF_90%,#FDFDFD_100%)]';

export const VIGNETTE_FADE_STAGE_SOFT_CLASS =
  'bg-[linear-gradient(180deg,#090808_0%,#0E0D0E_16%,#28272B_38%,#74747A_62%,#CFCFD4_82%,#F8FAFC_100%)]';

interface VignetteBarBackdropProps {
  /** 'top' fades smoothly to #090808 at the bottom edge; 'bottom' places the soft ambient glow near the bottom bar center. */
  variant?: 'top' | 'bottom';
}

export const VignetteBarBackdrop: React.FC<VignetteBarBackdropProps> = ({ variant = 'top' }) => {
  const isBottom = variant === 'bottom';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#090808]"
    >
      <div
        style={{
          backgroundImage: `url(${topbarVignetteBg})`,
          backgroundPosition: isBottom ? '50% 72%' : '50% 26%',
        }}
        className="h-full w-full bg-cover bg-no-repeat scale-[1.45] blur-[32px] brightness-[0.88] saturate-[1.2]"
      />
      <div
        className={`absolute inset-0 ${
          isBottom
            ? 'bg-[radial-gradient(ellipse_85%_95%_at_50%_88%,rgba(36,27,20,0.16)_0%,rgba(16,13,11,0.62)_62%,rgba(9,8,8,0.94)_100%)]'
            : 'bg-[radial-gradient(ellipse_85%_90%_at_50%_15%,rgba(34,26,20,0.12)_0%,rgba(16,13,11,0.58)_62%,rgba(9,8,8,0.92)_100%)]'
        }`}
      />
      <div
        className={`absolute inset-0 ${
          isBottom
            ? 'bg-gradient-to-t from-black/20 via-black/22 via-60% to-[#090808]/95'
            : 'bg-gradient-to-b from-black/22 via-black/18 via-58% to-[#090808]'
        }`}
      />
    </div>
  );
};

interface VignettePageCurtainProps {
  /** Optional height/positioning override. Defaults to a silky 220px-260px Edge-to-Edge dissolve. */
  className?: string;
}

/**
 * Edge-to-Edge seamless dark-to-transparent vignette curtain placed directly below
 * any dark vignette top bar so every page melts smoothly into its light canvas.
 */
export const VignettePageCurtain: React.FC<VignettePageCurtainProps> = ({
  className = 'h-[210px] sm:h-[240px]',
}) => (
  <div
    aria-hidden="true"
    className={`absolute top-0 inset-x-0 pointer-events-none -mt-px z-0 bg-[linear-gradient(180deg,#090808_0%,#0B0A0B_14%,#1A191C_30%,#434247_48%,#8A8A90_66%,#D1D1D6_82%,#F1F1F4_92%,rgba(255,255,255,0)_100%)] ${className}`}
  />
);
