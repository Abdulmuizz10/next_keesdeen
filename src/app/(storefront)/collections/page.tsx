import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collections",
  description: "Explore our curated leather goods collections.",
};

export default async function CollectionsIndexPage() {
  let collections: {
    _id: string;
    slug: string;
    name: string;
    image?: string;
    description?: string;
  }[] = [];

  try {
    const dbConnect = (await import("@/lib/db")).default;
    const Collection = (await import("@/lib/models/Collection")).default;
    await dbConnect();

    const docs = await Collection.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();

    collections = docs.map((c) => ({
      _id: c._id.toString(),
      slug: c.slug,
      name: c.name,
      image: c.image,
      description: c.description,
    }));
  } catch {
    // Gracefully handle missing DB
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b sf-border">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12 py-14 mt-20 sm:mt-10">
          <h1 className="font-serif text-4xl sm:text-5xl font-light text-neutral-600">
            Collections
          </h1>
          <p className="mt-4 text-sm font-sans text-neutral-400 leading-relaxed">
            Curated edits of our finest leather goods.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-12 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3  gap-0.5">
          {collections?.slice(0, 4).map((col) => (
            <Link
              key={col._id}
              href={`/collections/${col.slug}`}
              className="relative aspect-3/4 overflow-hidden group cursor-pointer block"
            >
              {/* Background */}
              {col.image ? (
                <Image
                  src={col.image}
                  alt={col.name}
                  width={100}
                  height={100}
                  sizes="full"
                  fill
                  priority
                  className="h-full w-full object-cover transition-transform duration-1000 ease-out-expo group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-200" />
              )}

              {/* Dark overlay */}
              <div className="absolute inset-0 z-10 bg-linear-to-t from-black/50 via-black/20 to-transparent group-hover:from-black/60 transition-all duration-700" />

              {/* Label */}
              <div className="absolute bottom-7 left-7 z-20">
                <p className="font-serif! text-[1.8rem] text-white leading-[1.1]">
                  {col.name}
                </p>

                <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-white/60 mt-1">
                  {/* {cat.count} Pieces */}
                </p>

                <span className="inline-flex items-center gap-2.5 text-[10px] font-sans text-gray-50 uppercase tracking-[0.22em] border-b border-white/40 pb-1.5 group-hover:gap-4 transition-all duration-300">
                  Shop Now <ArrowRight size={13} strokeWidth={1.5} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {collections.length === 0 && (
          <div className="text-center py-20">
            <p className="font-serif text-neutral-400">
              No collections available yet.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
