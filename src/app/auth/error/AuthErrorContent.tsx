"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification link has expired or has already been used.",
  Default: "An error occurred during authentication.",
  CredentialsSignin: "Invalid email or password. Please try again.",
};

export function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessage = error
    ? errorMessages[error] || errorMessages.Default
    : errorMessages.Default;

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm text-center"
      >
        {/* Logo */}
        <div className="mb-12">
          <Link href="/" className="inline-block">
            <h1 className="font-serif text-3xl font-light tracking-wide text-neutral-600">
              Keesdeen
            </h1>
          </Link>
        </div>

        {/* Error Content */}
        <div className="border sf-border p-10">
          <div className="w-12 h-12 border sf-border flex items-center justify-center mx-auto mb-6">
            <span className="text-neutral-400 text-lg">!</span>
          </div>

          <h2 className="font-serif text-2xl font-light text-neutral-600 mb-4">
            Authentication Error
          </h2>

          <p className="text-sm font-sans text-neutral-400 mb-8 leading-relaxed">
            {errorMessage}
          </p>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3.5 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 transition-colors"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full py-3 border sf-border text-neutral-600 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-neutral-50 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
