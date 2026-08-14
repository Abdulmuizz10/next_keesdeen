import mongoose from "mongoose";
import Product from "@/lib/models/Product";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI)
  throw new Error("Please define MONGODB_URI environment variable");

async function backfillLowStockThreshold() {
  try {
    console.log("🌱 Starting full backfill...");
    await mongoose.connect(MONGODB_URI as string);

    const result = await Product.updateMany(
      {
        variants: {
          $elemMatch: {
            lowStockThreshold: { $exists: false },
          },
        },
      },
      {
        $set: {
          "variants.$[variant].lowStockThreshold": 5,
        },
      },
      {
        arrayFilters: [
          {
            "variant.lowStockThreshold": { $exists: false },
          },
        ],
      },
    );

    console.log("Low-stock threshold migration complete.");
    console.log(`Matched products: ${result.matchedCount}`);
    console.log(`Modified products: ${result.modifiedCount}`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

backfillLowStockThreshold();
