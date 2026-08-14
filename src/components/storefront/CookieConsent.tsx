"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Cookie,
  Shield,
  BarChart3,
  Target,
  Share2,
  X,
  ChevronDown,
  Lock,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Cookie infrastructure                                              */
/* ------------------------------------------------------------------ */

const COOKIE_NAME = "keesdeen_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/** Individual consent categories */
export interface CookiePreferences {
  essential: true; // Always on — cannot be toggled off
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  personalization: false,
};

const ALL_ACCEPTED: CookiePreferences = {
  essential: true,
  analytics: true,
  marketing: true,
  personalization: true,
};

function getRawCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setRawCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Read stored preferences (returns null if no consent given yet). */
export function getConsentPreferences(): CookiePreferences | null {
  const raw = getRawCookie(COOKIE_NAME);
  if (!raw) return null;

  // Backwards-compat: old values "all" / "essential"
  if (raw === "all") return ALL_ACCEPTED;
  if (raw === "essential") return DEFAULT_PREFS;

  try {
    const parsed = JSON.parse(raw);
    return { essential: true, ...parsed };
  } catch {
    return null;
  }
}

/** Convenience: has the user accepted analytics cookies? */
export function hasAnalyticsConsent(): boolean {
  return getConsentPreferences()?.analytics === true;
}

/** Convenience: has the user accepted marketing cookies? */
export function hasMarketingConsent(): boolean {
  return getConsentPreferences()?.marketing === true;
}

/** Convenience: has the user accepted personalization cookies? */
export function hasPersonalizationConsent(): boolean {
  return getConsentPreferences()?.personalization === true;
}

/* ------------------------------------------------------------------ */
/*  Cookie categories metadata                                         */
/* ------------------------------------------------------------------ */

interface CategoryMeta {
  key: keyof CookiePreferences;
  index: string;
  label: string;
  description: string;
  icon: typeof Cookie;
  locked: boolean; // essential is always on
  examples: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "essential",
    index: "01",
    label: "Strictly Necessary",
    description:
      "Required for the website to function. These cookies enable core features like security, shopping cart, and checkout. They cannot be disabled.",
    icon: Shield,
    locked: true,
    examples: "Session ID, CSRF token, cart state, authentication",
  },
  {
    key: "analytics",
    index: "02",
    label: "Analytics & Performance",
    description:
      "Help us understand how visitors interact with our website by collecting anonymous usage data. This lets us improve the experience for everyone.",
    icon: BarChart3,
    locked: false,
    examples: "Google Analytics, page views, click maps, load times",
  },
  {
    key: "marketing",
    index: "03",
    label: "Marketing & Advertising",
    description:
      "Used to deliver relevant advertisements and track campaign performance across websites. Disabling these means you may still see ads, but they won't be tailored to you.",
    icon: Target,
    locked: false,
    examples: "Facebook Pixel, Google Ads, retargeting campaigns",
  },
  {
    key: "personalization",
    index: "04",
    label: "Personalization & Preferences",
    description:
      "Allow the website to remember your preferences such as language, region, recently viewed products, and wishlist state for a more tailored experience.",
    icon: Share2,
    locked: false,
    examples: "Language, currency, recently viewed, recommendations",
  },
];

/* ------------------------------------------------------------------ */
/*  Segmented consent toggle                                           */
/* ------------------------------------------------------------------ */

