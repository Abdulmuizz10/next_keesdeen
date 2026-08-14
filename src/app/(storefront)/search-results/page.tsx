import { Suspense } from "react";
import { SearchResultsContent } from "./SearchResultsContent";

export const dynamic = "force-dynamic";

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchResultsContent />
    </Suspense>
  );
}

function SearchResultsSkeleton() {
  return (
    <main className="bg-white min-h-screen">
      <section className="bg-white border-b border-neutral-100">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
          <div className="h-10 w-64 bg-neutral-200 rounded animate-pulse" />
        </div>
      </section>
      <section className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i}>
              <div className="aspect-3/4 bg-neutral-100  animate-pulse" />
              <div className="mt-3 h-4 bg-neutral-100 rounded animate-pulse w-3/4" />
              <div className="mt-2 h-4 bg-neutral-100 rounded animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
