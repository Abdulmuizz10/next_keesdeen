"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Invalid link state
  if (!token || !email) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="inline-block mb-12">
            <h1 className="font-serif text-3xl font-light tracking-wide text-neutral-600">Keesdeen</h1>
          </Link>
          <div className="w-12 h-12 border sf-border flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={20} className="text-neutral-400" />
          </div>
          <h2 className="font-serif text-xl font-light text-neutral-600 mb-3">Invalid reset link</h2>
          <p className="text-sm font-sans text-neutral-400 leading-relaxed mb-8">
            This password reset link is missing or malformed. Please request a new one.
          </p>
          <Link href="/auth/forgot-password"
            className="inline-block px-8 py-3.5 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 transition-colors"
          >
            Request New Link
          </Link>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Reset failed.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
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
            Set a new password
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-12 h-12 border sf-border flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={20} className="text-primary-500" />
            </div>
            <h2 className="font-serif text-xl font-light text-neutral-600 mb-3">Password updated</h2>
            <p className="text-sm font-sans text-neutral-400 leading-relaxed mb-8">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Link href="/auth/login"
              className="inline-block px-8 py-3.5 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-8 py-3 px-4 border border-red-200 bg-red-50 text-sm text-red-600 font-sans">
                {error}
                {error.includes("expired") && (
                  <Link href="/auth/forgot-password" className="block mt-2 text-xs text-neutral-600 underline">
                    Request a new link
                  </Link>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="new-pw" className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2">
                  New Password
                </label>
                <input id="new-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
                  className="w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirm-pw" className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2">
                  Confirm Password
                </label>
                <input id="confirm-pw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password"
                  className="w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent"
                  placeholder="Repeat password"
                />
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors"
              >
                {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Resetting…</span> : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </main>
  );
}
