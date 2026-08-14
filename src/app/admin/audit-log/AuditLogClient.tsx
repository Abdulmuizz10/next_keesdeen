"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/admin";
import {
  Search,
  FileText,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Activity,
} from "lucide-react";

interface AuditLogEntry {
  _id: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceIdentifier: string | null;
  description: string;
  changes: {
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }[];
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogClientProps {
  initialLogs: AuditLogEntry[];
  users: string[];
  actions: string[];
  resourceTypes: string[];
}

const ACTION_STYLES: Record<string, { dot: string; text: string; bg: string }> =
  {
    create: {
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    update: {
      dot: "bg-blue-500",
      text: "text-blue-700",
      bg: "bg-blue-50",
    },
    delete: {
      dot: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
    },
    login: {
      dot: "bg-indigo-500",
      text: "text-indigo-700",
      bg: "bg-indigo-50",
    },
    logout: {
      dot: "bg-gray-400",
      text: "text-gray-600",
      bg: "bg-gray-100",
    },
    order_status_change: {
      dot: "bg-amber-500",
      text: "text-amber-700",
      bg: "bg-amber-50",
    },
    refund_processed: {
      dot: "bg-orange-500",
      text: "text-orange-700",
      bg: "bg-orange-50",
    },
    settings_change: {
      dot: "bg-purple-500",
      text: "text-purple-700",
      bg: "bg-purple-50",
    },
    bulk_action: {
      dot: "bg-sky-500",
      text: "text-sky-700",
      bg: "bg-sky-50",
    },
    role_change: {
      dot: "bg-pink-500",
      text: "text-pink-700",
      bg: "bg-pink-50",
    },
    password_change: {
      dot: "bg-yellow-500",
      text: "text-yellow-700",
      bg: "bg-yellow-50",
    },
  };

function getActionStyle(action: string) {
  return (
    ACTION_STYLES[action] || {
      dot: "bg-gray-400",
      text: "text-gray-600",
      bg: "bg-gray-100",
    }
  );
}

function formatAction(action: string) {
  return action.replace(/_/g, " ");
}

function formatResource(resource: string) {
  return resource.replace(/_/g, " ");
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(value: string | null) {
  if (!value) return "—";

  if (value.length > 80) {
    return `${value.slice(0, 80)}…`;
  }

  return value;
}

export function AuditLogClient({
  initialLogs,
  users,
  actions,
  resourceTypes,
}: AuditLogClientProps) {
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    return initialLogs.filter((log) => {
      if (userFilter && log.userEmail !== userFilter) return false;

      if (actionFilter && log.action !== actionFilter) return false;

      if (resourceFilter && log.resourceType !== resourceFilter) return false;

      if (searchText) {
        const q = searchText.toLowerCase();

        if (
          !log.description.toLowerCase().includes(q) &&
          !log.userEmail.toLowerCase().includes(q) &&
          !(log.resourceIdentifier || "").toLowerCase().includes(q) &&
          !log.resourceType.toLowerCase().includes(q) &&
          !log.action.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [initialLogs, userFilter, actionFilter, resourceFilter, searchText]);

  const hasFilters =
    !!searchText || !!userFilter || !!actionFilter || !!resourceFilter;

  const clearFilters = () => {
    setSearchText("");
    setUserFilter("");
    setActionFilter("");
    setResourceFilter("");
  };

  return (
    <>
      <PageHeader
        title="Audit Log"
        description={`${filtered.length} of ${initialLogs.length} recorded activities`}
      />

      <div className="space-y-5">
        {/* Search / controls */}
        <div className="border-y border-[hsl(var(--border))] py-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
              />

              <input
                type="text"
                placeholder="Search activity, users, resources…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="
                  w-full
                  pl-10 pr-4 py-2.5
                  bg-[hsl(var(--card))]
                  border border-[hsl(var(--border))]
                  text-sm
                  text-[hsl(var(--foreground))]
                  placeholder:text-[hsl(var(--muted-foreground))]
                  focus:outline-none
                  focus:border-[hsl(var(--foreground))]/40
                  transition-colors
                "
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`
                inline-flex items-center justify-center gap-2
                px-4 py-2.5
                border
                text-sm font-medium
                transition-colors
                ${
                  filtersOpen || hasFilters
                    ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-white"
                    : "border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
                }
              `}
            >
              <Filter size={14} />
              Filters
              {hasFilters && (
                <span className="flex h-5 min-w-5 items-center justify-center bg-white text-[hsl(var(--foreground))] text-[10px] font-semibold px-1">
                  {
                    [userFilter, actionFilter, resourceFilter].filter(Boolean)
                      .length
                  }
                </span>
              )}
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-2 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X size={13} />
                Clear
              </button>
            )}
          </div>

          {/* Filters */}
          {filtersOpen && (
            <div className="grid sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[hsl(var(--border))]">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] mb-2">
                  User
                </label>

                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="
                    w-full
                    px-3 py-2.5
                    border border-[hsl(var(--border))]
                    bg-[hsl(var(--card))]
                    text-sm
                    text-[hsl(var(--foreground))]
                    focus:outline-none
                    focus:border-[hsl(var(--foreground))]/40
                  "
                >
                  <option value="">All users</option>
                  {users.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] mb-2">
                  Action
                </label>

                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="
                    w-full
                    px-3 py-2.5
                    border border-[hsl(var(--border))]
                    bg-[hsl(var(--card))]
                    text-sm
                    text-[hsl(var(--foreground))]
                    focus:outline-none
                    focus:border-[hsl(var(--foreground))]/40
                  "
                >
                  <option value="">All actions</option>
                  {actions.map((action) => (
                    <option key={action} value={action}>
                      {formatAction(action)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] mb-2">
                  Resource
                </label>

                <select
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="
                    w-full
                    px-3 py-2.5
                    border border-[hsl(var(--border))]
                    bg-[hsl(var(--card))]
                    text-sm
                    text-[hsl(var(--foreground))]
                    focus:outline-none
                    focus:border-[hsl(var(--foreground))]/40
                  "
                >
                  <option value="">All resources</option>
                  {resourceTypes.map((resource) => (
                    <option key={resource} value={resource}>
                      {formatResource(resource)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Summary line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity
              size={14}
              className="text-[hsl(var(--muted-foreground))]"
            />

            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {hasFilters ? "Filtered activity" : "Recent activity"}
            </span>
          </div>

          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {/* Activity list */}
        {filtered.length === 0 ? (
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-20 text-center">
            <FileText
              size={24}
              className="mx-auto mb-4 text-[hsl(var(--muted-foreground))]"
            />

            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              No activity found
            </p>

            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Try adjusting your search or filters.
            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 text-xs font-medium underline underline-offset-4 text-[hsl(var(--foreground))]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="border-t border-[hsl(var(--border))]">
            {filtered.map((log, index) => {
              const isExpanded = expandedId === log._id;
              const actionStyle = getActionStyle(log.action);

              return (
                <div
                  key={log._id}
                  className={`
                    border-b border-[hsl(var(--border))]
                    ${
                      isExpanded
                        ? "bg-[hsl(var(--muted))]/30"
                        : "bg-[hsl(var(--card))]"
                    }
                  `}
                >
                  {/* Main row */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : log._id)}
                    className="
                      group
                      w-full
                      grid
                      grid-cols-[auto_1fr_auto]
                      lg:grid-cols-[40px_minmax(0,1fr)_auto]
                      items-center
                      gap-3
                      lg:gap-5
                      px-3
                      lg:px-4
                      py-4
                      text-left
                      hover:bg-[hsl(var(--accent))]/50
                      transition-colors
                    "
                  >
                    {/* Index / icon */}
                    <div className="flex items-center justify-center">
                      <div
                        className="
                          relative
                          flex
                          h-8
                          w-8
                          items-center
                          justify-center
                          border
                          border-[hsl(var(--border))]
                          bg-[hsl(var(--card))]
                        "
                      >
                        <FileText
                          size={14}
                          className="text-[hsl(var(--muted-foreground))]"
                        />

                        <span
                          className={`
                            absolute
                            -top-px
                            -right-px
                            h-1.5
                            w-1.5
                            ${actionStyle.dot}
                          `}
                        />
                      </div>
                    </div>

                    {/* Main information */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`
                            inline-flex
                            items-center
                            px-1.5
                            py-0.5
                            text-[9px]
                            font-bold
                            uppercase
                            tracking-[0.08em]
                            ${actionStyle.text}
                            ${actionStyle.bg}
                          `}
                        >
                          {formatAction(log.action)}
                        </span>

                        <span className="text-[10px] uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
                          {formatResource(log.resourceType)}
                        </span>

                        {log.resourceIdentifier && (
                          <>
                            <span className="text-[hsl(var(--border))]">/</span>

                            <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] truncate max-w-[220px]">
                              {log.resourceIdentifier}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="mt-1.5 text-sm text-[hsl(var(--foreground))] truncate">
                        {log.description}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-5 text-[11px] text-[hsl(var(--muted-foreground))]">
                      <span className="hidden xl:flex items-center gap-1.5 min-w-[130px]">
                        <User size={12} />
                        <span className="truncate">
                          {log.userEmail.split("@")[0]}
                        </span>
                      </span>

                      <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
                        <Clock size={12} />
                        {formatDate(log.createdAt)}
                      </span>

                      <span className="hidden md:block tabular-nums whitespace-nowrap">
                        {formatTime(log.createdAt)}
                      </span>

                      <span className="ml-1">
                        {isExpanded ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                      </span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-[hsl(var(--border))] px-4 lg:px-19 py-5">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4 mb-6">
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--muted-foreground))] mb-1.5">
                            User
                          </p>

                          <p className="text-xs font-medium text-[hsl(var(--foreground))] break-all">
                            {log.userEmail}
                          </p>

                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                            {formatAction(log.userRole)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--muted-foreground))] mb-1.5">
                            Timestamp
                          </p>

                          <p className="text-xs text-[hsl(var(--foreground))]">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--muted-foreground))] mb-1.5">
                            Resource
                          </p>

                          <p className="text-xs text-[hsl(var(--foreground))]">
                            {formatResource(log.resourceType)}
                          </p>

                          {log.resourceIdentifier && (
                            <p className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] mt-0.5 break-all">
                              {log.resourceIdentifier}
                            </p>
                          )}
                        </div>

                        {log.ipAddress && (
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.14em] font-semibold text-[hsl(var(--muted-foreground))] mb-1.5">
                              IP Address
                            </p>

                            <p className="text-xs font-mono text-[hsl(var(--foreground))]">
                              {log.ipAddress}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Changes */}
                      {log.changes.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                              Field Changes
                            </p>

                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              {log.changes.length}{" "}
                              {log.changes.length === 1 ? "change" : "changes"}
                            </span>
                          </div>

                          <div className="border-t border-[hsl(var(--border))]">
                            {log.changes.map((change, changeIndex) => (
                              <div
                                key={changeIndex}
                                className="
                                  grid
                                  grid-cols-1
                                  md:grid-cols-[140px_minmax(0,1fr)_24px_minmax(0,1fr)]
                                  gap-2
                                  md:gap-4
                                  py-3
                                  border-b
                                  border-[hsl(var(--border))]
                                  text-xs
                                "
                              >
                                <span className="font-medium text-[hsl(var(--foreground))]">
                                  {change.field}
                                </span>

                                <span className="text-red-600 bg-red-50 px-2 py-1 wrap-break-word line-through">
                                  {formatValue(change.oldValue)}
                                </span>

                                <span className="hidden md:flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                                  →
                                </span>

                                <span className="text-emerald-700 bg-emerald-50 px-2 py-1 wrap-break-word">
                                  {formatValue(change.newValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!log.changes.length && (
                        <div className="pt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          No field-level changes were recorded for this
                          activity.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
