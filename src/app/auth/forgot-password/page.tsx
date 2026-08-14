"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError("Too many requests. Please wait a few minutes.");
        setIsLoading(false);
        return;
      }

      // Always show success — never reveal whether the email exists
      setSubmitted(true);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-12">
          <Link href="/" className="inline-block">
            <h1 className="font-serif text-3xl font-light tracking-wide text-neutral-600">Keesdeen</h1>
          </Link>
          <p className="mt-3 text-[11px] font-sans uppercase tracking-[0.12em] text-neutral-400">
            Reset your password
          </p>
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="w-12 h-12 border sf-border flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={20} className="text-primary-500" />
            </div>
            <h2 className="font-serif text-xl font-light text-neutral-600 mb-3">Check your email</h2>
            <p className="text-sm font-sans text-neutral-400 leading-relaxed mb-8">
              If an account exists for <strong className="text-neutral-600">{email}</strong>,
              we&apos;ve sent password reset instructions.
            </p>
            <Link href="/auth/login" className="inline-flex items-center gap-2 text-xs font-sans uppercase tracking-[0.08em] text-neutral-500 hover:text-neutral-600 transition-colors">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm font-sans text-neutral-400 leading-relaxed mb-8 text-center">
              Enter the email associated with your account and we&apos;ll send you a link to reset your password.
            </p>

            {error && (
              <div className="mb-6 py-3 px-4 border border-red-200 bg-red-50 text-sm text-red-600 font-sans">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="reset-email" className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2">
                  Email Address
                </label>
                <input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  className="w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent"
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors"
              >
                {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Sending…</span> : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-10 text-center">
              <Link href="/auth/login" className="inline-flex items-center gap-2 text-xs font-sans text-neutral-400 hover:text-neutral-600 transition-colors">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}
