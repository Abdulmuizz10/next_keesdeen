"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
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

      {/* Broadcast Modal (Stub) */}
      {broadcastModal && (
        <BroadcastStubModal
          onClose={() => setBroadcastModal(false)}
          activeCount={statusCounts.active}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Broadcast Stub Modal                                               */
/* ------------------------------------------------------------------ */
function BroadcastStubModal({
  onClose,
  activeCount,
}: {
  onClose: () => void;
  activeCount: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Send size={15} className="text-[hsl(var(--muted-foreground))]" />
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Send Broadcast
          </h2>
        </div>

        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          <strong className="text-[hsl(var(--foreground))] font-semibold">
            {activeCount}
          </strong>{" "}
          active subscriber{activeCount !== 1 ? "s" : ""} will receive this
          broadcast.
        </p>

        <div
          className="pl-3 py-2.5 border-l-[3px] bg-[hsl(var(--muted))] flex gap-2"
          style={{ borderColor: WARNING }}
        >
          <AlertCircle
            size={16}
            className="shrink-0 mt-0.5"
            style={{ color: WARNING }}
          />
          <div className="text-sm text-[hsl(var(--foreground))]">
            <p className="font-semibold mb-1">Integration point</p>
            <p className="text-[hsl(var(--muted-foreground))]">
              This will connect to Resend Broadcasts or Klaviyo for
              segmentation, templates, scheduling, and analytics.
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
              For now, export subscribers and import them into your email
              platform.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              alert(
                "Export/broadcast functionality will be available when Resend Broadcasts or Klaviyo is connected.",
              );
              onClose();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
          >
            <Download size={14} /> Export Subscribers
          </button>
        </div>
      </div>
    </div>
  );
}
