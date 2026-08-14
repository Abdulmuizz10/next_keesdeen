import { Suspense } from "react";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterSkeleton() {
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 sm:px-12 lg:px-20 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center lg:text-left mb-12">
            <div className="h-9 w-36 bg-neutral-100 mx-auto lg:mx-0 animate-pulse" />
            <div className="mt-3 h-4 w-44 bg-neutral-50 mx-auto lg:mx-0 animate-pulse" />
          </div>
          <div className="h-12 border border-neutral-100 animate-pulse mb-8" />
          <div className="space-y-6">
            <div>
              <div className="h-3 w-16 bg-neutral-100 mb-2 animate-pulse" />
              <div className="h-12 border-b border-neutral-200 animate-pulse" />
            </div>
            <div>
              <div className="h-3 w-20 bg-neutral-100 mb-2 animate-pulse" />
              <div className="h-12 border-b border-neutral-200 animate-pulse" />
            </div>
            <div>
              <div className="h-3 w-16 bg-neutral-100 mb-2 animate-pulse" />
              <div className="h-12 border-b border-neutral-200 animate-pulse" />
            </div>
            <div className="h-12 bg-neutral-100 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="hidden lg:block bg-neutral-900 animate-pulse" />
    </main>
  );
}
