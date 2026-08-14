"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Globe,
  MapPin,
  AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Shared style helpers                                               */
/* ------------------------------------------------------------------ */
const ACCENT = "#04BB6E";
const DANGER = "#B3261E";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5 block">
      {children}
    </label>
  );
}

const inputClass =
  "w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]";
const smallInputClass =
  "w-full px-2 py-1.5 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]";

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="pl-3 py-2.5 border-l-[3px] bg-[hsl(var(--muted))] flex items-center gap-2 text-sm text-[hsl(var(--foreground))]"
      style={{ borderColor: DANGER }}
    >
      <AlertCircle size={16} style={{ color: DANGER }} />
      {message}
    </div>
  );
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex w-2 h-2 shrink-0"
      style={{ backgroundColor: active ? ACCENT : "#9C9C9C" }}
    />
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface TaxRateData {
  _id: string;
  name: string;
  country: string;
  state: string;
  postalCodePattern: string;
  rate: number;
  isCompound: boolean;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
}

interface ShippingRateData {
  name: string;
  description: string;
  price: number;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
}

interface ShippingZoneData {
  _id: string;
  name: string;
  countries: string[];
  states: string[];
  rates: ShippingRateData[];
  isActive: boolean;
  isDefault: boolean;
}

interface Props {
  initialTaxRates: TaxRateData[];
  initialShippingZones: ShippingZoneData[];
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function TaxShippingClient({
  initialTaxRates,
  initialShippingZones,
}: Props) {
  const [activeTab, setActiveTab] = useState<"tax" | "shipping">("tax");

  return (
    <>
      <PageHeader
        title="Tax & Shipping"
        description="Configure tax rates and shipping zones"
      />

      <div className="flex gap-2 w-fit mb-4">
        {(
          [
            ["tax", "Tax Rates"],
            ["shipping", "Shipping Zones"],
          ] as const
        ).map(([key, label], i) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border border-[hsl(var(--border))] transition-colors ${
              i > 0 ? "border-l border-[hsl(var(--border))]" : ""
            } ${
              activeTab === key
                ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                : "bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "tax" && <TaxTab initialRates={initialTaxRates} />}
      {activeTab === "shipping" && (
        <ShippingTab initialZones={initialShippingZones} />
      )}
    </>
  );
}

/* ================================================================== */
/*  TAX TAB                                                            */
/* ================================================================== */
function TaxTab({ initialRates }: { initialRates: TaxRateData[] }) {
  const router = useRouter();
  const [rates, setRates] = useState(initialRates);
  const [editing, setEditing] = useState<TaxRateData | "new" | null>(null);

  const [prevInitialRates, setPrevInitialRates] = useState(initialRates);
  if (initialRates !== prevInitialRates) {
    setPrevInitialRates(initialRates);
    setRates(initialRates);
  }

  const deleteTax = async (id: string) => {
    if (!confirm("Delete this tax rate?")) return;
    await fetch(`/api/admin/tax-rates?id=${id}`, { method: "DELETE" });
    setRates((p) => p.filter((r) => r._id !== id));
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
        >
          <Plus size={14} /> Add Tax Rate
        </button>
      </div>

      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden admin-sidebar">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
              <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                Region
              </th>
              <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                Rate
              </th>
              <th className="text-center px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                Default
              </th>
              <th className="text-center px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                Active
              </th>
              <th className="w-20 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]"
                >
                  No tax rates configured
                </td>
              </tr>
            ) : (
              rates.map((r) => (
                <tr
                  key={r._id}
                  className="text-[hsl(var(--foreground))] border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--accent))] transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Globe
                        size={14}
                        className="text-[hsl(var(--muted-foreground))]"
                      />
                      <span>{r.country}</span>
                      {r.state && (
                        <>
                          <MapPin
                            size={12}
                            className="text-[hsl(var(--muted-foreground))] ml-1"
                          />
                          <span>{r.state}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{r.rate}%</td>
                  <td className="px-4 py-3 text-center">
                    {r.isDefault ? (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: ACCENT }}
                      >
                        ✓
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <ActiveDot active={r.isActive} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(r)}
                        className="p-1.5 hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteTax(r._id)}
                        className="p-1.5 hover:bg-[hsl(var(--accent))]"
                        style={{ color: DANGER }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <TaxEditor
          rate={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/* ---- Tax Editor Modal ---- */
function TaxEditor({
  rate,
  onClose,
  onSave,
}: {
  rate: TaxRateData | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isNew = !rate;
  const [form, setForm] = useState({
    name: rate?.name || "",
    country: rate?.country || "US",
    state: rate?.state || "",
    postalCodePattern: rate?.postalCodePattern || "",
    rate: rate ? String(rate.rate) : "",
    isCompound: rate?.isCompound ?? false,
    priority: rate?.priority ?? 0,
    isActive: rate?.isActive ?? true,
    isDefault: rate?.isDefault ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name || !form.rate) {
      setError("Name and rate required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...(rate ? { _id: rate._id } : {}),
        ...form,
        rate: Number(form.rate),
        country: form.country.toUpperCase(),
        state: form.state.toUpperCase() || undefined,
        postalCodePattern: form.postalCodePattern || undefined,
      };
      const res = await fetch("/api/admin/tax-rates", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto admin-sidebar">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-sm font-semibold">
            {isNew ? "New Tax Rate" : `Edit: ${rate.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {error && <ErrorBanner message={error} />}
          <div>
            <Label>Name *</Label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="New York State Tax"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Country *</Label>
              <input
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value }))
                }
                maxLength={2}
                placeholder="US"
                className={`${inputClass} uppercase`}
              />
            </div>
            <div>
              <Label>State/Region</Label>
              <input
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
                placeholder="NY"
                className={`${inputClass} uppercase`}
              />
            </div>
            <div>
              <Label>Rate (%) *</Label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="100"
                value={form.rate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rate: e.target.value }))
                }
                placeholder="8.875"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <Label>Postal Code Pattern (regex)</Label>
            <input
              value={form.postalCodePattern}
              onChange={(e) =>
                setForm((f) => ({ ...f, postalCodePattern: e.target.value }))
              }
              placeholder="Optional regex e.g. ^10\\d{3}$"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <input
                type="number"
                min="0"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: parseInt(e.target.value) || 0,
                  }))
                }
                className={inputClass}
              />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  className="w-4 h-4"
                  style={{ accentColor: ACCENT }}
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isDefault: e.target.checked }))
                  }
                  className="w-4 h-4"
                  style={{ accentColor: ACCENT }}
                />
                <span className="text-sm">Default rate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCompound}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isCompound: e.target.checked }))
                  }
                  className="w-4 h-4"
                  style={{ accentColor: ACCENT }}
                />
                <span className="text-sm">Compound</span>
              </label>
            </div>
          </div>
        </div>
        <div className="border-t border-[hsl(var(--border))] px-6 py-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider hover:bg-[hsl(var(--accent))] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 disabled:opacity-50 transition-opacity"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  SHIPPING TAB                                                       */
/* ================================================================== */
function ShippingTab({ initialZones }: { initialZones: ShippingZoneData[] }) {
  const router = useRouter();
  const [zones, setZones] = useState(initialZones);
  const [editing, setEditing] = useState<ShippingZoneData | "new" | null>(null);

  const [prevInitialZones, setPrevInitialZones] = useState(initialZones);
  if (initialZones !== prevInitialZones) {
    setPrevInitialZones(initialZones);
    setZones(initialZones);
  }

  const deleteZone = async (id: string) => {
    if (!confirm("Delete this shipping zone?")) return;
    await fetch(`/api/admin/shipping-zones?id=${id}`, { method: "DELETE" });
    setZones((p) => p.filter((z) => z._id !== id));
  };

  const fmt = (cents: number) =>
    cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
        >
          <Plus size={14} /> Add Shipping Zone
        </button>
      </div>

      <div className="space-y-4">
        {zones.length === 0 ? (
          <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
            No shipping zones configured
          </div>
        ) : (
          zones.map((zone) => (
            <div
              key={zone._id}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden admin-sidebar"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[hsl(var(--foreground))]">
                      {zone.name}
                    </h3>
                    {zone.isDefault && <Tag>Default</Tag>}
                    {!zone.isActive && <Tag>Inactive</Tag>}
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                    Countries: {zone.countries.join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(zone)}
                    className="p-2 hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteZone(zone._id)}
                    className="p-2 hover:bg-[hsl(var(--accent))]"
                    style={{ color: DANGER }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <table className="w-full text-sm text-[hsl(var(--foreground))]">
                <thead>
                  <tr className="bg-[hsl(var(--muted))]">
                    <th className="text-left px-5 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Rate Name
                    </th>
                    <th className="text-right px-5 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-left px-5 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Delivery
                    </th>
                    <th className="text-left px-5 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Conditions
                    </th>
                    <th className="text-center px-5 py-2 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {zone.rates.map((r, i) => (
                    <tr
                      key={i}
                      className="border-t border-[hsl(var(--border))]"
                    >
                      <td className="px-5 py-2.5 font-medium">{r.name}</td>
                      <td className="px-5 py-2.5 text-right font-mono">
                        {fmt(r.price)}
                      </td>
                      <td className="px-5 py-2.5">
                        {r.estimatedDaysMin}–{r.estimatedDaysMax} days
                      </td>
                      <td className="px-5 py-2.5 text-xs text-[hsl(var(--muted-foreground))]">
                        {r.minOrderAmount !== null &&
                          `Min $${(r.minOrderAmount / 100).toFixed(0)} `}
                        {r.maxOrderAmount !== null &&
                          `Max $${(r.maxOrderAmount / 100).toFixed(0)}`}
                        {r.minOrderAmount === null &&
                          r.maxOrderAmount === null &&
                          "—"}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex justify-center">
                          <ActiveDot active={r.isActive} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {editing !== null && (
        <ShippingZoneEditor
          zone={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/* ---- Shipping Zone Editor Modal ---- */
function ShippingZoneEditor({
  zone,
  onClose,
  onSave,
}: {
  zone: ShippingZoneData | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isNew = !zone;
  const [form, setForm] = useState({
    name: zone?.name || "",
    countries: zone?.countries.join(", ") || "",
    states: zone?.states?.join(", ") || "",
    rates: zone?.rates || ([] as ShippingRateData[]),
    isActive: zone?.isActive ?? true,
    isDefault: zone?.isDefault ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRate = () =>
    setForm((f) => ({
      ...f,
      rates: [
        ...f.rates,
        {
          name: "",
          description: "",
          price: 0,
          minOrderAmount: null,
          maxOrderAmount: null,
          minWeight: null,
          maxWeight: null,
          estimatedDaysMin: 3,
          estimatedDaysMax: 7,
          isActive: true,
        },
      ],
    }));

  const updateRate = (idx: number, updates: Partial<ShippingRateData>) =>
    setForm((f) => ({
      ...f,
      rates: f.rates.map((r, i) => (i === idx ? { ...r, ...updates } : r)),
    }));

  const removeRate = (idx: number) =>
    setForm((f) => ({ ...f, rates: f.rates.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.name || !form.countries) {
      setError("Name and countries required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...(zone ? { _id: zone._id } : {}),
        name: form.name.trim(),
        countries: form.countries
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        states: form.states
          ? form.states
              .split(",")
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          : [],
        rates: form.rates,
        isActive: form.isActive,
        isDefault: form.isDefault,
      };
      const res = await fetch("/api/admin/shipping-zones", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto admin-sidebar">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] sticky top-0 bg-[hsl(var(--background))] z-10">
          <h2 className="text-sm font-semibold">
            {isNew ? "New Shipping Zone" : `Edit: ${zone.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {error && <ErrorBanner message={error} />}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Zone Name *</Label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="United States"
                className={inputClass}
              />
            </div>
            <div>
              <Label>Countries * (comma-separated ISO codes)</Label>
              <input
                value={form.countries}
                onChange={(e) =>
                  setForm((f) => ({ ...f, countries: e.target.value }))
                }
                placeholder="US, CA"
                className={`${inputClass} uppercase`}
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="w-4 h-4"
                style={{ accentColor: ACCENT }}
              />
              <span className="text-sm">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isDefault: e.target.checked }))
                }
                className="w-4 h-4"
                style={{ accentColor: ACCENT }}
              />
              <span className="text-sm">Default zone</span>
            </label>
          </div>

          {/* Rates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Shipping Rates</Label>
              <button
                onClick={addRate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              >
                <Plus size={14} />
                Add Rate
              </button>
            </div>
            <div className="space-y-3">
              {form.rates.map((rate, idx) => (
                <div
                  key={idx}
                  className="border border-[hsl(var(--border))] p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Rate {idx + 1}
                    </span>
                    <button
                      onClick={() => removeRate(idx)}
                      style={{ color: DANGER }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <Label>Name *</Label>
                      <input
                        value={rate.name}
                        onChange={(e) =>
                          updateRate(idx, { name: e.target.value })
                        }
                        placeholder="Standard Shipping"
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <Label>Price (cents)</Label>
                      <input
                        type="number"
                        min="0"
                        value={rate.price}
                        onChange={(e) =>
                          updateRate(idx, {
                            price: parseInt(e.target.value) || 0,
                          })
                        }
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <input
                        value={rate.description}
                        onChange={(e) =>
                          updateRate(idx, { description: e.target.value })
                        }
                        className={smallInputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label>Days Min</Label>
                      <input
                        type="number"
                        min="0"
                        value={rate.estimatedDaysMin}
                        onChange={(e) =>
                          updateRate(idx, {
                            estimatedDaysMin: parseInt(e.target.value) || 0,
                          })
                        }
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <Label>Days Max</Label>
                      <input
                        type="number"
                        min="0"
                        value={rate.estimatedDaysMax}
                        onChange={(e) =>
                          updateRate(idx, {
                            estimatedDaysMax: parseInt(e.target.value) || 0,
                          })
                        }
                        className={smallInputClass}
                      />
                    </div>
                    <div>
                      <Label>Min Order (¢)</Label>
                      <input
                        type="number"
                        min="0"
                        value={rate.minOrderAmount ?? ""}
                        onChange={(e) =>
                          updateRate(idx, {
                            minOrderAmount: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        placeholder="—"
                        className={smallInputClass}
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={rate.isActive}
                          onChange={(e) =>
                            updateRate(idx, { isActive: e.target.checked })
                          }
                          className="w-3.5 h-3.5"
                          style={{ accentColor: ACCENT }}
                        />
                        Active
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-[hsl(var(--border))] px-6 py-4 flex justify-between sticky bottom-0 bg-[hsl(var(--background))]">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider hover:bg-[hsl(var(--accent))] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 disabled:opacity-50 transition-opacity"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
