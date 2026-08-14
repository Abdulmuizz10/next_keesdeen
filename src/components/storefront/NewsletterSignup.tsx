"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface NewsletterSignupProps {
  source?: string;
  variant?: "inline" | "footer" | "hero";
  title?: string;
  subtitle?: string;
}

export function NewsletterSignup({
  source = "website",
  variant = "inline",
  title,
  subtitle,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          source,
          _hp: honeypotRef.current?.value || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (data.alreadySubscribed) {
        setMessage("You're already subscribed!");
      } else if (data.resubscribed) {
        setMessage("Welcome back! You've been resubscribed.");
      } else {
        setMessage("Thanks for subscribing!");
      }

      setStatus("success");
      setEmail("");
      setFirstName("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (variant === "footer") {
    return (
      <div>
        {title && (
          <h3 className="font-serif text-lg font-semibold text-white mb-2">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-neutral-300 mb-4">{subtitle}</p>
        )}

        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-primary-300"
            >
              <CheckCircle size={18} />
              <span className="text-sm">{message}</span>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20  text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="px-5 py-2.5 bg-primary-400 text-white text-sm font-semibold  hover:bg-primary-500 disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                >
                  {status === "loading" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Join"
                  )}
                </button>
              </div>

              {/* Honeypot — hidden from humans, bots fill it */}
              <input
                ref={honeypotRef}
                type="text"
                name="_hp_field"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  opacity: 0,
                  height: 0,
                }}
              />

              {status === "error" && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {message}
                </p>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Inline / Hero variant
  return (
    <div className={variant === "hero" ? "text-center" : ""}>
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 py-3 text-primary-500"
          >
            <CheckCircle size={20} />
            <span className="font-medium">{message}</span>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className={`flex flex-wrap gap-3 ${variant === "hero" ? "max-w-md mx-auto" : ""}`}
          >
            {variant === "hero" && (
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="flex-1 px-5 py-3 bg-white/10 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-400 font-sans"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className={`flex-1 px-5 py-3 border focus:outline-none focus:ring-2 focus:ring-primary-400 font-sans ${
                variant === "hero"
                  ? "bg-white/10 border-gray-600"
                  : "bg-white border-neutral-200 text-neutral-600 placeholder:text-neutral-400"
              }`}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full sm:block px-8 py-3 bg-primary-400 text-white font-sans font-semibold  hover:bg-primary-500 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {status === "loading" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Subscribe"
              )}
            </button>

            {/* Honeypot */}
            <input
              ref={honeypotRef}
              type="text"
              name="_hp_field"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                opacity: 0,
                height: 0,
              }}
            />
          </motion.form>
        )}
      </AnimatePresence>

      {status === "error" && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1 justify-center">
          <AlertCircle size={14} />
          {message}
        </p>
      )}
    </div>
  );
}
