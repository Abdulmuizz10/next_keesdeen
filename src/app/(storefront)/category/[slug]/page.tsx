import { notFound } from "next/navigation";
import { Metadata } from "next";
import dbConnect from "@/lib/db";
import Category from "@/lib/models/Category";
import Product from "@/lib/models/Product";
import { getBatchPricing } from "@/lib/pricing";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { CategoryFilters } from "@/components/storefront/CategoryFilters";
import { buildCategoryJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 60; // ISR: revalidate every 60 seconds

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  await dbConnect();
  const { slug } = await params;
  const category = await Category.findOne({ slug, isActive: true }).lean();
  const baseUrl = process.env.NEXTAUTH_URL || "https://keesdeen.com";

  if (!category) {
    return { title: "Category Not Found" };
  }

  const title =
    category.seo?.metaTitle || `${category.name} — Leather ${category.name}`;
  const description =
    category.seo?.metaDescription ||
    category.description ||
    `Shop ${category.name} at Keesdeen. Premium handcrafted leather goods.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/category/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/category/${category.slug}`,
      type: "website",
      ...(category.image
        ? { images: [{ url: category.image, alt: category.name }] }
        : {}),
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  await dbConnect();
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const category = await Category.findOne({ slug, isActive: true }).lean();

  if (!category) {
    notFound();
  }

  // Parse filter params
  const colorFilter = resolvedSearchParams.color
    ? Array.isArray(resolvedSearchParams.color)
      ? resolvedSearchParams.color
      : [resolvedSearchParams.color]
    : [];
  const sizeFilter = resolvedSearchParams.size
    ? Array.isArray(resolvedSearchParams.size)
      ? resolvedSearchParams.size
      : [resolvedSearchParams.size]
    : [];
  const minPrice = resolvedSearchParams.minPrice
    ? Number(resolvedSearchParams.minPrice)
    : undefined;
  const maxPrice = resolvedSearchParams.maxPrice
    ? Number(resolvedSearchParams.maxPrice)
    : undefined;
  const sortBy = (resolvedSearchParams.sort as string) || "featured";

  // Build query for published products in this category
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    categoryIds: category._id,
    status: "published",
  };

  // Apply variant filters if specified
  if (colorFilter.length > 0 || sizeFilter.length > 0) {
    query["variants"] = {
      $elemMatch: {
        isActive: true,
        ...(colorFilter.length > 0 && {
          "attributes.color": { $in: colorFilter },
        }),
        ...(sizeFilter.length > 0 && {
          "attributes.size": { $in: sizeFilter },
        }),
      },
    };
  }

  // Apply price filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.basePrice = {};
    if (minPrice !== undefined) query.basePrice.$gte = minPrice;
    if (maxPrice !== undefined) query.basePrice.$lte = maxPrice;
  }

  // Sort options
  const sortOptions: Record<string, Record<string, 1 | -1>> = {
    featured: { isFeatured: -1, createdAt: -1 },
    newest: { createdAt: -1 },
    "price-asc": { basePrice: 1 },
    "price-desc": { basePrice: -1 },
    rating: { avgRating: -1 },
  };

  const products = await Product.find(query)
    .sort(sortOptions[sortBy] || sortOptions.featured)
    .lean();

  // Get pricing for all products
  const pricingMap = await getBatchPricing(products as never[]);

  // Extract available filter options from all products in category
  const allProducts = await Product.find({
    categoryIds: category._id,
    status: "published",
  }).lean();

  const availableColors = new Set<string>();
  const availableSizes = new Set<string>();
  const colorHexMap = new Map<string, string>();

  allProducts.forEach((product) => {
    product.variants.forEach((variant) => {
      if (variant.isActive) {
        if (variant.attributes.color) {
          availableColors.add(variant.attributes.color);
          if (variant.attributes.colorHex) {
            colorHexMap.set(
              variant.attributes.color,
              variant.attributes.colorHex,
            );
          }
        }
        if (variant.attributes.size) {
          availableSizes.add(variant.attributes.size);
        }
      }
    });
  });

  // Serialize products with pricing
  const serializedProducts = products.map((product) => {
    const pricing = pricingMap.get(product._id.toString());
    return {
      _id: product._id.toString(),
      slug: product.slug,
      title: product.title,
      images: product.images,
      basePrice: product.basePrice,
      compareAtPrice: product.compareAtPrice,
      variants: product.variants.map((v) => ({
        ...v,
        attributes: v.attributes,
      })),
      avgRating: product.avgRating,
      reviewCount: product.reviewCount,
      pricing: pricing
        ? {
            effectivePrice: pricing.effectivePrice,
            originalPrice: pricing.originalPrice,
            discountPercentage: pricing.discountPercentage,
            hasDiscount: pricing.discountAmount > 0,
          }
        : null,
    };
  });

  const filterOptions = {
    colors: Array.from(availableColors).map((color) => ({
      name: color,
      hex: colorHexMap.get(color) || "#888888",
    })),
    sizes: Array.from(availableSizes),
  };

  const categoryJsonLd = buildCategoryJsonLd(
    category.name,
    category.slug,
    category.description,
  );
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: category.name, url: `/category/${category.slug}` },
  ]);

  return (
    <main className="bg-white min-h-screen">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Category Header */}
      <section className="bg-white border-b border-neutral-100">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-neutral-600">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-4 text-lg text-neutral-400 max-w-2xl">
              {category.description}
            </p>
          )}
        </div>
      </section>

      {/* Filters + Products */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:col-span-1 mb-8 lg:mb-0">
            <CategoryFilters
              filterOptions={filterOptions}
              activeColors={colorFilter}
              activeSizes={sizeFilter}
              minPrice={minPrice}
              maxPrice={maxPrice}
              sortBy={sortBy}
            />
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-neutral-400">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
            </div>

            {products.length > 0 ? (
              <ProductGrid products={serializedProducts} />
            ) : (
              <div className="text-center py-16">
                <p className="text-neutral-400">
                  No products found matching your filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
