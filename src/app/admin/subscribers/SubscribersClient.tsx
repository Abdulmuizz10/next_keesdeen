"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Image from "next/image";
import {
  Search,
  ChevronDown,
  MoreHorizontal,
  CheckSquare,
  Square,
  Tag,
  Trash2,
  Mail,
  MailX,
  MailCheck,
  Loader2,
  Send,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Upload,
  X,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

interface SubscriberData {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: "active" | "unsubscribed" | "bounced";
  source: string;
  tags: string[];
  subscribedAt: string;
  unsubscribedAt: string | null;
}

interface SubscribersClientProps {
  initialSubscribers: SubscriberData[];
  sources: string[];
  allTags: string[];
  statusCounts: {
    all: number;
    active: number;
    unsubscribed: number;
    bounced: number;
  };
  permission: Permission;
}

const ACCENT = "#04BB6E";
const DANGER = "#B3261E";
const WARNING = "#B98900";

export function SubscribersClient({
  initialSubscribers,
  sources,
  allTags,
  statusCounts,
  permission,
}: SubscribersClientProps) {
  const router = useRouter();
  const canWrite = permission === "full" || permission === "write";

  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [broadcastModal, setBroadcastModal] = useState(false);

  const [prevInitialSubscribers, setPrevInitialSubscribers] =
    useState(initialSubscribers);
  if (initialSubscribers !== prevInitialSubscribers) {
    setPrevInitialSubscribers(initialSubscribers);
    setSubscribers(initialSubscribers);
  }

  const filtered = useMemo(() => {
    return subscribers.filter((s) => {
      if (
        search &&
        !s.email.toLowerCase().includes(search.toLowerCase()) &&
        !s.firstName.toLowerCase().includes(search.toLowerCase()) &&
        !s.lastName.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (sourceFilter && s.source !== sourceFilter) return false;
      if (tagFilter && !s.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [subscribers, search, statusFilter, sourceFilter, tagFilter]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((s) => s._id)),
    );

  const bulkAction = async (action: string, tag?: string) => {
    setBulkLoading(true);
    setBulkMenuOpen(false);
    setShowTagInput(false);
    try {
      await fetch("/api/admin/subscribers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selected), tag }),
      });
      setSelected(new Set());
      setTagInput("");
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleStatus = async (sub: SubscriberData) => {
    const newStatus = sub.status === "active" ? "unsubscribed" : "active";
    await fetch("/api/admin/subscribers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: sub._id, status: newStatus }),
    });
    setSubscribers((prev) =>
      prev.map((s) =>
        s._id === sub._id
          ? {
              ...s,
              status: newStatus,
              unsubscribedAt:
                newStatus === "unsubscribed" ? new Date().toISOString() : null,
            }
          : s,
      ),
    );
  };

  const deleteSub = async (id: string) => {
    if (!confirm("Delete this subscriber permanently?")) return;
    await fetch(`/api/admin/subscribers?id=${id}`, { method: "DELETE" });
    setSubscribers((prev) => prev.filter((s) => s._id !== id));
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  };

  const exportUrl = (format: "xlsx" | "docx") => {
    const params = new URLSearchParams({ format });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    if (tagFilter) params.set("tag", tagFilter);
    return `/api/admin/export/subscribers?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Subscribers"
        description={`${filtered.length} visible of ${statusCounts.all} subscribers`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={exportUrl("xlsx")}
              className="inline-flex items-center gap-2 px-3 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <FileSpreadsheet size={14} /> Excel
            </a>
            <a
              href={exportUrl("docx")}
              className="inline-flex items-center gap-2 px-3 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <FileText size={14} /> Word
            </a>
            {canWrite ? (
              <button
                onClick={() => setBroadcastModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
              >
                <Send size={14} />
                Send Broadcast
              </button>
            ) : undefined}
          </div>
        }
      />

      {/* Status Tabs */}
      <div className="flex gap-1 w-fit mb-6">
        {(["", "active", "unsubscribed", "bounced"] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              i > 0 ? "border-l border-[hsl(var(--border))]" : ""
            } ${
              statusFilter === s
                ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 opacity-70 normal-case tracking-normal">
              {s === "" ? statusCounts.all : statusCounts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
          />
          <input
            type="text"
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]"
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Bulk Actions */}
        {selected.size > 0 && canWrite && (
          <div className="relative ml-auto">
            <button
              onClick={() => setBulkMenuOpen(!bulkMenuOpen)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] disabled:opacity-50 transition-colors"
            >
              {bulkLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ChevronDown size={14} />
              )}
              {selected.size} selected
            </button>
            {bulkMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setBulkMenuOpen(false);
                    setShowTagInput(false);
                  }}
                />
                <div className="absolute right-0 mt-1 w-52 bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg z-50 py-1">
                  <button
                    onClick={() => setShowTagInput(!showTagInput)}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                  >
                    <Tag size={14} /> Add Tag
                  </button>
                  {showTagInput && (
                    <div className="px-4 py-2 border-t border-[hsl(var(--border))]">
                      <div className="flex gap-1">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Tag name"
                          className="flex-1 px-2 py-1 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] focus:outline-none focus:border-[hsl(var(--foreground))]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && tagInput.trim())
                              bulkAction("add_tag", tagInput.trim());
                          }}
                        />
                        <button
                          onClick={() => {
                            if (tagInput.trim())
                              bulkAction("add_tag", tagInput.trim());
                          }}
                          className="px-2 py-1 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => bulkAction("unsubscribe")}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                  >
                    <MailX size={14} /> Unsubscribe
                  </button>
                  <button
                    onClick={() => bulkAction("resubscribe")}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                  >
                    <MailCheck size={14} /> Resubscribe
                  </button>
                  <div className="border-t border-[hsl(var(--border))] my-1" />
                  <button
                    onClick={() => bulkAction("delete")}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]"
                    style={{ color: DANGER }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                {canWrite && (
                  <th className="w-10 px-4 py-3">
                    <button
                      onClick={toggleAll}
                      className="text-[hsl(var(--muted-foreground))]"
                    >
                      {selected.size === filtered.length &&
                      filtered.length > 0 ? (
                        <CheckSquare size={16} style={{ color: ACCENT }} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Source
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Tags
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[11px] tracking-wider">
                  Subscribed
                </th>
                {canWrite && <th className="w-16 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canWrite ? 8 : 7}
                    className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]"
                  >
                    {search || statusFilter || sourceFilter || tagFilter
                      ? "No subscribers match your filters"
                      : "No subscribers yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr
                    key={sub._id}
                    className="border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--accent))] transition-colors"
                  >
                    {canWrite && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelect(sub._id)}
                          className="text-[hsl(var(--muted-foreground))]"
                        >
                          {selected.has(sub._id) ? (
                            <CheckSquare size={16} style={{ color: ACCENT }} />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail
                          size={14}
                          className="text-[hsl(var(--muted-foreground))] shrink-0"
                        />
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          {sub.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                      {sub.firstName || sub.lastName
                        ? `${sub.firstName} ${sub.lastName}`.trim()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canWrite ? (
                        <button
                          onClick={() => toggleStatus(sub)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          title={
                            sub.status === "active"
                              ? "Click to unsubscribe"
                              : "Click to resubscribe"
                          }
                        >
                          <StatusBadge value={sub.status} />
                        </button>
                      ) : (
                        <StatusBadge value={sub.status} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]">
                        {sub.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {sub.tags.length > 0 ? (
                          sub.tags.map((t) => (
                            <span
                              key={t}
                              className="text-xs px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(sub.subscribedAt).toLocaleDateString()}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="relative group/menu">
                          <button className="p-1 hover:bg-[hsl(var(--accent))]">
                            <MoreHorizontal size={16} />
                          </button>
                          <div className="hidden group-hover/menu:block absolute right-0 w-36 bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg z-30 py-1">
                            <button
                              onClick={() => toggleStatus(sub)}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                            >
                              {sub.status === "active" ? (
                                <MailX size={14} />
                              ) : (
                                <MailCheck size={14} />
                              )}
                              {sub.status === "active"
                                ? "Unsubscribe"
                                : "Resubscribe"}
                            </button>
                            <button
                              onClick={() => deleteSub(sub._id)}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-[hsl(var(--accent))]"
                              style={{ color: DANGER }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {broadcastModal && (
        <BroadcastModal
          onClose={() => setBroadcastModal(false)}
          activeCount={statusCounts.active}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Broadcast banner upload — same Cloudinary flow as CollectionsClient's
    ImageUploadField (POST /api/admin/upload with FormData, returns {url}) */
/* ------------------------------------------------------------------ */

function BroadcastImageUploadField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }
      onChange(data.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isDisabled = disabled || uploading;

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
        {label}
      </label>

      {value ? (
        <div className="relative w-full aspect-3/1 border border-[hsl(var(--border))] overflow-hidden group">
          <Image
            src={value}
            alt=""
            width={600}
            height={200}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              className="text-white flex items-center gap-1 text-xs font-medium"
              title="Replace image"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={isDisabled}
              className="text-white flex items-center gap-1 text-xs font-medium"
              title="Remove image"
            >
              <X size={14} />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled}
          className="w-full aspect-3/1 border border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Upload size={18} />
          )}
          <span className="text-xs font-medium">
            {uploading ? "Uploading…" : "Upload banner image"}
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Broadcast Modal                                                    */
/* ------------------------------------------------------------------ */

interface BroadcastResult {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

function BroadcastModal({
  onClose,
  activeCount,
}: {
  onClose: () => void;
  activeCount: number;
}) {
  const [headline, setHeadline] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Shop now");
  const [ctaUrl, setCtaUrl] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const canSubmit =
    headline.trim().length > 0 &&
    bodyText.trim().length > 0 &&
    ctaLabel.trim().length > 0 &&
    ctaUrl.trim().length > 0;

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: headline.trim(),
          bodyText: bodyText.trim(),
          ctaLabel: ctaLabel.trim(),
          ctaUrl: ctaUrl.trim(),
          discountCode: discountCode.trim() || undefined,
          bannerImageUrl: bannerImageUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send broadcast");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast");
      setConfirmSend(false);
    } finally {
      setSending(false);
    }
  };

  // Result screen — outcome depends on sent/failed, not just a 200 response
  if (result) {
    const allFailed = result.sent === 0 && result.failed > 0;
    const partialFailure = result.sent > 0 && result.failed > 0;
    const statusColor = allFailed ? DANGER : partialFailure ? WARNING : ACCENT;
    const heading = allFailed
      ? "Broadcast failed to send"
      : partialFailure
        ? "Broadcast sent with some failures"
        : "Broadcast sent";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center gap-2 mb-4">
            {allFailed ? (
              <AlertCircle size={15} style={{ color: statusColor }} />
            ) : (
              <Send size={15} style={{ color: statusColor }} />
            )}
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {heading}
            </h2>
          </div>

          {allFailed && (
            <div
              className="mb-4 pl-3 py-2.5 border-l-[3px] bg-[hsl(var(--muted))] flex gap-2"
              style={{ borderColor: DANGER }}
            >
              <AlertCircle
                size={16}
                className="shrink-0 mt-0.5"
                style={{ color: DANGER }}
              />
              <p className="text-sm text-[hsl(var(--foreground))]">
                No emails went out. Check the server logs for the delivery error
                before trying again.
              </p>
            </div>
          )}

          <table role="presentation" className="w-full mb-6">
            <tbody>
              <tr>
                <td className="py-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                  Delivered
                </td>
                <td
                  className="py-1.5 text-sm font-semibold text-right"
                  style={{ color: result.sent > 0 ? ACCENT : "inherit" }}
                >
                  {result.sent}
                </td>
              </tr>
              {result.failed > 0 && (
                <tr>
                  <td className="py-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                    Failed
                  </td>
                  <td
                    className="py-1.5 text-sm font-semibold text-right"
                    style={{ color: DANGER }}
                  >
                    {result.failed}
                  </td>
                </tr>
              )}
              {result.skipped > 0 && (
                <tr>
                  <td className="py-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                    Skipped (test/invalid domain)
                  </td>
                  <td className="py-1.5 text-sm font-semibold text-right text-[hsl(var(--muted-foreground))]">
                    {result.skipped}
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-1.5 text-sm text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))]">
                  Active subscribers
                </td>
                <td className="py-1.5 text-sm font-semibold text-right text-[hsl(var(--foreground))] border-t border-[hsl(var(--border))]">
                  {result.total}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={sending ? undefined : onClose}
      />
      <div className="relative bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 admin-sidebar">
        <div className="flex items-center gap-2 mb-1">
          <Send size={15} className="text-[hsl(var(--muted-foreground))]" />
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Send Broadcast
          </h2>
        </div>

        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
          <strong className="text-[hsl(var(--foreground))] font-semibold">
            {activeCount}
          </strong>{" "}
          active subscriber{activeCount !== 1 ? "s" : ""} will receive this
          broadcast.
        </p>

        {error && (
          <div
            className="mb-4 pl-3 py-2.5 border-l-[3px] bg-[hsl(var(--muted))] flex gap-2"
            style={{ borderColor: DANGER }}
          >
            <AlertCircle
              size={16}
              className="shrink-0 mt-0.5"
              style={{ color: DANGER }}
            />
            <p className="text-sm text-[hsl(var(--foreground))]">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              Headline *
            </label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={120}
              disabled={sending}
              placeholder="New arrivals are here"
              className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))] disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              Body text *
            </label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={4}
              maxLength={600}
              disabled={sending}
              placeholder="Tell subscribers what's new…"
              className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] resize-none focus:outline-none focus:border-[hsl(var(--foreground))] disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                Button label *
              </label>
              <input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                maxLength={40}
                disabled={sending}
                placeholder="Shop now"
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))] disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                Discount code
              </label>
              <input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                maxLength={30}
                disabled={sending}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))] disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
              Button link *
            </label>
            <input
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              disabled={sending}
              placeholder="https://keesdeen.com/products?sort=newest"
              className="w-full px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))] disabled:opacity-60"
            />
          </div>

          <BroadcastImageUploadField
            label="Banner Image (optional)"
            value={bannerImageUrl}
            onChange={setBannerImageUrl}
            disabled={sending}
          />
        </div>

        {!confirmSend ? (
          <div className="mt-6 flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setConfirmSend(true)}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <Send size={14} /> Review &amp; Send
            </button>
          </div>
        ) : (
          <div
            className="mt-6 pl-3 py-3 border-l-[3px] bg-[hsl(var(--muted))]"
            style={{ borderColor: WARNING }}
          >
            <p className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">
              Send to {activeCount} subscriber{activeCount !== 1 ? "s" : ""}?
            </p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
              This can&apos;t be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmSend(false)}
                disabled={sending}
                className="px-4 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] disabled:opacity-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-semibold uppercase tracking-wider hover:opacity-85 disabled:opacity-60 transition-opacity"
                style={{ backgroundColor: ACCENT }}
              >
                {sending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {sending ? "Sending…" : "Confirm & Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
