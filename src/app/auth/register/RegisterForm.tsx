"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthBrandPanel } from "@/components/admin/AuthBrandPanel";
import { PasswordInput } from "@/components/auth/PasswordInput";
import Image from "next/image";
import { mainLogo } from "@/assets";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Register
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : Object.values(data.error).flat().join(", ");
        setErrorMessage(msg);
        setIsLoading(false);
        return;
      }

      // Auto sign-in after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        // Registration succeeded but auto-login failed — redirect to login
        router.push("/auth/login");
      }
    } catch {
      setErrorMessage("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex items-center justify-center px-6 sm:px-12 lg:px-20 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="text-center mb-12">
            <Link href="/" className="inline-block">
              <Image
                key={"brand-logo"}
                src={mainLogo}
                alt="Brand logo"
                width={100}
                height={100}
                className="w-[140px] h-auto lg:w-[180px] lg:h-10"
                priority
              />
            </Link>
            <p className="mt-3 text-[11px] font-sans uppercase tracking-[0.12em] text-neutral-400">
              Create your account
            </p>
          </div>

          {/* Google Sign-Up */}
          <GoogleSignInButton
            callbackUrl={callbackUrl}
            label="Sign up with Google"
          />

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-[10px] font-sans uppercase tracking-widest text-neutral-400">
              or continue with email
            </span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="mb-8 py-3 px-4 border border-red-200 bg-red-50 text-sm text-red-600 font-sans">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                autoComplete="name"
                className="w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2"
              >
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2"
              >
                Password
              </label>
              <PasswordInput
                id="reg-password"
                value={password}
                onChange={setPassword}
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 focus:outline-none disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Creating account…
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-xs font-sans text-neutral-400">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-neutral-600 hover:text-primary-500 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Brand side */}
      <AuthBrandPanel />
    </main>
  );
}
