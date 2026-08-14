"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  hasAnalyticsConsent,
  hasMarketingConsent,
  hasPersonalizationConsent,
} from "./CookieConsent";

type ConsentCategory = "analytics" | "marketing" | "personalization";

/**
 * Gate for non-essential scripts by consent category.
 * Only renders children after the user has consented to the specified
 * cookie category. Re-checks every 2 seconds in case consent changed.
 *
 * Usage:
 *   <AnalyticsGate category="analytics">
 *     <Script src="https://www.googletagmanager.com/gtag/js?id=G-XXX" />
 *   </AnalyticsGate>
 *
 *   <AnalyticsGate category="marketing">
 *     <Script src="https://connect.facebook.net/en_US/fbevents.js" />
 *   </AnalyticsGate>
 */
export function AnalyticsGate({
  category = "analytics",
  children,
}: {
  category?: ConsentCategory;
  children: ReactNode;
}) {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const check = () => {
      switch (category) {
        case "analytics":
          return hasAnalyticsConsent();
        case "marketing":
          return hasMarketingConsent();
        case "personalization":
          return hasPersonalizationConsent();
        default:
          return false;
      }
    };

    setConsented(check());
    const interval = setInterval(() => setConsented(check()), 2000);
    return () => clearInterval(interval);
  }, [category]);

  if (!consented) return null;
  return <>{children}</>;
}
