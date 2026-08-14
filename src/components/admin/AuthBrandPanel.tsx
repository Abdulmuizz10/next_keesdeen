import { mainLogoWhite } from "@/assets";
import Image from "next/image";
import Link from "next/link";

const TRUST_POINTS = [
  "Free shipping on orders over $75",
  "30-day hassle-free returns",
  "Engineered from performance-grade fabric",
];

export function AuthBrandPanel() {
  const wordmarkColumn = Array.from({ length: 6 });

  return (
    <div className="hidden lg:block relative overflow-hidden bg-neutral-900">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Infinite vertical wordmark marquee */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="marquee-track flex flex-col items-center">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex flex-col items-center shrink-0">
              {wordmarkColumn.map((_, i) => (
                <span
                  key={i}
                  className="font-serif text-[7vw] leading-[1.1] tracking-tight text-white/6 select-none"
                >
                  KEESDEEN
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Foreground content */}
      <div className="relative h-full flex flex-col justify-between px-14 py-16 z-10">
        <Link href="/" className="inline-block w-fit">
          {/* <Image
            key={"logo-white"}
            src={mainLogoWhite}
            alt="Brand logo"
            width={100}
            height={100}
            className="w-[140px] h-auto lg:w-[180px] lg:h-10"
            priority
          /> */}
        </Link>

        <div className="max-w-sm">
          <p className="text-[10px] font-sans uppercase tracking-[0.14em] text-white/40 mb-4">
            Performance Activewear
          </p>
          <h2 className="font-serif text-4xl font-light text-white leading-tight mb-6">
            Engineered for movement.
            <br />
            Designed for life.
          </h2>
          <div className="space-y-3">
            {TRUST_POINTS.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="w-1 h-1 bg-primary-400 shrink-0" />
                <span className="text-xs font-sans text-white/60">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] font-sans uppercase tracking-widest text-white/30">
          © {new Date().getFullYear()} Keesdeen. All rights reserved.
        </p>
      </div>

      <style jsx>{`
        .marquee-track {
          animation: marquee-up 34s linear infinite;
        }
        @keyframes marquee-up {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }
      `}</style>
    </div>
  );
}
