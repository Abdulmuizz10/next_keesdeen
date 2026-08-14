"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PageHeader } from "@/components/admin";
import {
  Loader2,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  Store,
  Mail,
  MapPin,
  Globe2,
  Search as SearchIcon,
  Share2,
  SlidersHorizontal,
  AlertCircle,
} from "lucide-react";

interface SocialLink {
  platform: string;
  url: string;
}

interface SiteConfigForm {
  siteName: string;
  siteDescription: string;
  logo: string;
  favicon: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  locale: string;
  timezone: string;
  reviewsEnabled: boolean;
  wishlistEnabled: boolean;
  guestCheckoutEnabled: boolean;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  seo: {
    defaultMetaTitle: string;
    defaultMetaDescription: string;
    ogImage: string;
  };
  socialLinks: SocialLink[];
}

const emptyForm: SiteConfigForm = {
  siteName: "",
  siteDescription: "",
  logo: "",
  favicon: "",
  contactEmail: "",
  contactPhone: "",
  currency: "GBP",
  locale: "en-GB",
  timezone: "Europe/London",
  reviewsEnabled: true,
  wishlistEnabled: true,
  guestCheckoutEnabled: true,
  address: {
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  },
  seo: {
    defaultMetaTitle: "",
    defaultMetaDescription: "",
    ogImage: "",
  },
  socialLinks: [],
};

const inputCls =
  "w-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3.5 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none transition-all focus:border-[hsl(var(--foreground))] focus:ring-0";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || !data.url) {
    throw new Error(data.error || `Failed to upload ${file.name}`);
  }

  return data.url as string;
}

/* -------------------------------------------------------------------------- */
/* Image Upload                                                               */
/* -------------------------------------------------------------------------- */

type ImageAspect = "icon" | "square" | "wide";

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  aspect?: ImageAspect;
  onChange: (url: string) => void;
}

