import { Suspense } from "react";
import { AuthErrorContent } from "./AuthErrorContent";

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<ErrorSkeleton />}>
      <AuthErrorContent />
    </Suspense>
  );
}

function ErrorSkeleton() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="border sf-border p-10">
          <div className="w-12 h-12 bg-neutral-100 mx-auto mb-6 animate-pulse" />
          <div className="h-8 bg-neutral-100 mx-auto w-48 mb-3 animate-pulse" />
          <div className="h-4 bg-neutral-50 mx-auto w-56 animate-pulse" />
        </div>
      </div>
    </main>
  );
}
