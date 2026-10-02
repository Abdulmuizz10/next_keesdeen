/**
 * One-off maintenance script: recompute every product's avgRating and
 * reviewCount from actual approved Review documents, instead of trusting
 * whatever static numbers may have been seeded directly onto the product.
 *
 * Run once with: npx tsx lib/recompute-product-ratings.ts
 * (adjust the import paths below if your models live elsewhere relative
 * to wherever you place this file)
 */
import mongoose from "mongoose";
import "dotenv/config";

import Product from "./models/Product";
import Review from "./models/Review";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI environment variable");
}

async function recomputeAll() {
  console.log("🔧 Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI as string);

  const products = await Product.find()
    .select("_id title avgRating reviewCount")
    .lean();
  console.log(`📦 Found ${products.length} products — recomputing ratings…`);

  let changed = 0;

  for (const product of products) {
    const stats = await Review.aggregate([
      { $match: { productId: product._id, status: "approved" } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const avgRating = stats[0] ? Math.round(stats[0].avgRating * 10) / 10 : 0;
    const reviewCount = stats[0]?.reviewCount || 0;

    if (
      avgRating !== product.avgRating ||
      reviewCount !== product.reviewCount
    ) {
      await Product.findByIdAndUpdate(product._id, { avgRating, reviewCount });
      console.log(
        `  ✏️  ${product.title}: ${product.avgRating ?? 0}★ (${product.reviewCount ?? 0}) → ${avgRating}★ (${reviewCount})`,
      );
      changed++;
    }
  }

  console.log(
    `\n✅ Done. ${changed} of ${products.length} products corrected.`,
  );
  await mongoose.disconnect();
  process.exit(0);
}

recomputeAll().catch((err) => {
  console.error("❌ Recompute failed:", err);
  process.exit(1);
});