function ImageUploadField({
  label,
  hint,
  value,
  aspect = "square",
  onChange,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const boxDims =
    aspect === "icon"
      ? "w-16 h-16"
      : aspect === "wide"
        ? "w-full sm:w-64 h-32"
        : "w-28 h-28";

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);

    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-2.5">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--foreground))]">
          {label}
        </label>

        {hint && (
          <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
            {hint}
          </p>
        )}
      </div>

      <div className="flex items-start gap-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`group relative shrink-0 ${boxDims} flex items-center justify-center overflow-hidden border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30`}
        >
          {value ? (
            <>
              <Image
                src={value}
                alt={label}
                fill
                className="object-contain p-2"
              />

              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center bg-black/75 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove ${label}`}
              >
                <X size={12} />
              </button>
            </>
          ) : uploading ? (
            <Loader2
              size={18}
              className="animate-spin text-[hsl(var(--muted-foreground))]"
            />
          ) : (
            <ImageIcon
              size={18}
              className="text-[hsl(var(--muted-foreground))]"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                handleFile(file);
              }

              e.target.value = "";
            }}
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 border border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] px-3 py-2 text-xs font-semibold text-[hsl(var(--background))] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Upload size={13} />
              )}

              {uploading
                ? "Uploading…"
                : value
                  ? "Replace image"
                  : "Upload image"}
            </button>

            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs font-medium text-red-500 transition-colors hover:text-red-600"
              >
                Remove
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowUrlInput((s) => !s)}
              className="text-xs text-[hsl(var(--muted-foreground))] underline underline-offset-4 transition-colors hover:text-[hsl(var(--foreground))]"
            >
              {showUrlInput ? "Hide URL field" : "Use URL"}
            </button>
          </div>

          {showUrlInput && (
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle size={12} />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section                                                                    */
/* -------------------------------------------------------------------------- */

function SettingsSection({
  number,
  icon: Icon,
  title,
  description,
  children,
}: {
  number: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="grid lg:grid-cols-[190px_1fr]">
        <div className="border-b border-[hsl(var(--border))] py-5 lg:border-b-0 lg:border-r lg:py-7 lg:pr-8">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-medium tracking-widest text-[hsl(var(--muted-foreground))]">
              {number}
            </span>

            <Icon size={15} className="text-[hsl(var(--muted-foreground))]" />
          </div>

          <h2 className="mt-3 text-sm font-semibold tracking-tight text-[hsl(var(--foreground))]">
            {title}
          </h2>

          {description && (
            <p className="mt-1.5 max-w-[170px] text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              {description}
            </p>
          )}
        </div>

        <div className="py-7 lg:pl-10">{children}</div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Field                                                                      */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.13em] text-[hsl(var(--foreground))]">
        {label}
      </label>

      {children}

      {hint && (
        <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          {hint}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export default function SettingsPage() {
  const router = useRouter();

  const [form, setForm] = useState<SiteConfigForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<SiteConfigForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/site-config")
      .then((r) => r.json())
      .then((data) => {
        const loaded: SiteConfigForm = {
          siteName: data.siteName || "",
          siteDescription: data.siteDescription || "",
          logo: data.logo || "",
          favicon: data.favicon || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
          currency: data.currency || "GBP",
          locale: data.locale || "en-GB",
          timezone: data.timezone || "Europe/London",

          reviewsEnabled: data.features?.reviewsEnabled ?? true,
          wishlistEnabled: data.features?.wishlistEnabled ?? true,
          guestCheckoutEnabled: data.features?.guestCheckoutEnabled ?? true,

          address: {
            street: data.address?.street || "",
            city: data.address?.city || "",
            state: data.address?.state || "",
            postalCode: data.address?.postalCode || "",
            country: data.address?.country || "",
          },

          seo: {
            defaultMetaTitle: data.seo?.defaultMetaTitle || "",
            defaultMetaDescription: data.seo?.defaultMetaDescription || "",
            ogImage: data.seo?.ogImage || "",
          },

          socialLinks: data.socialLinks || [],
        };

        setForm(loaded);
        setInitialForm(loaded);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const updateAddress = (
    key: keyof SiteConfigForm["address"],
    value: string,
  ) => {
    setForm((f) => ({
      ...f,
      address: {
        ...f.address,
        [key]: value,
      },
    }));
  };

  const updateSeo = (key: keyof SiteConfigForm["seo"], value: string) => {
    setForm((f) => ({
      ...f,
      seo: {
        ...f.seo,
        [key]: value,
      },
    }));
  };

  const updateSocialLink = (idx: number, updates: Partial<SocialLink>) => {
    setForm((f) => ({
      ...f,
      socialLinks: f.socialLinks.map((s, i) =>
        i === idx ? { ...s, ...updates } : s,
      ),
    }));
  };

  const addSocialLink = () => {
    setForm((f) => ({
      ...f,
      socialLinks: [
        ...f.socialLinks,
        {
          platform: "",
          url: "",
        },
      ],
    }));
  };

  const removeSocialLink = (idx: number) => {
    setForm((f) => ({
      ...f,
      socialLinks: f.socialLinks.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteName: form.siteName,
          siteDescription: form.siteDescription,

          logo: form.logo || undefined,
          favicon: form.favicon || undefined,

          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,

          currency: form.currency,
          locale: form.locale,
          timezone: form.timezone,

          address: {
            street: form.address.street || undefined,
            city: form.address.city || undefined,
            state: form.address.state || undefined,
            postalCode: form.address.postalCode || undefined,
            country: form.address.country || undefined,
          },

          seo: {
            defaultMetaTitle: form.seo.defaultMetaTitle || undefined,
            defaultMetaDescription:
              form.seo.defaultMetaDescription || undefined,
            ogImage: form.seo.ogImage || undefined,
          },

          socialLinks: form.socialLinks.filter(
            (s) => s.platform.trim() && s.url.trim(),
          ),

          features: {
            reviewsEnabled: form.reviewsEnabled,
            wishlistEnabled: form.wishlistEnabled,
            guestCheckoutEnabled: form.guestCheckoutEnabled,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        throw new Error(data.error || "Failed to save settings");
      }

      setInitialForm(form);
      setSaved(true);

      router.refresh();

      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <Loader2 size={14} className="animate-spin" />
          Loading settings
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Store-level configuration"
        action={
          <div className="flex items-center gap-4">
            {isDirty && !saving && (
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] sm:block">
                Unsaved changes
              </span>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="inline-flex items-center gap-2 bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saved ? (
                <CheckCircle size={14} />
              ) : (
                <Save size={14} />
              )}

              {saved ? "Saved" : "Save changes"}
            </button>
          </div>
        }
      />

      <div className="pb-10">
        {/* Intro */}
        <div className="border-b border-[hsl(var(--border))] py-8">
          <div className="max-w-xl">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
              Store configuration
            </p>

            <h1 className="text-2xl font-medium tracking-[-0.03em] text-[hsl(var(--foreground))]">
              Control the details that define your storefront.
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Manage brand identity, contact information, regional settings, SEO
              defaults and customer-facing features.
            </p>
          </div>
        </div>

        {/* Error */}
        {saveError && (
          <div className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-medium">Unable to save settings</p>
              <p className="mt-0.5 text-xs text-red-500">{saveError}</p>
            </div>

            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="ml-auto p-1 text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 01 Brand                                                         */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          number="01"
          icon={Store}
          title="Brand"
          description="How your store presents itself across the site."
        >
          <div className="space-y-7">
            <Field label="Store name">
              <input
                value={form.siteName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    siteName: e.target.value,
                  }))
                }
                className={inputCls}
                placeholder="Your store name"
              />
            </Field>

            <Field
              label="Description"
              hint="A short description used across your storefront."
            >
              <textarea
                value={form.siteDescription}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    siteDescription: e.target.value,
                  }))
                }
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Tell customers what your store is about…"
              />
            </Field>

            <div className="grid gap-8 border-t border-[hsl(var(--border))] pt-7 sm:grid-cols-2">
              <ImageUploadField
                label="Logo"
                hint="Transparent PNG or SVG recommended."
                aspect="square"
                value={form.logo}
                onChange={(url) =>
                  setForm((f) => ({
                    ...f,
                    logo: url,
                  }))
                }
              />

              <ImageUploadField
                label="Favicon"
                hint="Square, at least 32×32px."
                aspect="icon"
                value={form.favicon}
                onChange={(url) =>
                  setForm((f) => ({
                    ...f,
                    favicon: url,
                  }))
                }
              />
            </div>
          </div>
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* 02 Contact                                                       */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          number="02"
          icon={Mail}
          title="Contact"
          description="Public contact information."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email">
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contactEmail: e.target.value,
                  }))
                }
                className={inputCls}
                placeholder="hello@example.com"
              />
            </Field>

            <Field label="Phone">
              <input
                value={form.contactPhone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contactPhone: e.target.value,
                  }))
                }
                className={inputCls}
                placeholder="+44…"
              />
            </Field>
          </div>
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* 03 Address                                                       */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          number="03"
          icon={MapPin}
          title="Business address"
          description="Shown on the storefront contact page."
        >
          <div className="space-y-5">
            <Field label="Street">
              <input
                value={form.address.street}
                onChange={(e) => updateAddress("street", e.target.value)}
                className={inputCls}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="City">
                <input
                  value={form.address.city}
                  onChange={(e) => updateAddress("city", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="State / Region">
                <input
                  value={form.address.state}
                  onChange={(e) => updateAddress("state", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Postal code">
                <input
                  value={form.address.postalCode}
                  onChange={(e) => updateAddress("postalCode", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Country">
              <input
                value={form.address.country}
                onChange={(e) => updateAddress("country", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* 04 Regional                                                      */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          number="04"
          icon={Globe2}
          title="Regional"
          description="Currency, locale and timezone."
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Currency">
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    currency: e.target.value,
                  }))
                }
                className={inputCls}
              >
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
              </select>
            </Field>

            <Field label="Locale">
              <input
                value={form.locale}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    locale: e.target.value,
                  }))
                }
                className={inputCls}
              />
            </Field>

            <Field label="Timezone">
              <input
                value={form.timezone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    timezone: e.target.value,
                  }))
                }
                className={inputCls}
              />
            </Field>
          </div>
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* 05 SEO                                                           */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          number="05"
          icon={SearchIcon}
          title="SEO defaults"
          description="Fallback metadata for pages without custom metadata."
        >
          <div className="space-y-7">
            <Field
              label="Default meta title"
              hint={`${form.seo.defaultMetaTitle.length}/70 characters`}
            >
              <input
                value={form.seo.defaultMetaTitle}
                onChange={(e) => updateSeo("defaultMetaTitle", e.target.value)}
                maxLength={70}
                className={inputCls}
              />
            </Field>

            <Field
              label="Default meta description"
              hint={`${form.seo.defaultMetaDescription.length}/160 characters`}
            >
              <textarea
                value={form.seo.defaultMetaDescription}
                onChange={(e) =>
                  updateSeo("defaultMetaDescription", e.target.value)
                }
                maxLength={160}
                rows={4}
                className={`${inputCls} resize-none`}
              />
            </Field>

            <div className="border-t border-[hsl(var(--border))] pt-7">
              <ImageUploadField
                label="Default OG image"
                hint="1200×630px recommended for social sharing."
                aspect="wide"
                value={form.seo.ogImage}
                onChange={(url) => updateSeo("ogImage", url)}
              />
            </div>
          </div>
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* 06 Social                                                        */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          number="06"
          icon={Share2}
          title="Social links"
          description="Links displayed in the storefront footer."
        >
          <div>
            <div className="mb-5 flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Add the social profiles customers should be able to find.
              </p>

              <button
                type="button"
                onClick={addSocialLink}
                className="inline-flex items-center gap-1.5 border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <Plus size={13} />
                Add link
              </button>
            </div>

            {form.socialLinks.length === 0 ? (
              <div className="border border-dashed border-[hsl(var(--border))] px-5 py-8 text-center">
                <Share2
                  size={18}
                  className="mx-auto text-[hsl(var(--muted-foreground))]"
                />

                <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                  No social links configured.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {form.socialLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[130px_1fr_auto] items-center gap-2"
                  >
                    <input
                      value={link.platform}
                      onChange={(e) =>
                        updateSocialLink(idx, {
                          platform: e.target.value,
                        })
                      }
                      placeholder="Instagram"
                      className={inputCls}
                    />

                    <input
                      value={link.url}
                      onChange={(e) =>
                        updateSocialLink(idx, {
                          url: e.target.value,
                        })
                      }
                      placeholder="https://instagram.com/…"
                      className={inputCls}
                    />

                    <button
                      type="button"
                      onClick={() => removeSocialLink(idx)}
                      className="flex h-[41px] w-[41px] items-center justify-center border border-transparent text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
                      aria-label="Remove social link"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* 07 Features                                                      */}
        {/* ---------------------------------------------------------------- */}

        <SettingsSection
          number="07"
          icon={SlidersHorizontal}
          title="Features"
          description="Control customer-facing functionality."
        >
          <div className="divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">
            {(
              [
                [
                  "reviewsEnabled",
                  "Product reviews",
                  "Allow customers to leave reviews.",
                ],
                [
                  "wishlistEnabled",
                  "Wishlist",
                  "Allow customers to save products.",
                ],
                [
                  "guestCheckoutEnabled",
                  "Guest checkout",
                  "Allow checkout without creating an account.",
                ],
              ] as const
            ).map(([key, label, desc]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-6 py-5"
              >
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {label}
                  </p>

                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {desc}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={form[key]}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      [key]: !f[key],
                    }))
                  }
                  className={`relative h-5 w-9 shrink-0 transition-colors ${
                    form[key]
                      ? "bg-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--muted-foreground))]/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 bg-white transition-transform ${
                      form[key] ? "translate-x-0.5" : "-translate-x-4"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </SettingsSection>

        {/* ---------------------------------------------------------------- */}
        {/* Bottom action                                                     */}
        {/* ---------------------------------------------------------------- */}

        <div className="flex flex-col items-end gap-3 border-t border-[hsl(var(--border))] pt-7 sm:flex-row sm:justify-end">
          {isDirty && !saving && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[hsl(var(--muted-foreground))]">
              Unsaved changes
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex w-full items-center justify-center gap-2 bg-[hsl(var(--primary))] px-6 py-3 text-xs font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <CheckCircle size={14} />
            ) : (
              <Save size={14} />
            )}

            {saved ? "Changes saved" : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
}
