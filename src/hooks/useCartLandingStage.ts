import { useEffect, useRef, useState } from 'react';
import {
  CART_ARC_LANDED_EVENT,
  CART_STAGING_FOCUS_MS,
} from '../lib/motionChoreography';

export function useCartLandingStage() {
  const [stagePulse, setStagePulse] = useState(0);
  const [isStaged, setIsStaged] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleLanded = () => {
      setStagePulse((count) => count + 1);
      setIsStaged(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsStaged(false);
        timerRef.current = null;
      }, CART_STAGING_FOCUS_MS);
    };

    window.addEventListener(CART_ARC_LANDED_EVENT, handleLanded);
    return () => {
      window.removeEventListener(CART_ARC_LANDED_EVENT, handleLanded);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { stagePulse, isStaged };
}
