import Link from "next/link";
import { NewsletterSignup } from "./NewsletterSignup";
import Image from "next/image";
import { mainLogoWhite } from "@/assets";

const shopLinks = [
  ["Shop", "/shop"],
  ["Active Wear", "/category/active-wear"],
  ["Fitness Accessories", "/category/fitness-accessories"],
];

const supportLinks = [
  ["Contact Us", "/contact"],
  ["Shipping & Returns", "/shipping-returns"],
  ["Privacy Policy", "/privacy"],
  ["Terms of Service", "/terms"],
];

const legalLinks = [
  ["Privacy Policy", "/privacy"],
  ["Terms of Service", "/terms"],
];

const marqueeItems = [
  "Premium Collections",
  "Handcrafted To Stand Out",
  "Shipping Worldwide",
  "Branded in UK",
];

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/keesdeen_active" },
  { label: "Facebook", href: "https://www.facebook.com/keesdeen" },
  { label: "X", href: "https://x.com/keesdeenactive" },
  { label: "TikTok", href: "https://tiktok.com/@keesdeen.active" },
];

export function SiteFooter() {
  return (
    <footer className="bg-neutral-600 text-white">
      {/* Marquee — top of footer, separates from page content above */}
      <div className="border-b border-white/10 overflow-hidden">
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
      </div>

      {/* Content columns */}
      <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12 py-20 sm:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          {/* Brand */}
          <div>
            <Link href="/" className="w-20 h-16 lg:w-40 lg:h-36 object-cover">
              {/* <h2 className="font-serif text-2xl font-light text-white tracking-wide">
                Keesdeen
              </h2> */}
              <Image
                key={"logo-white"}
                src={mainLogoWhite}
                alt="Brand logo"
                width={100}
                height={100}
                priority
              />
            </Link>
            <p className="mt-4 text-sm text-neutral-300 font-sans leading-[1.7]">
              Premium leather goods crafted with care. Designed to last a
              lifetime.
            </p>

            {/* Social links */}
            <div className="mt-6 flex gap-5">
              {socialLinks.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-sans uppercase tracking-[0.12em] text-neutral-400 hover:text-white transition-colors duration-300 pb-0.5 border-b border-transparent hover:border-white/30"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-300 mb-5">
              Inventory
            </h3>
            <ul className="space-y-3">
              {shopLinks.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-neutral-400 hover:text-white font-sans transition-colors duration-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-300 mb-5">
              Support
            </h3>
            <ul className="space-y-3">
              {supportLinks.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-neutral-400 hover:text-white font-sans transition-colors duration-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <NewsletterSignup
              source="footer"
              variant="footer"
              title="Stay in the Loop"
              subtitle="Get 10% off your first order."
            />
          </div>
        </div>
      </div>

      {/* Huge watermark wordmark — border-separated from columns above */}
      <div className="border-white/10 overflow-hidden">
        <h2
          className="font-serif font-light uppercase text-center leading-[0.9] select-none text-white/5"
          style={{
            fontSize: "clamp(3rem, 14vw, 10rem)",
            letterSpacing: "0.15em",
            padding: "clamp(2rem, 4vw, 3rem) clamp(1.5rem, 5vw, 5rem)",
          }}
        >
          Keesdeen
        </h2>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-6 sm:px-8 lg:px-12 py-5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-sans uppercase tracking-[0.12em] text-neutral-500">
          © {new Date().getFullYear()} Keesdeen. All rights reserved.
        </p>
        <div className="flex gap-8">
          {legalLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-[10px] font-sans uppercase tracking-[0.12em] text-neutral-500 hover:text-white transition-colors duration-300"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 22s linear infinite;
          width: max-content;
        }
      `}</style>
    </footer>
  );
}