function ConsentToggle({
  active,
  locked,
  onToggle,
  label,
}: {
  active: boolean;
  locked: boolean;
  onToggle: () => void;
  label: string;
}) {
  if (locked) {
    return (
      <div
        className="relative w-[92px] h-8 border border-primary-400 bg-primary-400 flex items-center justify-center gap-1.5 shrink-0 overflow-hidden"
        aria-label={`${label} is always active`}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 2px, transparent 2px, transparent 7px)",
          }}
        />
        <Lock size={11} className="relative text-white" strokeWidth={2.5} />
        <span className="relative text-[10px] font-sans font-semibold tracking-[0.12em] text-white">
          LOCKED
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      aria-label={`Toggle ${label}`}
      className="relative w-[92px] h-8 border border-neutral-200 grid grid-cols-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
    >
      <span
        className={`absolute inset-y-0 left-0 w-1/2 bg-primary-400 transition-transform duration-300 ease-out ${
          active ? "translate-x-full" : "translate-x-0"
        }`}
      />
      <span
        className={`relative z-10 flex items-center justify-center text-[10px] font-sans font-semibold tracking-[0.12em] transition-colors duration-300 ${
          !active ? "text-white" : "text-neutral-400"
        }`}
      >
        OFF
      </span>
      <span
        className={`relative z-10 flex items-center justify-center text-[10px] font-sans font-semibold tracking-[0.12em] border-l border-neutral-200 transition-colors duration-300 ${
          active ? "text-white" : "text-neutral-400"
        }`}
      >
        ON
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function CookieConsent() {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [preferences, setPreferences] =
    useState<CookiePreferences>(DEFAULT_PREFS);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const existing = getConsentPreferences();
    if (existing === null) {
      const timer = setTimeout(() => setBannerVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    setRawCookie(COOKIE_NAME, JSON.stringify(prefs), COOKIE_MAX_AGE);
    setBannerVisible(false);
    setCustomizeOpen(false);
  }, []);

  const acceptAll = () => savePreferences(ALL_ACCEPTED);
  const acceptEssentialOnly = () => savePreferences(DEFAULT_PREFS);
  const saveCustom = () => savePreferences(preferences);

  const toggleCategory = (key: keyof CookiePreferences) => {
    if (key === "essential") return; // Can't toggle essential
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const reopenBannerIfUndecided = () => {
    setCustomizeOpen(false);
    if (!getConsentPreferences()) setBannerVisible(true);
  };

  return (
    <AnimatePresence>
      {/* ---- Banner (initial prompt) ---- */}
      {bannerVisible && !customizeOpen && (
        <motion.div
          key="banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.15 }
              : { type: "spring", damping: 26, stiffness: 220 }
          }
          className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-primary-400 bg-white"
        >
          <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[11px] font-semibold tracking-[0.2em] text-primary-500 mb-2">
                  N.01 — PRIVACY NOTICE
                </p>
                <h3 className="font-serif text-2xl sm:text-[28px] leading-tight text-neutral-600 mb-2">
                  Cookies, considered.
                </h3>
                <p className="font-sans text-sm text-neutral-500 leading-relaxed max-w-xl">
                  We use cookies to run this site, understand how it&apos;s
                  used, and tailor what you see. Choose what you&apos;re
                  comfortable with.{" "}
                  <a
                    href="/privacy"
                    className="text-neutral-600 underline underline-offset-2 hover:text-primary-500"
                  >
                    Read the privacy policy
                  </a>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setCustomizeOpen(true)}
                  className="px-5 py-3 border border-neutral-200 text-[11px] font-sans font-semibold tracking-[0.12em] text-neutral-600 hover:border-neutral-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                >
                  CUSTOMIZE
                </button>
                <button
                  onClick={acceptEssentialOnly}
                  className="px-5 py-3 border border-neutral-200 text-[11px] font-sans font-semibold tracking-[0.12em] text-neutral-600 hover:border-neutral-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                >
                  ESSENTIAL ONLY
                </button>
                <button
                  onClick={acceptAll}
                  className="group px-5 py-3 bg-primary-400 text-white text-[11px] font-sans font-semibold tracking-[0.12em] hover:bg-primary-500 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                >
                  ACCEPT ALL
                  <ArrowRight
                    size={13}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- Customization Modal ---- */}
      {customizeOpen && (
        <motion.div
          key="customize"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.1 : 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-600/40 backdrop-blur-sm"
            onClick={reopenBannerIfUndecided}
          />

          {/* Modal */}
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 0 } : { y: 24, opacity: 0 }
            }
            animate={{ y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.1 : 0.25,
              ease: "easeOut",
            }}
            className="relative bg-white shadow-2xl w-full sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 sm:px-7 pt-6 pb-5 border-b border-neutral-100">
              <div>
                <p className="font-sans text-[11px] font-semibold tracking-[0.2em] text-primary-500 mb-2">
                  N.02 — PREFERENCES
                </p>
                <h2 className="font-serif text-2xl text-neutral-600">
                  The fine print, refined.
                </h2>
              </div>
              <button
                onClick={reopenBannerIfUndecided}
                className="p-2 -mr-2 -mt-1 text-neutral-400 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category List */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-7 py-5">
              <p className="font-sans text-sm text-neutral-500 leading-relaxed mb-5">
                Four categories, four choices. Strictly necessary cookies stay
                on — everything else is yours to decide.
              </p>

              <div className="divide-y divide-neutral-100">
                {CATEGORIES.map((cat, i) => {
                  const Icon = cat.icon;
                  const isOn = preferences[cat.key];
                  const isExpanded = expandedCategory === cat.key;

                  return (
                    <motion.div
                      key={cat.key}
                      initial={
                        shouldReduceMotion ? false : { opacity: 0, y: 8 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: shouldReduceMotion ? 0 : i * 0.06,
                        ease: "easeOut",
                      }}
                      className="py-4 first:pt-0"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-serif italic text-lg text-neutral-300 w-6 shrink-0">
                          {cat.index}
                        </span>

                        <Icon
                          size={17}
                          className="text-neutral-400 shrink-0"
                          strokeWidth={1.75}
                        />

                        <button
                          onClick={() =>
                            setExpandedCategory(isExpanded ? null : cat.key)
                          }
                          className="flex-1 min-w-0 flex items-center gap-2 text-left focus:outline-none"
                        >
                          <p className="font-sans text-sm font-medium text-neutral-600 truncate">
                            {cat.label}
                          </p>
                          <ChevronDown
                            size={14}
                            className={`text-neutral-350 shrink-0 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <ConsentToggle
                          active={isOn}
                          locked={cat.locked}
                          onToggle={() => toggleCategory(cat.key)}
                          label={cat.label}
                        />
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: shouldReduceMotion ? 0.1 : 0.2,
                            }}
                            className="overflow-hidden"
                          >
                            <div className="pl-10 pt-3">
                              <p className="text-xs text-neutral-500 leading-relaxed">
                                {cat.description}
                              </p>
                              <p className="text-xs text-neutral-400 mt-2">
                                <span className="font-medium text-neutral-500">
                                  Examples —{" "}
                                </span>
                                {cat.examples}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-100 px-6 sm:px-7 py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                onClick={acceptEssentialOnly}
                className="px-4 py-3 sm:py-2.5 border border-neutral-200 text-[11px] font-sans font-semibold tracking-[0.12em] text-neutral-600 hover:border-neutral-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
              >
                REJECT ALL
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={saveCustom}
                  className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 border border-primary-300 text-primary-600 text-[11px] font-sans font-semibold tracking-[0.12em] hover:bg-primary-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                >
                  SAVE PREFERENCES
                </button>
                <button
                  onClick={acceptAll}
                  className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 bg-primary-400 text-white text-[11px] font-sans font-semibold tracking-[0.12em] hover:bg-primary-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
                >
                  ACCEPT ALL
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
