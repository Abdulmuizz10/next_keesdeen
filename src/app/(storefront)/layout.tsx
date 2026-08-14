import type { ReactNode } from "react";
import { CartDrawer } from "@/components/storefront/cart-drawer/CartDrawer";
import { SiteFooter } from "@/components/storefront/SiteFooter";
import { SiteHeader } from "@/components/storefront/SiteHeader";
import { SearchOverlay } from "@/components/storefront/SearchOverlay";
import { CookieConsent } from "@/components/storefront/CookieConsent";
import { StorefrontLoader } from "@/app/(storefront)/StoreFrontLoader";

export default function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <StorefrontLoader>
      <SiteHeader />
      <SearchOverlay />
      <CartDrawer />
      {children}
      <SiteFooter />
      <CookieConsent />
    </StorefrontLoader>
  );
}
