"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingBag, Loader2, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCartStore, CartLine } from "@/store/cartStore";

interface WishlistProduct {
  _id: string;
  slug: string;
  title: string;
  images: string[];
  basePrice: number;
  status: string;
  variants: {
    sku: string;
    attributes: { size?: string; color?: string; colorHex?: string };
    price?: number;
    stock: number;
    isActive: boolean;
  }[];
}

export default function WishlistPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);

  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/account/wishlist");
      return;
    }
    if (authStatus !== "authenticated") return;

    // Fetch wishlist product IDs, then fetch products
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.productIds || data.productIds.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }
        // Fetch full product data
        const res = await fetch(`/api/admin/products`);
        if (res.ok) {
          const allProducts = await res.json();
          const wishlisted = allProducts.filter((p: WishlistProduct) =>
            data.productIds.includes(p._id),
          );
          setProducts(wishlisted);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authStatus, router]);

  const removeFromWishlist = async (productId: string) => {
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, action: "remove" }),
    });
    setProducts((prev) => prev.filter((p) => p._id !== productId));
  };

  const addToCart = (product: WishlistProduct) => {
    const variant =
      product.variants.find((v) => v.isActive && v.stock > 0) ||
      product.variants[0];
    if (!variant) return;

    const variantParts: string[] = [];
    if (variant.attributes.color) variantParts.push(variant.attributes.color);
    if (variant.attributes.size) variantParts.push(variant.attributes.size);

    const line: CartLine = {
      productId: product._id,
      slug: product.slug,
      variantSku: variant.sku,
      title: product.title,
      image: product.images[0] || "",
      variantTitle: variantParts.join(" / ") || "Default",
      quantity: 1,
      unitPrice: variant.price || product.basePrice,
      originalPrice: variant.price || product.basePrice,
      discountAmount: 0,
      hasDiscount: false,
      stock: variant.stock,
    };

    addLine(line);
  };

  if (authStatus === "loading" || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="bg-white border-b border-neutral-100">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-neutral-600">
              My Wishlist
            </h1>
            {/* <span className="text-neutral-400 text-sm">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span> */}
          </div>
        </div>
      </section>
      <div className="bg-white mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-4">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={48} className="mx-auto text-neutral-200 mb-4" />
            <p className="text-neutral-500 mb-2">Your wishlist is empty</p>
            <p className="text-sm text-neutral-400 mb-6">
              Save items you love for later
            </p>
            <Link
              href="/shop"
              className="inline-block px-6 py-3 bg-primary-400 text-white font-semibold  hover:bg-primary-500 transition-colors"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => {
              const firstVariant =
                product.variants.find((v) => v.isActive) || product.variants[0];
              const inStock = firstVariant && firstVariant.stock > 0;

              return (
                <div key={product._id} className="group relative">
                  {/* Remove button */}
                  <button
                    onClick={() => removeFromWishlist(product._id)}
                    className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 backdrop-blur-sm  text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 size={14} />
                  </button>

                  <Link href={`/product/${product.slug}`} className="block">
                    <div className="relative aspect-3/4 bg-neutral-100  overflow-hidden mb-3">
                      {product.images[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.title}
                          width={100}
                          height={100}
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                          No image
                        </div>
                      )}
                      {!inStock && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="bg-white text-neutral-600 text-xs font-medium px-3 py-1 ">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-serif text-base font-medium text-neutral-600 group-hover:text-primary-500 transition-colors line-clamp-1">
                      {product.title}
                    </h3>
                    <p className="font-sans font-semibold text-neutral-500 text-sm mt-1">
                      {formatPrice(firstVariant?.price || product.basePrice)}
                    </p>
                  </Link>

                  {/* Quick Add to Cart */}
                  {inStock && (
                    <button
                      onClick={() => addToCart(product)}
                      className="mt-2 w-full py-2 bg-primary-400 text-white text-sm font-medium  hover:bg-primary-500 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag size={14} />
                      Add to Cart
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
