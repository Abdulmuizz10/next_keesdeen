import { Metadata } from "next";
import dbConnect from "@/lib/db";
import Product from "@/lib/models/Product";
import Category from "@/lib/models/Category";
import { getBatchPricing } from "@/lib/pricing";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { CategoryFilters } from "@/components/storefront/CategoryFilters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop All",
  description: "Browse our full collection of handcrafted leather goods.",
};

interface ShopPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  await dbConnect();
  const resolvedParams = await searchParams;

  const colorFilter = resolvedParams.color
    ? Array.isArray(resolvedParams.color)
      ? resolvedParams.color
      : [resolvedParams.color]
    : [];
  const sizeFilter = resolvedParams.size
    ? Array.isArray(resolvedParams.size)
      ? resolvedParams.size
      : [resolvedParams.size]
    : [];
  const categoryFilter = resolvedParams.category
    ? Array.isArray(resolvedParams.category)
      ? resolvedParams.category[0]
      : resolvedParams.category
    : "";
  const minPrice = resolvedParams.minPrice
    ? Number(resolvedParams.minPrice)
    : undefined;
  const maxPrice = resolvedParams.maxPrice
    ? Number(resolvedParams.maxPrice)
    : undefined;
  const sortBy = (resolvedParams.sort as string) || "newest";
  const page = Math.max(1, parseInt((resolvedParams.page as string) || "1"));
  const perPage = 12;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { status: "published" };

  if (categoryFilter) {
    const cat = await Category.findOne({ slug: categoryFilter, isActive: true })
      .select("_id")
      .lean();
    if (cat) query.categoryIds = cat._id;
  }

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

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.basePrice = {};
    if (minPrice !== undefined) query.basePrice.$gte = minPrice;
    if (maxPrice !== undefined) query.basePrice.$lte = maxPrice;
  }

  const sortOptions: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    "price-asc": { basePrice: 1 },
    "price-desc": { basePrice: -1 },
    rating: { avgRating: -1 },
    featured: { isFeatured: -1, totalSold: -1 },
  };

  const totalCount = await Product.countDocuments(query);
  const totalPages = Math.ceil(totalCount / perPage);

  const products = await Product.find(query)
    .sort(sortOptions[sortBy] || sortOptions.newest)
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean();

  const pricingMap = await getBatchPricing(products as never[]);

  // All published products for filter options
  const allProducts = await Product.find({ status: "published" })
    .select("variants")
    .lean();
  const allCategories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1 })
    .lean();

  const availableColors = new Set<string>();
  const availableSizes = new Set<string>();
  const colorHexMap = new Map<string, string>();

  allProducts.forEach((p) => {
    p.variants.forEach((v) => {
      if (v.isActive) {
        if (v.attributes.color) {
          availableColors.add(v.attributes.color);
          if (v.attributes.colorHex)
            colorHexMap.set(v.attributes.color, v.attributes.colorHex);
        }
        if (v.attributes.size) availableSizes.add(v.attributes.size);
      }
    });
  });

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
    colors: Array.from(availableColors).map((c) => ({
      name: c,
      hex: colorHexMap.get(c) || "#888",
    })),
    sizes: Array.from(availableSizes),
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b sf-border">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12 py-12 mt-20 sm:mt-10">
          <h1 className="font-serif text-4xl sm:text-5xl font-light text-neutral-600">
            Shop All
          </h1>
          <p className="mt-4 text-sm font-sans text-neutral-400 max-w-lg leading-relaxed">
            Browse our full collection of handcrafted leather goods.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
        <div className="lg:grid lg:grid-cols-4 lg:gap-12">
          <aside className="lg:col-span-1 mb-8 lg:mb-0">
            <CategoryFilters
              filterOptions={filterOptions}
              activeColors={colorFilter}
              activeSizes={sizeFilter}
              minPrice={minPrice}
              maxPrice={maxPrice}
              sortBy={sortBy}
            />
            {/* Category filter links */}
            {/* <div className="mt-8">
              <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-3">Category</p>
              <div className="space-y-1">
                <a href="/shop" className={`block py-2 text-sm font-sans transition-colors ${!categoryFilter ? "text-primary-500 font-medium" : "text-neutral-500 hover:text-neutral-600"}`}>
                  All
                </a>
                {allCategories.map((cat) => (
                  <a
                    key={cat._id.toString()}
                    href={`/shop?category=${cat.slug}`}
                    className={`block py-2 text-sm font-sans transition-colors ${categoryFilter === cat.slug ? "text-primary-500 font-medium" : "text-neutral-500 hover:text-neutral-600"}`}
                  >
                    {cat.name}
                  </a>
                ))}
              </div>
            </div> */}
          </aside>

          <div className="lg:col-span-3">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-neutral-400">
                {totalCount} product{totalCount !== 1 ? "s" : ""}
              </p>
            </div>

            {products.length > 0 ? (
              <ProductGrid products={serializedProducts} />
            ) : (
              <div className="text-center py-20">
                <p className="font-serif text-neutral-400">No products found</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => {
                    const params = new URLSearchParams();
                    if (sortBy !== "newest") params.set("sort", sortBy);
                    if (categoryFilter) params.set("category", categoryFilter);
                    colorFilter.forEach((c) => params.append("color", c));
                    sizeFilter.forEach((s) => params.append("size", s));
                    if (minPrice) params.set("minPrice", String(minPrice));
                    if (maxPrice) params.set("maxPrice", String(maxPrice));
                    if (p > 1) params.set("page", String(p));
                    const qs = params.toString();

                    return (
                      <a
                        key={p}
                        href={`/shop${qs ? `?${qs}` : ""}`}
                        className={`w-10 h-10 flex items-center justify-center text-sm font-sans transition-colors ${
                          p === page
                            ? "bg-neutral-600 text-white"
                            : "border sf-border text-neutral-500 hover:bg-neutral-50"
                        }`}
                      >
                        {p}
                      </a>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
