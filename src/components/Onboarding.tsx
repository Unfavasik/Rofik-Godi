/**
 * Onboarding.tsx — 3-screen intro (swipe / Next / Skip / dots)
 * Stack: React 19 + TypeScript + Tailwind CSS (no extra packages)
 *
 * Files:
 *   src/components/Onboarding.tsx
 *   src/assets/onboarding/slide-1.svg | slide-2.svg | slide-3.svg
 *
 * Optional font (index.html <head>):
 *   <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
 *
 * Usage (App.tsx):
 *   const [seen, setSeen] = useState(() => localStorage.getItem("onboarded") === "1");
 *   if (!seen) return <Onboarding onFinish={() => { localStorage.setItem("onboarded", "1"); setSeen(true); }} />;
 */
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import slide1 from "../assets/onboarding/slide-1.svg";
import slide2 from "../assets/onboarding/slide-2.svg";
import slide3 from "../assets/onboarding/slide-3.svg";

type Slide = { image: string; alt: string; title: string; text: string; cta: string };

const SLIDES: Slide[] = [
  {
    image: slide1,
    alt: "Boy on a scooter browsing seat covers on his phone",
    title: "Find the Perfect Seat Cover",
    text: "Explore premium seat covers for bikes and totos with ease.",
    cta: "Get Started",
  },
  {
    image: slide2,
    alt: "Boy pointing at different seat cover designs",
    title: "View Different Designs",
    text: "Check various seat cover designs, colors and materials.",
    cta: "Next",
  },
  {
    image: slide3,
    alt: "Boy giving a thumbs up beside a quilted seat cover",
    title: "Reliable Quality & Service",
    text: "Get durable seat covers with the best quality and support.",
    cta: "Start Now",
  },
];

const EASE =
  "transition-transform duration-[450ms] ease-[cubic-bezier(.22,.8,.24,1)] motion-reduce:transition-none";

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

type Props = { onFinish?: () => void };

export default function Onboarding({ onFinish }: Props) {
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ on: false, x0: 0, dx: 0 });
  const last = SLIDES.length - 1;

  const go = (n: number) => setI(Math.min(last, Math.max(0, n)));
  const next = () => (i < last ? go(i + 1) : onFinish?.());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((v) => Math.min(last, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  const onDown = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { on: true, x0: e.clientX, dx: 0 };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!drag.current.on) return;
    let d = e.clientX - drag.current.x0;
    if ((i === 0 && d > 0) || (i === last && d < 0)) d *= 0.3; // edge resistance
    drag.current.dx = d;
    setDx(d);
  };

  const onUp = (e: PointerEvent<HTMLElement>) => {
    if (!drag.current.on) return;
    const d = drag.current.dx;
    drag.current.on = false;
    setDragging(false);
    setDx(0);
    if (Math.abs(d) > e.currentTarget.clientWidth * 0.18) go(i + (d < 0 ? 1 : -1));
  };

  const trackStyle = { transform: `translate3d(calc(${-i * 100}% + ${dx}px),0,0)` };
  const ease = dragging ? "" : EASE;

  return (
    <main
      aria-roledescription="carousel"
      aria-label="Welcome"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
      className="relative mx-auto flex h-[100dvh] w-full max-w-[440px] touch-pan-y select-none flex-col overflow-hidden bg-white text-[#0F1B3D] sm:my-4 sm:h-[min(calc(100dvh_-_2rem),880px)] sm:rounded-[36px] sm:shadow-2xl"
    >
      {/* Illustration */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className={`absolute inset-0 flex ${ease}`} style={trackStyle}>
          {SLIDES.map((s, k) => (
            <div key={s.title} className="relative w-full shrink-0" aria-hidden={k !== i}>
              <img
                src={s.image}
                alt={s.alt}
                draggable={false}
                loading={k === i ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={k === i ? "high" : "low"}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_35%]"
              />
            </div>
          ))}
        </div>
        <svg
          className="pointer-events-none absolute inset-x-0 -bottom-px h-14 w-full fill-white"
          viewBox="0 0 400 56"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 30C60 6 120 6 190 26S330 52 400 22V56H0Z" />
        </svg>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 pb-4 pt-1" role="tablist" aria-label="Onboarding steps">
        {SLIDES.map((s, k) => (
          <button
            key={s.title}
            type="button"
            role="tab"
            aria-selected={k === i}
            aria-label={`Step ${k + 1}`}
            onClick={() => go(k)}
            className={`relative h-2 rounded-full transition-all duration-300 before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-[''] ${
              k === i ? "w-6 bg-[#E11D2E]" : "w-2 bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Title + text */}
      <div className="overflow-hidden" aria-live="polite">
        <div className={`flex ${ease}`} style={trackStyle}>
          {SLIDES.map((s, k) => (
            <div key={s.title} className="w-full shrink-0 px-7 text-center" aria-hidden={k !== i}>
              <h1 className="mb-2.5 text-[clamp(26px,7.6vw,31px)] font-extrabold leading-[1.15] tracking-tight [text-wrap:balance]">
                {s.title}
              </h1>
              <p className="mx-auto max-w-[30ch] text-[15.5px] font-medium leading-relaxed text-slate-500">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
        <button
          type="button"
          onClick={() => onFinish?.()}
          tabIndex={i === 0 ? -1 : 0}
          aria-hidden={i === 0}
          className={`overflow-hidden text-base font-semibold text-slate-500 transition-all duration-300 ${
            i === 0 ? "pointer-events-none max-w-0 px-0 opacity-0" : "max-w-[90px] px-2.5 py-3.5"
          }`}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={next}
          className={`relative h-[58px] rounded-full bg-[linear-gradient(180deg,#EF3040,#C60F20)] text-[17px] font-bold text-white shadow-[0_12px_24px_-10px_rgba(225,29,46,0.7)] transition-all duration-[400ms] active:scale-[0.97] ${
            i === 0 ? "w-full" : "w-3/5"
          }`}
        >
          {SLIDES[i].cta}
          <Arrow className="absolute right-[22px] top-[19px] h-5 w-5" />
        </button>
      </div>
    </main>
  );
}
