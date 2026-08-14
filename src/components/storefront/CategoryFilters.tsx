"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";

interface ColorOption {
  name: string;
  hex: string;
}

interface FilterOptions {
  colors: ColorOption[];
  sizes: string[];
}

interface CategoryFiltersProps {
  filterOptions: FilterOptions;
  activeColors: string[];
  activeSizes: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy: string;
}

export function CategoryFilters({
  filterOptions,
  activeColors,
  activeSizes,
  minPrice,
  maxPrice,
  sortBy,
}: CategoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sort: true,
    color: true,
    size: true,
    price: false,
  });

  const [priceRange, setPriceRange] = useState({
    min: minPrice ? (minPrice / 100).toString() : "",
    max: maxPrice ? (maxPrice / 100).toString() : "",
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const createQueryString = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        params.delete(key);
        if (value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v));
          } else {
            params.set(key, value);
          }
        }
      });

      return params.toString();
    },
    [searchParams]
  );

  const handleColorToggle = (color: string) => {
    const newColors = activeColors.includes(color)
      ? activeColors.filter((c) => c !== color)
      : [...activeColors, color];

    router.push(
      `${pathname}?${createQueryString({ color: newColors.length > 0 ? newColors : null })}`,
      { scroll: false }
    );
  };

  const handleSizeToggle = (size: string) => {
    const newSizes = activeSizes.includes(size)
      ? activeSizes.filter((s) => s !== size)
      : [...activeSizes, size];

    router.push(
      `${pathname}?${createQueryString({ size: newSizes.length > 0 ? newSizes : null })}`,
      { scroll: false }
    );
  };

  const handleSortChange = (newSort: string) => {
    router.push(`${pathname}?${createQueryString({ sort: newSort })}`, { scroll: false });
  };

  const handlePriceFilter = () => {
    const updates: Record<string, string | null> = {
      minPrice: priceRange.min ? String(Number(priceRange.min) * 100) : null,
      maxPrice: priceRange.max ? String(Number(priceRange.max) * 100) : null,
    };
    router.push(`${pathname}?${createQueryString(updates)}`, { scroll: false });
  };

  const clearAllFilters = () => {
    router.push(pathname, { scroll: false });
    setPriceRange({ min: "", max: "" });
  };

  const hasActiveFilters =
    activeColors.length > 0 || activeSizes.length > 0 || minPrice || maxPrice;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 transition-colors"
        >
          <X size={16} />
          Clear all filters
        </button>
      )}

      {/* Sort */}
      <FilterSection title="Sort By" expanded={expandedSections.sort} onToggle={() => toggleSection("sort")}>
        <div className="space-y-2">
          {[
            { value: "featured", label: "Featured" },
            { value: "newest", label: "Newest" },
            { value: "price-asc", label: "Price: Low to High" },
            { value: "price-desc", label: "Price: High to Low" },
            { value: "rating", label: "Top Rated" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              className={`block w-full text-left px-3 py-2  text-sm transition-colors ${
                sortBy === option.value
                  ? "bg-primary-50 text-primary-600 font-medium"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Color Filter */}
      {filterOptions.colors.length > 0 && (
        <FilterSection
          title="Color"
          expanded={expandedSections.color}
          onToggle={() => toggleSection("color")}
          count={activeColors.length}
        >
          <div className="flex flex-wrap gap-2">
            {filterOptions.colors.map((color) => (
              <button
                key={color.name}
                onClick={() => handleColorToggle(color.name)}
                className={`relative w-8 h-8  border-2 transition-all ${
                  activeColors.includes(color.name)
                    ? "border-primary-400 ring-2 ring-primary-200"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                {activeColors.includes(color.name) && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className={`w-4 h-4 ${
                        isLightColor(color.hex) ? "text-neutral-600" : "text-white"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Size Filter */}
      {filterOptions.sizes.length > 0 && (
        <FilterSection
          title="Size"
          expanded={expandedSections.size}
          onToggle={() => toggleSection("size")}
          count={activeSizes.length}
        >
          <div className="flex flex-wrap gap-2">
            {filterOptions.sizes.map((size) => (
              <button
                key={size}
                onClick={() => handleSizeToggle(size)}
                className={`px-3 py-1.5  text-sm font-medium border transition-colors ${
                  activeSizes.includes(size)
                    ? "bg-primary-400 text-white border-primary-400"
                    : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Price Filter */}
      <FilterSection
        title="Price"
        expanded={expandedSections.price}
        onToggle={() => toggleSection("price")}
      >
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange((prev) => ({ ...prev, min: e.target.value }))}
                className="w-full pl-7 pr-3 py-2 border border-neutral-200  text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
            <span className="text-neutral-300">—</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange((prev) => ({ ...prev, max: e.target.value }))}
                className="w-full pl-7 pr-3 py-2 border border-neutral-200  text-sm focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>
          <button
            onClick={handlePriceFilter}
            className="w-full py-2 bg-neutral-100 text-neutral-600 text-sm font-medium  hover:bg-neutral-200 transition-colors"
          >
            Apply
          </button>
        </div>
      </FilterSection>
    </div>
  );

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-neutral-200  text-neutral-600 font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="bg-primary-400 text-white text-xs px-2 py-0.5 ">
              {activeColors.length + activeSizes.length + (minPrice || maxPrice ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Panel */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-80 max-w-full bg-white z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold text-neutral-600">Filters</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-2 hover:bg-neutral-100 "
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <FilterContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Filters */}
      <div className="hidden lg:block sticky top-4">
        <h2 className="font-serif text-xl font-semibold text-neutral-600 mb-6">Filters</h2>
        <FilterContent />
      </div>
    </>
  );
}

interface FilterSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}

function FilterSection({ title, expanded, onToggle, count, children }: FilterSectionProps) {
  return (
    <div className="border-b border-neutral-100 pb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-left"
      >
        <span className="font-sans font-medium text-neutral-600">
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-2 text-xs bg-primary-100 text-primary-600 px-2 py-0.5 ">
              {count}
            </span>
          )}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-neutral-400" />
        </motion.span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 128;
}
