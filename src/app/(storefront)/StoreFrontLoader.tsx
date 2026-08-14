// components/storefront/StorefrontLoader.tsx
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import ScreenLoader from "@/components/storefront/ScreenLoader";

export function StorefrontLoader({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && <ScreenLoader onComplete={() => setIsLoading(false)} />}
      {children}
    </>
  );
}
