/**
 * RofikOnboarding.tsx — 3-screen welcome flow (swipe / Next / Skip / dots)
 * Stack: React 19 + TypeScript + Tailwind CSS (no extra packages)
 *
 * Files:
 *   src/components/RofikOnboarding.tsx
 *   src/assets/onboarding/welcome-1.webp | welcome-2.webp | welcome-3.webp
 *
 * Optional font (index.html <head>):
 *   <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
 *
 * Usage (App.tsx): render from the auth flow; completion only advances to sign-in.
 */
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import welcome1 from "../assets/onboarding/welcome-1.webp";
import welcome2 from "../assets/onboarding/welcome-2.webp";
import welcome3 from "../assets/onboarding/welcome-3.webp";

type Theme = "dark" | "light";
type Slide = {
  image: string;
  alt: string;
  theme: Theme;
  title: string;
  accent: string;
  br?: boolean; // line break before the accent word
  text: string;
  cta: string;
};

const SLIDES: Slide[] = [
  {
    image: welcome1,
    alt: "Boy relaxing on a bean bag, smiling at his phone",
    theme: "dark",
    title: "Welcome",
    accent: "Back!",
    text: "Sign in to continue to Rofik Godi Centre.",
    cta: "Get Started",
  },
  {
    image: welcome2,
    alt: "Boy at a laptop, thinking with a pen in hand",
    theme: "light",
    title: "Create Your",
    accent: "Account",
    br: true,
    text: "Sign up to explore amazing features and offers.",
    cta: "Next",
  },
  {
    image: welcome3,
    alt: "Boy winking with a thumbs up, holding a phone",
    theme: "light",
    title: "You’re",
    accent: "All Set!",
    text: "Let’s continue and enjoy your personalised experience.",
    cta: "Start Now",
  },
];

const THEME = {
  dark: { h: "text-white", accent: "text-[#FF6F88]", p: "text-white/90", on: "bg-white", off: "bg-white/35", bg: "bg-[#770216]" },
  light: { h: "text-[#0F1B3D]", accent: "text-[#E11D2E]", p: "text-slate-500", on: "bg-[#E11D2E]", off: "bg-slate-200", bg: "bg-white" },
} as const;

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

export default function RofikOnboarding({ onFinish }: Props) {
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
      className="relative mx-auto h-[100dvh] w-full max-w-[440px] touch-pan-y select-none overflow-hidden bg-white sm:my-4 sm:h-[min(calc(100dvh_-_2rem),880px)] sm:rounded-[36px] sm:shadow-2xl"
    >
      {/* Artwork fits the width at the top; its bottom fades into the slide colour, so the text sits below the character */}
      <div className={`absolute inset-0 flex ${ease}`} style={trackStyle}>
        {SLIDES.map((s, k) => (
          <div key={s.title} className={`relative h-full w-full shrink-0 overflow-hidden ${THEME[s.theme].bg}`} aria-hidden={k !== i}>
            <img
              src={s.image}
              alt={s.alt}
              draggable={false}
              loading={k === i ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={k === i ? "high" : "low"}
              className="pointer-events-none absolute left-0 top-0 h-auto w-full [-webkit-mask-image:linear-gradient(to_bottom,#000_82%,transparent)] [mask-image:linear-gradient(to_bottom,#000_82%,transparent)] [transform:translateY(clamp(-14%,calc((100dvh_-_760px)*.45),0px))]"
            />
          </div>
        ))}
      </div>

      {/* Dots + title + text (slides with the art), then the buttons */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col">
        <div className="overflow-hidden" aria-live="polite">
          <div className={`flex ${ease}`} style={trackStyle}>
            {SLIDES.map((s, k) => {
              const t = THEME[s.theme];
              return (
                <div key={s.title} inert={k !== i} className="flex w-full shrink-0 flex-col justify-end px-7 text-center">
                  <div className="mb-3.5 flex justify-center gap-2" role="tablist" aria-label="Steps">
                    {SLIDES.map((d, n) => (
                      <button
                        key={d.title}
                        type="button"
                        role="tab"
                        aria-selected={n === i}
                        aria-label={`Step ${n + 1}`}
                        onClick={() => go(n)}
                        className={`relative h-2 rounded-full transition-all duration-300 before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-[''] ${
                          n === i ? `w-6 ${t.on}` : `w-2 ${t.off}`
                        }`}
                      />
                    ))}
                  </div>
                  <h1 className={`mb-2 text-[clamp(30px,9.6vw,42px)] font-extrabold leading-[1.1] tracking-tight [text-wrap:balance] ${t.h}`}>
                    {s.title}
                    {s.br ? <br /> : " "}
                    <span className={t.accent}>{s.accent}</span>
                  </h1>
                  <p className={`mx-auto max-w-[30ch] text-[15px] font-medium leading-normal ${t.p}`}>{s.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[22px]">
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
            className={`relative h-[58px] rounded-full bg-[linear-gradient(90deg,#F2364F,#D5122F)] text-[17px] font-bold text-white shadow-[0_12px_24px_-10px_rgba(225,29,46,0.7)] transition-all duration-[400ms] active:scale-[0.97] ${
              i === 0 ? "w-full" : "w-3/5"
            }`}
          >
            {SLIDES[i].cta}
            <Arrow className="absolute right-[22px] top-[19px] h-5 w-5" />
          </button>
        </div>
      </div>
    </main>
  );
}
