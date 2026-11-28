export interface AppUpdateSheetMotion {
  enabled: boolean;
  backdropInitial: { opacity: number } | false;
  backdropAnimate: { opacity: number };
  backdropExit: { opacity: number };
  sheetInitial: { opacity: number; y: number; scale: number } | false;
  sheetAnimate: { opacity: number; y: number; scale: number };
  sheetExit: { opacity: number; y: number; scale: number };
  haloAnimate: { scale: number[]; opacity: number[] };
  emblemAnimate: { y: number[]; rotate: number[] };
  arrowAnimate: { y: number[] };
  getNoteInitial: (index: number) => { opacity: number; x: number } | false;
  getNoteDelay: (index: number) => number;
}

export function getAppUpdateSheetMotion(reducedMotion: boolean): AppUpdateSheetMotion {
  if (reducedMotion) {
    return {
      enabled: false,
      backdropInitial: false,
      backdropAnimate: { opacity: 1 },
      backdropExit: { opacity: 0 },
      sheetInitial: false,
      sheetAnimate: { opacity: 1, y: 0, scale: 1 },
      sheetExit: { opacity: 0, y: 0, scale: 1 },
      haloAnimate: { scale: [1], opacity: [0.22] },
      emblemAnimate: { y: [0], rotate: [0] },
      arrowAnimate: { y: [0] },
      getNoteInitial: () => false,
      getNoteDelay: () => 0,
    };
  }

  return {
    enabled: true,
    backdropInitial: { opacity: 0 },
    backdropAnimate: { opacity: 1 },
    backdropExit: { opacity: 0 },
    sheetInitial: { opacity: 0, y: 44, scale: 0.96 },
    sheetAnimate: { opacity: 1, y: 0, scale: 1 },
    sheetExit: { opacity: 0, y: 32, scale: 0.97 },
    haloAnimate: { scale: [0.96, 1.12, 0.96], opacity: [0.22, 0.45, 0.22] },
    emblemAnimate: { y: [0, -3.5, 0], rotate: [0, -2, 1.5, 0] },
    arrowAnimate: { y: [0, 2, 0] },
    getNoteInitial: () => ({ opacity: 0, x: -8 }),
    getNoteDelay: (index: number) => Math.min(0.32, 0.1 + index * 0.05),
  };
}

export interface SettingsUpdateCardMotion {
  enabled: boolean;
  cardInitial: { opacity: number; y: number; scale: number } | false;
  cardAnimate: { opacity: number; y: number; scale: number };
  haloAnimate: { scale: number[]; opacity: number[] };
  ringAnimate: { scale: number[]; opacity: number[] };
  emblemAnimate: { y: number[]; rotate: number[] };
  arrowAnimate: { y: number[] };
  getNoteInitial: (index: number) => { opacity: number; x: number } | false;
  getNoteDelay: (index: number) => number;
}

export function getSettingsUpdateCardMotion(reducedMotion: boolean): SettingsUpdateCardMotion {
  if (reducedMotion) {
    return {
      enabled: false,
      cardInitial: false,
      cardAnimate: { opacity: 1, y: 0, scale: 1 },
      haloAnimate: { scale: [1], opacity: [0.16] },
      ringAnimate: { scale: [1], opacity: [0] },
      emblemAnimate: { y: [0], rotate: [0] },
      arrowAnimate: { y: [0] },
      getNoteInitial: () => false,
      getNoteDelay: () => 0,
    };
  }

  return {
    enabled: true,
    cardInitial: { opacity: 0, y: 14, scale: 0.985 },
    cardAnimate: { opacity: 1, y: 0, scale: 1 },
    haloAnimate: { scale: [0.94, 1.14, 0.94], opacity: [0.16, 0.34, 0.16] },
    ringAnimate: { scale: [0.92, 1.38], opacity: [0.42, 0] },
    emblemAnimate: { y: [0, -2.5, 0], rotate: [0, -2, 1.5, 0] },
    arrowAnimate: { y: [0, 2, 0] },
    getNoteInitial: () => ({ opacity: 0, x: -6 }),
    getNoteDelay: (index: number) => Math.min(0.28, 0.08 + index * 0.06),
  };
}
