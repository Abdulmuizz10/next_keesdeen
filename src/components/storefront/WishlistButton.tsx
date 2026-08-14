"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface WishlistButtonProps {
  productId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function WishlistButton({ productId, className = "", size = "md" }: WishlistButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((data) => {
        setIsWishlisted(data.productIds?.includes(productId) || false);
      })
      .catch(() => {});
  }, [session, productId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      router.push("/auth/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }

    setLoading(true);
    const action = isWishlisted ? "remove" : "add";
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action }),
      });
      const data = await res.json();
      setIsWishlisted(data.productIds?.includes(productId) || false);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const iconSizes = { sm: 14, md: 18, lg: 22 };
  const paddings = { sm: "p-1.5", md: "p-2", lg: "p-2.5" };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={`${paddings[size]}  transition-all disabled:opacity-50 ${
        isWishlisted
          ? "bg-red-50 text-red-500 hover:bg-red-100"
          : "bg-white/80 backdrop-blur-sm text-neutral-400 hover:text-red-500 hover:bg-white"
      } ${className}`}
    >
      <Heart
        size={iconSizes[size]}
        className={isWishlisted ? "fill-red-500" : ""}
      />
    </button>
  );
}
