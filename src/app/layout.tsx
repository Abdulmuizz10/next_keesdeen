import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { buildOrganizationJsonLd } from "@/lib/seo";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const BASE_URL = process.env.NEXTAUTH_URL || "https://keesdeen.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Keesdeen | Contemporary British Menswear",
    template: "%s | Keesdeen",
  },

  description:
    "Premium menswear inspired by modern British style. Discover elevated essentials, refined silhouettes, and timeless wardrobe staples designed for everyday luxury.",

  keywords: [
    "British menswear",
    "UK fashion",
    "premium clothing",
    "contemporary menswear",
    "modern fashion",
    "elevated essentials",
    "everyday luxury",
    "Keesdeen",
  ],

  authors: [{ name: "Keesdeen" }],

  openGraph: {
    type: "website",
    locale: "en_GB",
    url: BASE_URL,
    siteName: "Keesdeen",
    title: "Keesdeen | Contemporary Wear",
    description:
      "Premium clothing inspired by modern British style. Elevated essentials, timeless design, and everyday luxury.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Keesdeen | Contemporary Wear",
    description:
      "Premium clothing inspired by modern British style. Elevated essentials, timeless design, and everyday luxury.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#04BB6E",
};

const orgJsonLd = buildOrganizationJsonLd();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${manrope.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="bg-white text-neutral-400 font-sans antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
