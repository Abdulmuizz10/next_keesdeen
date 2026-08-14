"use client";

import { useState } from "react";
import { Loader2, CheckCircle, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

interface ContactPageClientProps {
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  socialLinks: SocialLink[];
}

function formatAddress(address?: Address) {
  if (!address) return null;
  const lines: string[] = [];
  if (address.street) lines.push(address.street);
  const cityLine = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");
  if (cityLine) lines.push(cityLine);
  if (address.country) lines.push(address.country);
  return lines.length > 0 ? lines : null;
}

export function ContactPageClient({
  contactEmail,
  contactPhone,
  address,
  socialLinks,
}: ContactPageClientProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const addressLines = formatAddress(address);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-light text-neutral-600 mb-4">
          Contact Us
        </h1>
        <p className="text-sm font-sans text-neutral-400 leading-relaxed mb-12 max-w-lg">
          We&apos;d love to hear from you. Whether you have a question about our
          products, need help with an order, or just want to say hello.
        </p>

        <div className="grid lg:grid-cols-3 gap-16">
          {/* Contact info */}
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <Mail
                size={18}
                strokeWidth={1.5}
                className="text-neutral-400 mt-0.5"
              />
              <div>
                <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">
                  Email
                </p>
                <Link
                  href={`mailto:${contactEmail}`}
                  className="text-sm font-sans text-neutral-600 hover:text-primary-500 transition-colors"
                >
                  {contactEmail}
                </Link>
              </div>
            </div>

            {contactPhone && (
              <div className="flex items-start gap-4">
                <Phone
                  size={18}
                  strokeWidth={1.5}
                  className="text-neutral-400 mt-0.5"
                />
                <div>
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">
                    Phone
                  </p>
                  <Link
                    href={`tel:${contactPhone}`}
                    className="text-sm font-sans text-neutral-600 hover:text-primary-500 transition-colors"
                  >
                    {contactPhone}
                  </Link>
                </div>
              </div>
            )}

            {addressLines && (
              <div className="flex items-start gap-4">
                <MapPin
                  size={18}
                  strokeWidth={1.5}
                  className="text-neutral-400 mt-0.5"
                />
                <div>
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">
                    Address
                  </p>
                  <p className="text-sm font-sans text-neutral-600 leading-relaxed">
                    {addressLines.map((line, idx) => (
                      <span key={idx}>
                        {line}
                        {idx < addressLines.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            )}

            {socialLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-3">
                  Follow Us
                </p>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((s) => (
                    <Link
                      key={s.platform}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-sans text-neutral-500 hover:text-primary-500 border border-neutral-200 px-3 py-1.5 capitalize transition-colors"
                    >
                      {s.platform}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border sf-border flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={20} className="text-primary-500" />
                </div>
                <h2 className="font-serif text-xl font-light text-neutral-600 mb-3">
                  Thank you
                </h2>
                <p className="text-sm font-sans text-neutral-400">
                  We&apos;ll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2">
                      Name
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                      className="w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      required
                      className="w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2">
                    Subject
                  </label>
                  <input
                    value={form.subject}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, subject: e.target.value }))
                    }
                    required
                    className="w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-2">
                    Message
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, message: e.target.value }))
                    }
                    required
                    rows={5}
                    className="w-full px-0 py-3 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors bg-transparent resize-none"
                    placeholder="Tell us more…"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-10 py-3.5 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors"
                >
                  {sending ? (
                    <Loader2 size={14} className="animate-spin inline mr-2" />
                  ) : null}
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
