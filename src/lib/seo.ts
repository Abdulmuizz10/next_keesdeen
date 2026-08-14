import "server-only";
/**
 * Structured data (JSON-LD) builders.
 * Output goes into <script type="application/ld+json"> on product/category pages.
 */

export interface ProductJsonLdInput {
  name: string;
  description: string;
  slug: string;
  images: string[];
  basePrice: number;
  effectivePrice: number;
  currency: string;
  sku: string;
  inStock: boolean;
  brand: string;
  avgRating: number;
  reviewCount: number;
  categoryName?: string;
}

export function buildProductJsonLd(p: ProductJsonLdInput): Record<string, unknown> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://keesdeen.com";

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images,
    sku: p.sku,
    brand: { "@type": "Brand", name: p.brand },
    url: `${baseUrl}/product/${p.slug}`,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/product/${p.slug}`,
      priceCurrency: p.currency,
      price: (p.effectivePrice / 100).toFixed(2),
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: p.brand },
    },
  };

  if (p.categoryName) {
    ld.category = p.categoryName;
  }

  if (p.reviewCount > 0 && p.avgRating > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.avgRating.toFixed(1),
      reviewCount: p.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return ld;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://keesdeen.com";

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

export function buildCategoryJsonLd(name: string, slug: string, description?: string): Record<string, unknown> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://keesdeen.com";

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description: description || `Shop ${name} at Keesdeen`,
    url: `${baseUrl}/category/${slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "Keesdeen",
      url: baseUrl,
    },
  };
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://keesdeen.com";

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Keesdeen",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      "https://instagram.com/keesdeen",
      "https://facebook.com/keesdeen",
      "https://pinterest.com/keesdeen",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "hello@keesdeen.com",
    },
  };
}
