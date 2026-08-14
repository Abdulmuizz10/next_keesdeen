"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PageHeader } from "@/components/admin";
import {
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Save,
  Upload,
  X,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HeroSlide {
  title: string;
  subtitle: string;
  eyebrow: string;
  italicWord: string;
  image: string;
  mobileImage: string;
  ctaText: string;
  ctaLink: string;
  textColor: string;
  isActive: boolean;
  sortOrder: number;
}

type SectionType =
  | "featured_products"
  | "collection_grid"
  | "banner"
  | "testimonials"
  | "newsletter"
  | "new_arrivals"
  | "best_sellers";

interface HomepageSection {
  type: SectionType;
  title: string;
  subtitle: string;
  data: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
}

interface CollectionRef {
  _id: string;
  name: string;
  slug: string;
}

interface HeroBuilderProps {
  initialHeroSlides: HeroSlide[];
  initialHomepageSections: HomepageSection[];
  collections: CollectionRef[];
  permission: Permission;
}

const SECTION_LABELS: Record<
  SectionType,
  { label: string; description: string }
> = {
  featured_products: {
    label: "Featured Products",
    description: "Show bestselling or hand-picked products",
  },
  new_arrivals: {
    label: "New Arrivals",
    description: "Latest products, sorted by date added",
  },
  best_sellers: {
    label: "Best Sellers",
    description: "Top products by recent sales volume",
  },
  collection_grid: {
    label: "Collection Grid",
    description: "Display collection cards in a grid",
  },
  banner: {
    label: "Promo Banner",
    description: "Full-width promotional banner",
  },
  testimonials: {
    label: "Testimonials",
    description: "Customer review highlights",
  },
  newsletter: {
    label: "Newsletter Signup",
    description: "Email subscription form",
  },
};

const defaultSlide: HeroSlide = {
  title: "",
  subtitle: "",
  eyebrow: "",
  italicWord: "",
  image: "",
  mobileImage: "",
  ctaText: "",
  ctaLink: "",
  textColor: "#ffffff",
  isActive: true,
  sortOrder: 0,
};

/* ------------------------------------------------------------------ */
/*  Reusable single-image Cloudinary upload field (next/image, fill)   */
/* ------------------------------------------------------------------ */

function ImageUploadField({
  label,
  value,
  onChange,
  aspect,
  sizes,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect: string;
  sizes: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }
      onChange(data.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
        {label}
      </label>

      {value ? (
        <div
          className={`relative w-full ${aspect} border border-[hsl(var(--border))] overflow-hidden group bg-[hsl(var(--muted))]`}
        >
          <Image
            src={value}
            alt=""
            fill
            sizes={sizes}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-white flex items-center gap-1 text-xs font-medium"
              title="Replace image"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-white flex items-center gap-1 text-xs font-medium"
              title="Remove image"
            >
              <X size={14} />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`w-full ${aspect} border border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Upload size={18} />
          )}
          <span className="text-xs font-medium">
            {uploading ? "Uploading…" : "Upload image"}
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HeroBuilder({
  initialHeroSlides,
  initialHomepageSections,
  collections,
  permission,
}: HeroBuilderProps) {
  const router = useRouter();
  const canWrite = permission === "full" || permission === "write";

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(initialHeroSlides);
  const [sections, setSections] = useState<HomepageSection[]>(
    initialHomepageSections,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"hero" | "sections">("hero");
  const [expandedSlide, setExpandedSlide] = useState<number | null>(0);

  /* ---- Hero slide helpers ---- */

  const updateSlide = useCallback(
    (idx: number, updates: Partial<HeroSlide>) => {
      setHeroSlides((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, ...updates } : s)),
      );
      setSaved(false);
    },
    [],
  );

  const addSlide = () => {
    setHeroSlides((prev) => [
      ...prev,
      { ...defaultSlide, sortOrder: prev.length },
    ]);
    setExpandedSlide(heroSlides.length);
    setSaved(false);
  };

  const removeSlide = (idx: number) => {
    setHeroSlides((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })),
    );
    setExpandedSlide(null);
    setSaved(false);
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= heroSlides.length) return;
    setHeroSlides((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
    setExpandedSlide(target);
    setSaved(false);
  };

  /* ---- Section helpers ---- */

  const updateSection = useCallback(
    (idx: number, updates: Partial<HomepageSection>) => {
      setSections((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, ...updates } : s)),
      );
      setSaved(false);
    },
    [],
  );

  const addSection = (type: SectionType) => {
    setSections((prev) => [
      ...prev,
      {
        type,
        title: SECTION_LABELS[type].label,
        subtitle: "",
        data: {},
        isActive: true,
        sortOrder: prev.length,
      },
    ]);
    setSaved(false);
  };

  const removeSection = (idx: number) => {
    setSections((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i })),
    );
    setSaved(false);
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
    setSaved(false);
  };

  /* ---- Save ---- */

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroSlides: heroSlides.map((s, i) => ({ ...s, sortOrder: i })),
          homepageSections: sections.map((s, i) => ({ ...s, sortOrder: i })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "hero" as const, label: "Hero Slides", count: heroSlides.length },
    {
      key: "sections" as const,
      label: "Homepage Sections",
      count: sections.length,
    },
  ];

  return (
    <>
      <PageHeader
        title="Homepage Builder"
        description="Manage hero slides and homepage sections"
        action={
          canWrite ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--primary))] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saved ? "Saved ✓" : "Save Changes"}
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--border))] mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs bg-[hsl(var(--muted))] px-1.5 py-0.5">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/*  Hero Slides Tab                                                  */}
      {/* ================================================================ */}
      {activeTab === "hero" && (
        <div className="space-y-3">
          {heroSlides.length === 0 && (
            <p className="text-[hsl(var(--muted-foreground))] text-center py-12">
              No hero slides yet. Add one to get started.
            </p>
          )}

          {heroSlides.map((slide, idx) => {
            const isExpanded = expandedSlide === idx;
            return (
              <div
                key={idx}
                className="bg-[hsl(var(--backround))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] overflow-hidden"
              >
                {/* Collapsed header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))]"
                  onClick={() => setExpandedSlide(isExpanded ? null : idx)}
                >
                  <GripVertical
                    size={16}
                    className="text-[hsl(var(--muted-foreground))] shrink-0"
                  />

                  {/* Thumbnail */}
                  <div className="relative w-12 h-8 bg-[hsl(var(--muted))] overflow-hidden shrink-0 flex items-center justify-center">
                    {slide.image ? (
                      <Image
                        src={slide.image}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <ImageIcon
                        size={14}
                        className="text-[hsl(var(--muted-foreground))]"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                      {slide.title || `Slide ${idx + 1}`}
                    </p>
                    {slide.eyebrow && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                        {slide.eyebrow}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!slide.isActive && (
                      <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                        Hidden
                      </span>
                    )}
                    {canWrite && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(idx, -1);
                          }}
                          disabled={idx === 0}
                          className="p-1 hover:bg-[hsl(var(--accent))] disabled:opacity-30"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSlide(idx, 1);
                          }}
                          disabled={idx === heroSlides.length - 1}
                          className="p-1 hover:bg-[hsl(var(--accent))] disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-[hsl(var(--muted-foreground))] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>

                {/* Expanded form */}
                {isExpanded && canWrite && (
                  <div className="border-t border-[hsl(var(--border))] p-5 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                          Eyebrow Text
                        </label>
                        <input
                          value={slide.eyebrow}
                          onChange={(e) =>
                            updateSlide(idx, { eyebrow: e.target.value })
                          }
                          placeholder="e.g. New Arrival"
                          className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                          Italic Accent Word
                        </label>
                        <input
                          value={slide.italicWord}
                          onChange={(e) =>
                            updateSlide(idx, { italicWord: e.target.value })
                          }
                          placeholder="e.g. Life (from 'Crafted for Life')"
                          className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        Headline *
                      </label>
                      <input
                        value={slide.title}
                        onChange={(e) =>
                          updateSlide(idx, { title: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        Subtext
                      </label>
                      <input
                        value={slide.subtitle}
                        onChange={(e) =>
                          updateSlide(idx, { subtitle: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                      />
                    </div>

                    {/* Hero + mobile image uploads (Cloudinary) */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <ImageUploadField
                        label="Hero Image *"
                        value={slide.image}
                        onChange={(url) => updateSlide(idx, { image: url })}
                        aspect="aspect-[21/9]"
                        sizes="(max-width: 640px) 100vw, 500px"
                      />
                      <ImageUploadField
                        label="Mobile Image (optional)"
                        value={slide.mobileImage}
                        onChange={(url) =>
                          updateSlide(idx, { mobileImage: url })
                        }
                        aspect="aspect-[9/9]"
                        sizes="(max-width: 640px) 100vw, 300px"
                      />
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                          CTA Label
                        </label>
                        <input
                          value={slide.ctaText}
                          onChange={(e) =>
                            updateSlide(idx, { ctaText: e.target.value })
                          }
                          placeholder="Shop Now"
                          className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                          CTA Link
                        </label>
                        <input
                          value={slide.ctaLink}
                          onChange={(e) =>
                            updateSlide(idx, { ctaLink: e.target.value })
                          }
                          placeholder="/collections/…"
                          className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                          Text Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={slide.textColor}
                            onChange={(e) =>
                              updateSlide(idx, { textColor: e.target.value })
                            }
                            className="w-8 h-8 border border-[hsl(var(--border))] p-0 cursor-pointer"
                          />
                          <input
                            value={slide.textColor}
                            onChange={(e) =>
                              updateSlide(idx, { textColor: e.target.value })
                            }
                            className="flex-1 px-3 py-2 border border-[hsl(var(--border))] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <button
                          onClick={() =>
                            updateSlide(idx, { isActive: !slide.isActive })
                          }
                          className={`p-1 ${slide.isActive ? "text-emerald-500" : "text-[hsl(var(--muted-foreground))]"}`}
                        >
                          {slide.isActive ? (
                            <Eye size={16} />
                          ) : (
                            <EyeOff size={16} />
                          )}
                        </button>
                        <span className="text-sm">
                          {slide.isActive ? "Visible" : "Hidden"}
                        </span>
                      </label>
                      <button
                        onClick={() => removeSlide(idx)}
                        className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 px-3 py-1.5 hover:bg-red-50"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>

                    {/* Preview */}
                    {slide.image && (
                      <div className="relative h-40 overflow-hidden bg-neutral-100">
                        <Image
                          src={slide.image}
                          alt=""
                          fill
                          sizes="100vw"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-r from-black/50 to-transparent flex flex-col justify-end p-4">
                          {slide.eyebrow && (
                            <p
                              className="text-xs tracking-wider uppercase"
                              style={{ color: slide.textColor }}
                            >
                              {slide.eyebrow}
                            </p>
                          )}
                          <p
                            className="text-lg font-serif font-semibold"
                            style={{ color: slide.textColor }}
                          >
                            {slide.title
                              .split(slide.italicWord || "___NO_MATCH___")
                              .map((part, pi) => (
                                <span key={pi}>
                                  {pi > 0 && <em>{slide.italicWord}</em>}
                                  {part}
                                </span>
                              ))}
                          </p>
                          {slide.subtitle && (
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: slide.textColor, opacity: 0.8 }}
                            >
                              {slide.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {canWrite && (
            <button
              onClick={addSlide}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors"
            >
              <Plus size={16} /> Add Hero Slide
            </button>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  Homepage Sections Tab                                            */}
      {/* ================================================================ */}
      {activeTab === "sections" && (
        <div className="space-y-3">
          {sections.length === 0 && (
            <p className="text-[hsl(var(--muted-foreground))] text-center py-12">
              No sections defined. Add blocks below.
            </p>
          )}

          {sections.map((section, idx) => {
            const meta = SECTION_LABELS[section.type];
            return (
              <div
                key={idx}
                className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] p-4"
              >
                <div className="flex items-center gap-3">
                  <GripVertical
                    size={16}
                    className="text-[hsl(var(--muted-foreground))] shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                        {meta.label}
                      </span>
                      {!section.isActive && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-600">
                          Hidden
                        </span>
                      )}
                    </div>
                    {canWrite && (
                      <div className="grid sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                            Title
                          </label>
                          <input
                            value={section.title}
                            onChange={(e) =>
                              updateSection(idx, { title: e.target.value })
                            }
                            className="w-full px-3 py-1.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                            Subtitle
                          </label>
                          <input
                            value={section.subtitle}
                            onChange={(e) =>
                              updateSection(idx, { subtitle: e.target.value })
                            }
                            className="w-full px-3 py-1.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                          />
                        </div>
                        {(section.type === "new_arrivals" ||
                          section.type === "best_sellers") && (
                          <div>
                            <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">
                              Products to show
                            </label>
                            <input
                              type="number"
                              min="2"
                              max="24"
                              value={
                                (section.data as Record<string, number>)
                                  ?.limit || 8
                              }
                              onChange={(e) =>
                                updateSection(idx, {
                                  data: {
                                    ...section.data,
                                    limit: parseInt(e.target.value) || 8,
                                  },
                                })
                              }
                              className="w-full px-3 py-1.5 border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/20"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {canWrite && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          updateSection(idx, { isActive: !section.isActive })
                        }
                        className={`p-1.5 hover:bg-[hsl(var(--accent))] ${section.isActive ? "text-emerald-500" : "text-[hsl(var(--muted-foreground))]"}`}
                      >
                        {section.isActive ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 hover:bg-[hsl(var(--accent))] disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveSection(idx, 1)}
                        disabled={idx === sections.length - 1}
                        className="p-1 hover:bg-[hsl(var(--accent))] disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() => removeSection(idx)}
                        className="p-1.5 hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Section Menu */}
          {canWrite && (
            <div className="pt-4">
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
                Add Section
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(
                  Object.entries(SECTION_LABELS) as [
                    SectionType,
                    { label: string; description: string },
                  ][]
                ).map(([type, meta]) => (
                  <button
                    key={type}
                    onClick={() => addSection(type)}
                    className="text-left p-3 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))] transition-colors"
                  >
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {meta.label}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {meta.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
