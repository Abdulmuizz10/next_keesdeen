import mongoose from "mongoose";
import Subscriber from "@/lib/models/Subscriber";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI)
  throw new Error("Please define MONGODB_URI environment variable");

// Resend rejects an ENTIRE batch send if even one recipient is at a
// reserved/example domain (example.com/.org/.net, test.com) — that's what
// broke "Send Broadcast." This rewrites just the domain on any subscriber
// stuck with one of those, keeping the local part (before the @) so emails
// stay recognizable and stay unique.
const RESERVED_DOMAINS = [
  "example.com",
  "example.org",
  "example.net",
  "test.com",
];
const REPLACEMENT_DOMAIN = "seedmail.dev";

async function fixSubscriberEmails() {
  try {
    console.log("🌱 Starting subscriber email backfill...");
    await mongoose.connect(MONGODB_URI as string);

    const pattern = new RegExp(
      `@(${RESERVED_DOMAINS.map((d) => d.replace(".", "\\.")).join("|")})$`,
      "i",
    );

    const affected = await Subscriber.find({ email: pattern });
    console.log(`Found ${affected.length} subscriber(s) on reserved domains`);

    let updated = 0;
    let skipped = 0;

    for (const sub of affected) {
      const localPart = sub.email.split("@")[0];
      const newEmail = `${localPart}@${REPLACEMENT_DOMAIN}`;

      const clash = await Subscriber.findOne({
        email: newEmail,
        _id: { $ne: sub._id },
      });
      if (clash) {
        console.warn(
          `⚠️  Skipping ${sub.email} — ${newEmail} is already taken by another subscriber`,
        );
        skipped++;
        continue;
      }

      sub.email = newEmail;
      await sub.save();
      updated++;
    }

    // Optionally add a real inbox you can actually check, if it's not
    // already a subscriber. Set SEED_TEST_EMAIL in your .env first.
    if (process.env.SEED_TEST_EMAIL) {
      const exists = await Subscriber.findOne({
        email: process.env.SEED_TEST_EMAIL,
      });
      if (!exists) {
        await Subscriber.create({
          email: process.env.SEED_TEST_EMAIL,
          firstName: "Real",
          lastName: "Test Recipient",
          source: "migration-script",
          status: "active",
          tags: ["real-test-recipient"],
        });
        console.log(
          `➕ Added real test subscriber: ${process.env.SEED_TEST_EMAIL}`,
        );
      }
    } else {
      console.warn(
        "⚠️  SEED_TEST_EMAIL not set — no real inbox added. Set it in .env if you " +
          "want a subscriber you can actually check broadcast delivery against.",
      );
    }

    console.log("migration complete.");
    console.log(`Matched subscribers: ${affected.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (email clash): ${skipped}`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

fixSubscriberEmails();
