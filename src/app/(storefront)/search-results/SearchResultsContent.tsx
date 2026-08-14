"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useSearchHistoryStore } from "@/store/searchHistoryStore";

interface ProductResult {
  _id: string;
  slug: string;
  title: string;
  image: string;
  basePrice: number;
  avgRating: number;
  reviewCount: number;
  inStock: boolean;
}

export function SearchResultsContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "relevance";
  const { addSearch, _hydrate } = useSearchHistoryStore();

  const [products, setProducts] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    _hydrate();
  }, [_hydrate]);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }
    // Record in history
    addSearch(q);

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`)
      .then((r) => r.json())
      .then((data) => {
        let results = data.products || [];
        // Client-side sort
        if (sort === "price-asc")
          results.sort(
            (a: ProductResult, b: ProductResult) => a.basePrice - b.basePrice,
          );
        if (sort === "price-desc")
          results.sort(
            (a: ProductResult, b: ProductResult) => b.basePrice - a.basePrice,
          );
        if (sort === "rating")
          results.sort(
            (a: ProductResult, b: ProductResult) => b.avgRating - a.avgRating,
          );
        setProducts(results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort]);

  return (
    <main className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-white border-b border-neutral-100">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-neutral-600">
            {q ? <>Results for &ldquo;{q}&rdquo;</> : "Search"}
          </h1>
          {!loading && (
            <p className="mt-2 text-neutral-400">
              {products.length} product{products.length !== 1 ? "s" : ""} found
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
        {/* Sort Bar */}
        {products.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-neutral-400">
              Showing {products.length} result{products.length !== 1 ? "s" : ""}
            </p>
            <select
              value={sort}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("sort", e.target.value);
                window.history.replaceState(null, "", `?${params.toString()}`);
                // Re-sort locally
                const sorted = [...products];
                if (e.target.value === "price-asc")
                  sorted.sort((a, b) => a.basePrice - b.basePrice);
                else if (e.target.value === "price-desc")
                  sorted.sort((a, b) => b.basePrice - a.basePrice);
                else if (e.target.value === "rating")
                  sorted.sort((a, b) => b.avgRating - a.avgRating);
                setProducts(sorted);
              }}
              className="px-3 py-2 border border-neutral-200  text-sm bg-white focus:outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        )}

        {/* No Query */}
        {!loading && !q && (
          <div className="text-center py-20">
            <Search size={48} className="mx-auto text-neutral-200 mb-4" />
            <p className="text-neutral-500">
              Enter a search term to find products
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading && q && products.length === 0 && (
          <div className="text-center py-20">
            <Search size={48} className="mx-auto text-neutral-200 mb-4" />
            <p className="text-neutral-500 mb-2">
              No products found for &ldquo;{q}&rdquo;
            </p>
            <p className="text-sm text-neutral-400 mb-6">
              Try different keywords or browse our categories
            </p>
            <Link
              href="/category/bags"
              className="inline-block px-6 py-3 bg-primary-400 text-white font-semibold  hover:bg-primary-500 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        )}

        {/* Results Grid */}
        {!loading && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product, idx) => (
              <motion.article
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className="group"
              >
                <Link href={`/product/${product.slug}`} className="block">
                  <div className="relative aspect-3/4 bg-neutral-100  overflow-hidden mb-3">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                        No image
                      </div>
                    )}
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="bg-white text-neutral-600 text-xs font-medium px-3 py-1 ">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-serif text-base font-medium text-neutral-600 group-hover:text-primary-500 transition-colors line-clamp-2">
                    {product.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-sans font-semibold text-neutral-500 text-sm">
                      {formatPrice(product.basePrice)}
                    </span>
                  </div>
                  {product.avgRating > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-sm">
                      <span className="text-secondary-400">★</span>
                      <span className="text-neutral-500">
                        {product.avgRating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
