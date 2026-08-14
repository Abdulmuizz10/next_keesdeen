"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Package,
  Heart,
  LogOut,
  ChevronRight,
  MapPin,
  Plus,
  Trash2,
  Loader2,
  User,
  Star,
} from "lucide-react";
import { CountryStateCitySelect } from "@/components/shared/CountryStateCitySelect";

interface SavedAddress {
  _id: string;
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: "Home",
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "US",
    phone: "",
    isDefault: false,
  });

  useEffect(() => {
    if (status === "unauthenticated")
      router.push("/auth/login?callbackUrl=/account");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/addresses")
        .then((r) => r.json())
        .then(setAddresses)
        .catch(() => {});
    }
  }, [status]);

  const saveAddress = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowAddForm(false);
        setForm({
          label: "Home",
          fullName: "",
          line1: "",
          line2: "",
          city: "",
          region: "",
          postalCode: "",
          country: "US",
          phone: "",
          isDefault: false,
        });
        const updated = await fetch("/api/addresses").then((r) => r.json());
        setAddresses(updated);
      }
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const deleteAddress = async (id: string) => {
    await fetch(`/api/addresses?id=${id}`, { method: "DELETE" });
    setAddresses((prev) => prev.filter((a) => a._id !== id));
  };

  if (status === "loading" || !session?.user) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div
          className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 animate-spin"
          style={{ borderRadius: "50%" }}
        />
      </main>
    );
  }

  const quickLinks = [
    {
      href: "/account/orders",
      label: "My Orders",
      description: "Track, review, and manage your orders",
      icon: Package,
    },
    {
      href: "/account/wishlist",
      label: "Wishlist",
      description: "Products you've saved for later",
      icon: Heart,
    },
  ];

  const navLinks = [
    { href: "#overview", label: "Overview", icon: User },
    { href: "/account/orders", label: "My Orders", icon: Package },
    { href: "/account/wishlist", label: "Wishlist", icon: Heart },
    { href: "#addresses", label: "Address Book", icon: MapPin },
  ];

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12 py-14 mt-20 sm:mt-10">
        {/* Page header */}
        <div className="mb-10">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-neutral-400 mb-2">
            Account
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-light text-neutral-600">
            Welcome back
            {session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
            {/* Profile card */}
            <div
              className="bg-white border border-neutral-100 p-6"
              id="overview"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 shrink-0 bg-primary-50 text-primary-500 font-serif text-xl flex items-center justify-center">
                  {getInitials(session.user.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-sans font-medium text-neutral-600 truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs font-sans text-neutral-400 truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>

              <nav className="space-y-0.5 -mx-2">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-3 px-2 py-2.5 text-sm font-sans text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.5}
                        className="text-neutral-400"
                      />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-3 w-full px-6 py-4 border border-neutral-100 bg-white text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} strokeWidth={1.5} />
              <span className="text-sm font-sans font-medium">Sign Out</span>
            </button>
          </aside>

          {/* Main content */}
          <div className="space-y-10">
            {/* Quick access cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group bg-white border border-neutral-100 hover:border-neutral-200 hover:shadow-md transition-all p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-11 h-11 bg-neutral-50 flex items-center justify-center">
                        <Icon
                          size={20}
                          strokeWidth={1.5}
                          className="text-neutral-500"
                        />
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-neutral-300 group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                    <p className="font-serif text-lg font-light text-neutral-600 mb-1">
                      {link.label}
                    </p>
                    <p className="text-xs font-sans text-neutral-400">
                      {link.description}
                    </p>
                  </Link>
                );
              })}
            </div>

            {/* Address Book */}
            <div
              id="addresses"
              className="bg-white border border-neutral-100 p-6 sm:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl font-light text-neutral-600 flex items-center gap-2">
                  <MapPin
                    size={18}
                    strokeWidth={1.5}
                    className="text-neutral-400"
                  />
                  Address Book
                </h2>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-sans font-semibold uppercase tracking-[0.08em] text-primary-500 hover:text-primary-600 border border-primary-200 hover:bg-primary-50 transition-colors"
                  >
                    <Plus size={12} /> Add Address
                  </button>
                )}
              </div>

              {addresses.length === 0 && !showAddForm && (
                <div className="text-center py-12 border border-dashed border-neutral-200">
                  <MapPin
                    size={28}
                    className="mx-auto text-neutral-200 mb-3"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm font-sans text-neutral-400">
                    No saved addresses yet.
                  </p>
                  <p className="text-xs font-sans text-neutral-400 mt-1">
                    Add one for faster checkout next time.
                  </p>
                </div>
              )}

              {addresses.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-4 mb-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      className="p-5 border border-neutral-100 hover:border-neutral-200 transition-colors flex items-start justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-sans font-medium text-neutral-600">
                            {addr.label}
                          </span>
                          {addr.isDefault && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-sans uppercase tracking-[0.06em] text-primary-500 border border-primary-200 px-1.5 py-0.5">
                              <Star size={8} className="fill-primary-500" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-sans text-neutral-600 mb-0.5">
                          {addr.fullName}
                        </p>
                        <p className="text-xs font-sans text-neutral-400 leading-relaxed">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ""}
                          <br />
                          {addr.city}, {addr.region} {addr.postalCode}
                          <br />
                          {addr.country}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAddress(addr._id)}
                        className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Address Form */}
              {showAddForm && (
                <div className="mt-4 p-6 border border-neutral-100 bg-neutral-50/50 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">
                        Label
                      </label>
                      <select
                        value={form.label}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, label: e.target.value }))
                        }
                        className="w-full px-0 py-2 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm focus:outline-none focus:border-neutral-600 bg-transparent"
                      >
                        <option>Home</option>
                        <option>Work</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">
                        Full Name
                      </label>
                      <input
                        value={form.fullName}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, fullName: e.target.value }))
                        }
                        className="w-full px-0 py-2 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm focus:outline-none focus:border-neutral-600 bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">
                      Address Line 1
                    </label>
                    <input
                      value={form.line1}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, line1: e.target.value }))
                      }
                      className="w-full px-0 py-2 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm focus:outline-none focus:border-neutral-600 bg-transparent"
                    />
                  </div>

                  {/* Country → State → City cascading selects */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <CountryStateCitySelect
                      country={form.country}
                      state={form.region}
                      city={form.city}
                      onCountryChange={(code) =>
                        setForm((f) => ({ ...f, country: code }))
                      }
                      onStateChange={(code) =>
                        setForm((f) => ({ ...f, region: code }))
                      }
                      onCityChange={(name) =>
                        setForm((f) => ({ ...f, city: name }))
                      }
                      inputClassName="w-full px-0 py-2 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm focus:outline-none focus:border-neutral-600 bg-transparent"
                      labelClassName="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">
                        Postal / ZIP code
                      </label>
                      <input
                        value={form.postalCode}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, postalCode: e.target.value }))
                        }
                        className="w-full px-0 py-2 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm focus:outline-none focus:border-neutral-600 bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-neutral-400 mb-1">
                        Phone
                      </label>
                      <input
                        value={form.phone}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, phone: e.target.value }))
                        }
                        className="w-full px-0 py-2 border-0 border-b border-neutral-200 text-neutral-600 font-sans text-sm focus:outline-none focus:border-neutral-600 bg-transparent"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isDefault: e.target.checked }))
                      }
                    />
                    <span className="text-xs font-sans text-neutral-500">
                      Set as default address
                    </span>
                  </label>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={saveAddress}
                      disabled={saving}
                      className="px-6 py-2.5 bg-primary-400 text-white font-sans text-[11px] font-semibold uppercase tracking-[0.08em] hover:bg-primary-500 disabled:bg-neutral-200 transition-colors"
                    >
                      {saving ? (
                        <Loader2
                          size={14}
                          className="animate-spin inline mr-1"
                        />
                      ) : null}
                      Save Address
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-6 py-2.5 border border-neutral-200 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
