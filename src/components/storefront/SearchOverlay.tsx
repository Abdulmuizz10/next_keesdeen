"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Clock,
  ArrowRight,
  Loader2,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useSearchHistoryStore } from "@/store/searchHistoryStore";
import { formatPrice } from "@/lib/format";

interface ProductResult {
  _id: string;
  slug: string;
  title: string;
  image: string;
  basePrice: number;
  avgRating: number;
  inStock: boolean;
}
interface CategoryResult {
  _id: string;
  slug: string;
  name: string;
}

export function SearchOverlay() {
  const router = useRouter();
  const { searchOverlayOpen, setSearchOverlayOpen } = useUIStore();
  const { recentSearches, addSearch, clearSearches, _hydrate } =
    useSearchHistoryStore();

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [categories, setCategories] = useState<CategoryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    _hydrate();
  }, [_hydrate]);

  useEffect(() => {
    if (searchOverlayOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setProducts([]);
      setCategories([]);
      setRateLimited(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOverlayOpen]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOverlayOpen) setSearchOverlayOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [searchOverlayOpen, setSearchOverlayOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setProducts([]);
      setCategories([]);
      return;
    }
    setLoading(true);
    setRateLimited(false);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`);
      if (res.status === 429) {
        setRateLimited(true);
        return;
      }
      const data = await res.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 350);
  };

  const submitSearch = (q: string) => {
    const t = q.trim();
    if (!t) return;
    addSearch(t);
    setSearchOverlayOpen(false);
    router.push(`/search-results?q=${encodeURIComponent(t)}&sort=relevance`);
  };

  const hasResults = products.length > 0 || categories.length > 0;
  const showRecent = query.length < 2 && recentSearches.length > 0;

  return (
    // <AnimatePresence>
    //   {searchOverlayOpen && (
    //     <>
    //       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-50" onClick={() => setSearchOverlayOpen(false)} />

    //       <motion.div
    //         initial={{ y: "-100%" }}
    //         animate={{ y: 0 }}
    //         exit={{ y: "-100%" }}
    //         transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    //         className="fixed top-0 left-0 right-0 z-50 bg-white border-b sf-border max-h-[85vh] flex flex-col"
    //       >
    //         <form onSubmit={(e) => { e.preventDefault(); submitSearch(query); }} className="border-b sf-border">
    //           <div className="mx-auto max-w-[800px] px-6 sm:px-8 py-6 flex items-center gap-4">
    //             <Search size={18} strokeWidth={1.5} className="text-neutral-400 flex-shrink-0" />
    //             <input
    //               ref={inputRef}
    //               type="text" value={query}
    //               onChange={(e) => handleInputChange(e.target.value)}
    //               placeholder="Search"
    //               className="flex-1 text-lg font-serif font-light text-neutral-600 placeholder:text-neutral-300 focus:outline-none border-b border-neutral-200 pb-1"
    //               autoComplete="off"
    //             />
    //             {loading && <Loader2 size={16} className="animate-spin text-neutral-400" />}
    //             <button type="button" onClick={() => setSearchOverlayOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors">
    //               <X size={18} strokeWidth={1.5} />
    //             </button>
    //           </div>
    //         </form>

    //         <div className="flex-1 overflow-y-auto">
    //           <div className="mx-auto max-w-[800px] px-6 sm:px-8 py-8">
    //             {rateLimited && <p className="text-sm text-neutral-500 text-center py-4">Please wait a moment and try again.</p>}

    //             {showRecent && (
    //               <div>
    //                 <div className="flex items-center justify-between mb-4">
    //                   <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400">Recent</p>
    //                   <button onClick={clearSearches} className="text-[10px] font-sans uppercase tracking-[0.08em] text-neutral-400 hover:text-neutral-600 flex items-center gap-1 transition-colors"><Trash2 size={10} /> Clear</button>
    //                 </div>
    //                 <div className="space-y-0">
    //                   {recentSearches.map((term, idx) => (
    //                     <button key={term} onClick={() => { setQuery(term); submitSearch(term); }} className={`flex items-center gap-3 w-full py-3.5 text-left hover:text-primary-500 transition-colors ${idx > 0 ? "border-t sf-border" : ""}`}>
    //                       <Clock size={14} strokeWidth={1.5} className="text-neutral-300" />
    //                       <span className="text-sm font-sans text-neutral-600">{term}</span>
    //                       <ArrowRight size={12} className="ml-auto text-neutral-300" />
    //                     </button>
    //                   ))}
    //                 </div>
    //               </div>
    //             )}

    //             {query.length >= 2 && !rateLimited && (
    //               <>
    //                 {categories.length > 0 && (
    //                   <div className="mb-8">
    //                     <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-3">Categories</p>
    //                     <div className="flex flex-wrap gap-3">
    //                       {categories.map((cat) => (
    //                         <Link key={cat._id} href={`/category/${cat.slug}`} onClick={() => { addSearch(query); setSearchOverlayOpen(false); }}
    //                           className="px-4 py-2 border sf-border text-sm font-sans text-neutral-600 hover:bg-neutral-50 transition-colors"
    //                         >{cat.name}</Link>
    //                       ))}
    //                     </div>
    //                   </div>
    //                 )}

    //                 {products.length > 0 && (
    //                   <div>
    //                     <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-3">Products</p>
    //                     <div className="space-y-0">
    //                       {products.map((product, idx) => (
    //                         <Link key={product._id} href={`/product/${product.slug}`}
    //                           onClick={() => { addSearch(query); setSearchOverlayOpen(false); }}
    //                           className={`flex items-center gap-5 py-4 group transition-colors ${idx > 0 ? "border-t sf-border" : ""}`}
    //                         >
    //                           <div className="w-14 h-18 bg-neutral-100 flex-shrink-0 relative overflow-hidden" style={{ aspectRatio: "3/4", width: "3.5rem" }}>
    //                             {product.image ? <Image src={product.image} alt={product.title} fill className="object-cover" sizes="56px" /> : <div className="w-full h-full flex items-center justify-center text-neutral-300"><Search size={14} /></div>}
    //                           </div>
    //                           <div className="flex-1 min-w-0">
    //                             <p className="font-serif text-sm text-neutral-600 group-hover:text-primary-500 transition-colors">{product.title}</p>
    //                             <p className="font-serif text-xs text-neutral-500 mt-0.5">{formatPrice(product.basePrice)}</p>
    //                           </div>
    //                         </Link>
    //                       ))}
    //                     </div>
    //                     <button onClick={() => submitSearch(query)} className="w-full mt-6 py-3 text-center font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-500 hover:text-primary-600 border sf-border hover:bg-neutral-50 transition-colors">
    //                       View All Results
    //                     </button>
    //                   </div>
    //                 )}

    //                 {!loading && !hasResults && query.length >= 2 && (
    //                   <div className="text-center py-12">
    //                     <p className="font-serif text-neutral-500">No results for &ldquo;{query}&rdquo;</p>
    //                     <p className="text-xs font-sans text-neutral-400 mt-2">Try a different search term</p>
    //                   </div>
    //                 )}
    //               </>
    //             )}
    //           </div>
    //         </div>
    //       </motion.div>
    //     </>
    //   )}
    // </AnimatePresence>

    <AnimatePresence>
      {searchOverlayOpen && (
        <motion.div
          key="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-50 bg-white flex flex-col"
        >
          {/* ─── Top bar ─────────────────────────────── */}
          <div className="flex items-center justify-between px-6 sm:px-10 h-16 border-b sf-border shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2 py-1 border sf-border text-[9px] font-sans font-medium uppercase tracking-[0.14em] text-neutral-400">
                Esc
              </span>
              <span className="text-[10px] font-sans text-neutral-400 tracking-wider">
                to close
              </span>
            </div>
            <button
              onClick={() => setSearchOverlayOpen(false)}
              className="ml-auto flex items-center gap-2 text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-neutral-500 hover:text-primary-500 transition-colors"
            >
              Close
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          {/* ─── Scrollable body ─────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[860px] px-6 sm:px-8 pt-16 sm:pt-24 pb-20">
              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSearch(query);
                }}
              >
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="What are you looking for?"
                    className="w-full bg-transparent text-[clamp(28px,4vw,52px)] font-serif font-light text-neutral-700 placeholder:text-neutral-200 outline-none pb-4 leading-tight tracking-[-0.01em]"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="h-px w-full bg-neutral-200" />
                  <AnimatePresence>
                    {loading && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute bottom-0 left-0 right-0 h-px bg-primary-500 origin-left"
                      />
                    )}
                  </AnimatePresence>
                </div>
                <p className="mt-4 text-[10px] font-sans text-neutral-400 tracking-wider">
                  {query.length >= 2
                    ? loading
                      ? "Searching..."
                      : hasResults
                        ? `${products.length} result${products.length !== 1 ? "s" : ""} found`
                        : ""
                    : "Start typing to search"}
                </p>
              </form>

              {rateLimited && (
                <p className="text-sm font-sans text-neutral-500 text-center py-10">
                  Please wait a moment and try again.
                </p>
              )}

              {/* ─── Idle state: recent + categories ───── */}
              {!rateLimited && query.length < 2 && (
                <div className="mt-16 sm:mt-20">
                  {showRecent && (
                    <div className="mb-16">
                      <div className="flex items-center justify-between mb-5">
                        <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.2em] text-neutral-400">
                          Recent
                        </p>
                        <button
                          onClick={clearSearches}
                          className="flex items-center gap-1 text-[10px] font-sans uppercase tracking-widest text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          <Trash2 size={10} /> Clear
                        </button>
                      </div>
                      <div className="border-t sf-border">
                        {recentSearches.map((term, idx) => (
                          <button
                            key={term}
                            onClick={() => {
                              setQuery(term);
                              submitSearch(term);
                            }}
                            className="group flex items-center justify-between w-full py-4 border-b sf-border text-left transition-colors hover:bg-neutral-50"
                          >
                            <div className="flex items-baseline gap-4">
                              <span className="text-[10px] font-sans text-neutral-300 tabular-nums">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-[18px] sm:text-[20px] font-serif font-light text-neutral-700 group-hover:text-primary-500 transition-colors">
                                {term}
                              </span>
                            </div>
                            <ArrowRight
                              size={14}
                              strokeWidth={1.5}
                              className="text-neutral-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {categories.length > 0 && (
                    <div>
                      <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.2em] text-neutral-400 mb-5">
                        Categories
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {categories.map((cat) => (
                          <Link
                            key={cat._id}
                            href={`/category/${cat.slug}`}
                            onClick={() => {
                              addSearch(query);
                              setSearchOverlayOpen(false);
                            }}
                            className="py-5 px-4 text-center border sf-border text-sm font-sans text-neutral-600 hover:border-primary-500 hover:text-primary-500 transition-colors"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Results ────────────────────────────── */}
              {!rateLimited && query.length >= 2 && (
                <div className="mt-14">
                  {products.length > 0 && (
                    <>
                      <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.2em] text-neutral-400 mb-5">
                        Products
                      </p>
                      <div className="border-t sf-border">
                        {products.map((product, idx) => (
                          <Link
                            key={product._id}
                            href={`/product/${product.slug}`}
                            onClick={() => {
                              addSearch(query);
                              setSearchOverlayOpen(false);
                            }}
                            className="group flex items-center gap-5 sm:gap-6 py-5 border-b sf-border transition-colors hover:bg-neutral-50"
                          >
                            <span className="hidden sm:block text-[10px] font-sans text-neutral-300 tabular-nums w-5 shrink-0">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div
                              className="w-16 bg-neutral-100 shrink-0 relative overflow-hidden"
                              style={{ aspectRatio: "3/4" }}
                            >
                              {product.image ? (
                                <Image
                                  src={product.image}
                                  alt={product.title}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                  <Search size={14} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-serif text-[17px] sm:text-[19px] font-light text-neutral-700 group-hover:text-primary-500 transition-colors truncate">
                                {product.title}
                              </p>
                              <p className="font-serif text-sm text-neutral-500 mt-1">
                                {formatPrice(product.basePrice)}
                              </p>
                            </div>
                            <ArrowUpRight
                              size={16}
                              strokeWidth={1.5}
                              className="hidden sm:block text-neutral-300 group-hover:text-primary-500 transition-colors"
                            />
                          </Link>
                        ))}
                      </div>
                      <button
                        onClick={() => submitSearch(query)}
                        className="w-full mt-8 py-4 text-center font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600 border sf-border hover:border-primary-500 hover:text-primary-500 transition-colors"
                      >
                        View All Results
                      </button>
                    </>
                  )}

                  {!loading && !hasResults && query.length >= 2 && (
                    <div className="text-center py-20">
                      <p className="font-serif text-[22px] font-light text-neutral-300 mb-3">
                        No results for &ldquo;{query}&rdquo;
                      </p>
                      <p className="text-xs font-sans text-neutral-400">
                        Try a different search term
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
