import { notFound } from "next/navigation";
import { Metadata } from "next";
import dbConnect from "@/lib/db";
import Product from "@/lib/models/Product";
import Category from "@/lib/models/Category";
import {
  getEffectivePrice,
  getBatchPricing,
  PricingResult,
} from "@/lib/pricing";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { VariantSelector } from "@/components/storefront/VariantSelector";
import { ProductInfo } from "@/components/storefront/ProductInfo";
import { ProductReviews } from "@/components/storefront/ProductReviews";
import { YouMayLike } from "@/components/storefront/YouMayLike";
import { FrequentlyBoughtTogether } from "@/components/storefront/FrequentlyBoughtTogether";
import Bundle from "@/lib/models/Bundle";
import { buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";

export const revalidate = 60; // ISR: revalidate every 60 seconds

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  await dbConnect();
  const { slug } = await params;
  const product = await Product.findOne({ slug, status: "published" }).lean();
  const baseUrl = process.env.NEXTAUTH_URL || "https://keesdeen.com";

  if (!product) {
    return { title: "Product Not Found" };
  }

  const title = product.seo?.metaTitle || product.title;
  const description =
    product.seo?.metaDescription || product.description.substring(0, 160);

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/product/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/product/${product.slug}`,
      type: "website",
      images: product.images.slice(0, 4).map((img) => ({
        url: img,
        alt: product.title,
      })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.images[0] ? [product.images[0]] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  await dbConnect();
  const { slug } = await params;

  const product = await Product.findOne({ slug, status: "published" }).lean();

  if (!product) {
    notFound();
  }

  // Get categories for breadcrumbs
  const categories = await Category.find({
    _id: { $in: product.categoryIds },
    isActive: true,
  }).lean();

  // Get pricing for all variants
  const variantPricing: Record<string, PricingResult> = {};
  for (const variant of product.variants) {
    if (variant.isActive) {
      const pricing = await getEffectivePrice({
        product: product as never,
        variant: variant as never,
      });
      variantPricing[variant.sku] = pricing;
    }
  }

  // Serialize product data for client components
  const serializedProduct = {
    _id: product._id.toString(),
    slug: product.slug,
    title: product.title,
    description: product.description,
    images: product.images,
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency,
    avgRating: product.avgRating,
    reviewCount: product.reviewCount,
    variants: product.variants.map((v) => ({
      sku: v.sku,
      attributes: {
        size: v.attributes.size,
        color: v.attributes.color,
        colorHex: v.attributes.colorHex,
      },
      price: v.price,
      stock: v.stock,
      images: v.images || [],
      isActive: v.isActive,
    })),
    tags: product.tags,
  };

  const serializedCategories = categories.map((cat) => ({
    _id: cat._id.toString(),
    name: cat.name,
    slug: cat.slug,
  }));

  // Serialize pricing results
  const serializedPricing: Record<
    string,
    {
      originalPrice: number;
      effectivePrice: number;
      discountAmount: number;
      discountPercentage: number;
      hasDiscount: boolean;
      freeItemEligible: boolean;
      promotionName: string | null;
    }
  > = {};

  Object.entries(variantPricing).forEach(([sku, pricing]) => {
    serializedPricing[sku] = {
      originalPrice: pricing.originalPrice,
      effectivePrice: pricing.effectivePrice,
      discountAmount: pricing.discountAmount,
      discountPercentage: pricing.discountPercentage,
      hasDiscount: pricing.discountAmount > 0,
      freeItemEligible: pricing.freeItemEligible,
      promotionName: pricing.promotionApplied?.name || null,
    };
  });

  // Fetch related products (same category, excluding current)
  const relatedProducts = await Product.find({
    _id: { $ne: product._id },
    categoryIds: { $in: product.categoryIds },
    status: "published",
  })
    .sort({ totalSold: -1 })
    .limit(4)
    .lean();

  const relatedPricing = await getBatchPricing(relatedProducts as never[]);

  const serializedRelated = relatedProducts.map((rp) => {
    const rPricing = relatedPricing.get(rp._id.toString());
    return {
      _id: rp._id.toString(),
      slug: rp.slug,
      title: rp.title,
      image: rp.images[0] || "",
      effectivePrice: rPricing?.effectivePrice || rp.basePrice,
      originalPrice: rPricing?.originalPrice || rp.basePrice,
      hasDiscount: (rPricing?.discountAmount || 0) > 0,
      discountPercentage: rPricing?.discountPercentage || 0,
    };
  });

  // Fetch "Frequently Bought Together" bundle
  const bundle = await Bundle.findOne({
    productId: product._id,
    isActive: true,
  }).lean();
  let serializedBundleItems: {
    _id: string;
    slug: string;
    title: string;
    image: string;
    effectivePrice: number;
    originalPrice: number;
    variantSku: string;
    stock: number;
  }[] = [];
  let bundleTitle = "";

  if (bundle && bundle.itemProductIds.length > 0) {
    bundleTitle = bundle.title || "";
    const bundleProducts = await Product.find({
      _id: { $in: bundle.itemProductIds },
      status: "published",
    }).lean();
    const bundlePricing = await getBatchPricing(bundleProducts as never[]);

    serializedBundleItems = bundleProducts.map((bp) => {
      const bPricing = bundlePricing.get(bp._id.toString());
      const bVariant = bp.variants.find((v) => v.isActive) || bp.variants[0];
      return {
        _id: bp._id.toString(),
        slug: bp.slug,
        title: bp.title,
        image: bp.images[0] || "",
        effectivePrice: bPricing?.effectivePrice || bp.basePrice,
        originalPrice: bPricing?.originalPrice || bp.basePrice,
        variantSku: bVariant?.sku || "",
        stock: bVariant?.stock || 0,
      };
    });
  }

  // Anchor product card for the bundle
  const anchorVariant =
    product.variants.find((v) => v.isActive) || product.variants[0];
  const anchorPricing = anchorVariant
    ? variantPricing[anchorVariant.sku]
    : null;
  const serializedAnchor = {
    _id: product._id.toString(),
    slug: product.slug,
    title: product.title,
    image: product.images[0] || "",
    effectivePrice: anchorPricing?.effectivePrice || product.basePrice,
    originalPrice: anchorPricing?.originalPrice || product.basePrice,
    variantSku: anchorVariant?.sku || "",
    stock: anchorVariant?.stock || 0,
  };

  // Build JSON-LD structured data
  const firstVariant =
    product.variants.find((v) => v.isActive) || product.variants[0];
  const firstVariantPricing = firstVariant
    ? variantPricing[firstVariant.sku]
    : null;
  const totalStock = product.variants.reduce(
    (sum, v) => sum + (v.isActive ? v.stock : 0),
    0,
  );

  const productJsonLd = buildProductJsonLd({
    name: product.title,
    description: product.description.substring(0, 500),
    slug: product.slug,
    images: product.images,
    basePrice: product.basePrice,
    effectivePrice: firstVariantPricing?.effectivePrice || product.basePrice,
    currency: product.currency || "GBP",
    sku: firstVariant?.sku || product.slug,
    inStock: totalStock > 0,
    brand: "Keesdeen",
    avgRating: product.avgRating,
    reviewCount: product.reviewCount,
    categoryName: categories[0]?.name,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    ...(categories[0]
      ? [{ name: categories[0].name, url: `/category/${categories[0].slug}` }]
      : []),
    { name: product.title, url: `/product/${product.slug}` },
  ]);

  return (
    <main className="min-h-screen bg-white mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-8 lg:mt-20">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav>
        <div className="py-4">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                href="/"
                className="text-neutral-400 hover:text-primary-500 transition-colors"
              >
                Home
              </Link>
            </li>
            {serializedCategories[0] && (
              <>
                <li className="text-neutral-300">/</li>
                <li>
                  <a
                    href={`/category/${serializedCategories[0].slug}`}
                    className="text-neutral-400 hover:text-primary-500 transition-colors"
                  >
                    {serializedCategories[0].name}
                  </a>
                </li>
              </>
            )}
            <li className="text-neutral-300">/</li>
            <li className="text-neutral-600 font-medium truncate max-w-[200px]">
              {serializedProduct.title}
            </li>
          </ol>
        </div>
      </nav>

      {/* Product Content */}
      <div className="">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          {/* Left: Image Gallery */}
          <ProductGallery
            images={serializedProduct.images}
            title={serializedProduct.title}
          />

          {/* Right: Product Info */}
          <div className="mt-8 lg:mt-0">
            <ProductInfo
              product={serializedProduct}
              categories={serializedCategories}
              pricing={serializedPricing}
            />

            <VariantSelector
              product={serializedProduct}
              pricing={serializedPricing}
            />
          </div>
        </div>

        {/* Product Description */}
        <section className="mt-16 border-t border-neutral-200 pt-12">
          <h2 className="font-serif text-2xl font-semibold text-neutral-600 mb-6">
            Product Details
          </h2>
          <div className="prose prose-neutral max-w-none">
            <p className="text-neutral-500 whitespace-pre-line leading-relaxed">
              {serializedProduct.description}
            </p>
          </div>

          {/* Tags */}
          {serializedProduct.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {serializedProduct.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-neutral-100 text-neutral-500 text-sm "
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Frequently Bought Together */}
        {serializedBundleItems.length > 0 && (
          <FrequentlyBoughtTogether
            anchorProduct={serializedAnchor}
            bundleItems={serializedBundleItems}
            bundleTitle={bundleTitle}
          />
        )}

        {/* Reviews Section */}
        <ProductReviews
          productId={serializedProduct._id}
          avgRating={serializedProduct.avgRating}
          reviewCount={serializedProduct.reviewCount}
        />

        {/* You May Also Like */}
        <YouMayLike products={serializedRelated} />
      </div>
    </main>
  );
}
