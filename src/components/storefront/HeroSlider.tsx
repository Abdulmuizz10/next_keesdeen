"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Marquee from "@/components/storefront/Marquee";

export interface HeroSlideData {
  title: string;
  subtitle: string;
  eyebrow: string;
  italicWord: string;
  image: string;
  mobileImage: string;
  ctaText: string;
  ctaLink: string;
  textColor: string;
}

interface HeroSliderProps {
  slides: HeroSlideData[];
  /** Words that fade in/out above the CTA, e.g. ["boundless", "beautiful"] */
  rotatingWords?: string[];
}

const DEFAULT_ROTATING_WORDS = [
  "boundless",
  "beautiful",
  "timeless",
  "unforgettable",
];
const SLIDE_DURATION_MS = 6000;

// const marqueeItems = [
//   "Premium Collections",
//   "Handcrafted To Stand Out",
//   "Shipping Worldwide",
//   "Branded in UK",
// ];

const MARQUEE_CLIENTS =
  "London Fashion — British Craftsmanship — Contemporary Wears — Premium Essentials — European Design — Elevated Wardrobe — Timeless Style — ";
export function HeroSlider({
  slides,
  rotatingWords = DEFAULT_ROTATING_WORDS,
}: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);

  const goTo = (i: number) => {
    setCurrent(i);
  };

  // Slide autoplay — a fresh timer is scheduled every time `current` changes,
  // so clicking an indicator simply restarts the clock rather than fighting it.
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setTimeout(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, SLIDE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [current, slides.length]);

  // Rotating word above CTA
  useEffect(() => {
    if (rotatingWords.length <= 1) return;
    const wordTick = setInterval(() => {
      setWordIndex((i) => (i + 1) % rotatingWords.length);
    }, 2400);
    return () => clearInterval(wordTick);
  }, [rotatingWords.length]);

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <>
      <section
        aria-label="Hero"
        className="relative flex min-h-svh flex-col justify-end overflow-hidden bg-[#0A0A0A] p-5 pt-24 sm:p-10 sm:pt-32 lg:p-14 lg:pt-36 xl:pl-20"
      >
        {/* ── Background images — opacity crossfade ── */}
        {slides.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 z-1 transition-opacity duration-1200 ease-in-out"
            style={{ opacity: i === current ? 1 : 0 }}
          >
            <picture>
              {s.mobileImage && (
                <source media="(max-width: 640px)" srcSet={s.mobileImage} />
              )}
              <img
                src={s.image}
                alt=""
                role="presentation"
                className={`h-full w-full object-cover transition-transform duration-8000 ease-out ${
                  i === current ? "scale-110" : "scale-100"
                }`}
              />
            </picture>
          </div>
        ))}

        {/* ── Gradient overlay ── */}
        <div className="absolute inset-0 z-2 bg-linear-to-t from-[#0A0A0A]/95 via-[#0A0A0A]/60 to-[#0A0A0A]/30" />

        {/* ── Hero Text ── */}
        <div className="relative z-3 max-w-5xl">
          {/* Eyebrow */}
          {slide.eyebrow && (
            <p
              key={`eyebrow-${current}`}
              className="mb-4 animate-[fadeIn_1s_0.3s_both] text-[0.65rem] font-medium uppercase tracking-[0.3em] text-[#F7F5F2]/50 sm:mb-6 sm:tracking-[0.35em]"
            >
              {slide.eyebrow}
            </p>
          )}

          {/* Heading */}
          <h1
            key={`title-${current}`}
            // className="font-serif font-light leading-[0.95] tracking-tight animate-[fadeIn_1s_0.15s_both] sm:text-[7vw] lg:text-[5rem]"
            className="font-serif font-light leading-[0.95] tracking-tight animate-[fadeIn_1s_0.15s_both]"
            style={{
              color: slide.textColor || "#F7F5F2",
              fontSize: "clamp(3rem, 9vw, 10rem)",
              // fontSize: "clamp(3rem, 6vw + 1rem, 10rem)",
            }}
          >
            {slide.title}
            {slide.italicWord && (
              <>
                <div className="ml-3" />
                <span className="italic">{slide.italicWord}</span>
              </>
            )}
          </h1>

          {/* Rotating word */}
          {rotatingWords.length > 0 && (
            <div className="mt-4 h-6 sm:mt-6">
              <AnimatePresence mode="wait">
                <motion.span
                  key={rotatingWords[wordIndex]}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="block font-serif text-sm italic tracking-wide text-[#04BB6E] sm:text-2xl"
                >
                  Be {rotatingWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}

          {/* CTA + Sub */}
          <div className="mt-6 flex flex-wrap items-center gap-6 sm:mt-8 sm:gap-10">
            {slide.ctaText && slide.ctaLink && (
              <Link href={slide.ctaLink}>
                <button className="group inline-flex items-center gap-3 border border-[#F7F5F2]/30 bg-[#F7F5F2]/8 px-7 py-4 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-[#F7F5F2] backdrop-blur-md transition-colors duration-300 hover:bg-[#F7F5F2] hover:text-[#0A0A0A] cursor-pointer">
                  {slide.ctaText}
                  <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </button>
              </Link>
            )}
            {slide.subtitle && (
              <p className="max-w-[300px] text-[0.78rem] leading-relaxed tracking-wide text-[#F7F5F2]/50">
                {slide.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* ── Slide indicators ── */}
        {slides.length > 1 && (
          <div className="absolute bottom-8 right-6 z-5 hidden items-center gap-3 sm:right-10 md:flex lg:right-14">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="flex items-center bg-transparent py-1"
              >
                <div
                  className={`relative h-px overflow-hidden transition-all duration-400 ${
                    i === current ? "w-10 bg-[#04BB6E]" : "w-4 bg-[#F7F5F2]/35"
                  }`}
                >
                  {i === current && (
                    <div
                      key={current}
                      className="absolute inset-y-0 left-0 w-0 bg-[#F7F5F2]/60"
                      style={{
                        animation: `hero-slide-progress ${SLIDE_DURATION_MS}ms linear forwards`,
                      }}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Scroll hint ── */}
        <div
          aria-hidden="true"
          className="absolute right-6 top-1/2 z-5 hidden -translate-y-1/2 rotate-90 items-center gap-3 text-[0.6rem] uppercase tracking-[0.22em] text-[#F7F5F2]/40 sm:right-8 md:flex lg:right-12"
        >
          <span>Scroll</span>
          <motion.div
            className="h-px w-8 origin-left bg-[#F7F5F2]/30"
            animate={{ scaleX: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </section>

      {/* Marquee — bottom of heroSlider */}
      {/* <div className="border border-neutral-300 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee py-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center shrink-0">
              {marqueeItems.map((text, j) => (
                <span
                  key={j}
                  className="mx-6 font-sans text-xs uppercase tracking-[0.14em] text-neutral-400"
                >
                  {text}
                  <span className="mx-6 text-neutral-600">—</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div> */}

      <Marquee text={MARQUEE_CLIENTS} speed={30} />

      <style jsx>{`
        @keyframes hero-slide-progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        // @keyframes marquee {
        //   from {
        //     transform: translateX(0);
        //   }
        //   to {
        //     transform: translateX(-50%);
        //   }
        // }
        // .animate-marquee {
        //   animation: marquee 22s linear infinite;
        //   width: max-content;
        // }
      `}</style>
    </>
  );
}
