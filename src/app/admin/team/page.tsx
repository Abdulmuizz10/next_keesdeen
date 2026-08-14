"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin";
import {
  Plus,
  Shield,
  Trash2,
  Loader2,
  X,
  Copy,
  CheckCircle,
  Users,
  Mail,
  CalendarDays,
  ChevronDown,
} from "lucide-react";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  staff: "Staff",
  support: "Support",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Full administrative access",
  staff: "General administrative access",
  support: "Customer support access",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "staff",
  });

  const [inviting, setInviting] = useState(false);

  const [inviteResult, setInviteResult] = useState<{
    tempPassword: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/admin/team");

      if (!res.ok) {
        throw new Error("Failed to load team members");
      }

      const data = await res.json();
      setMembers(data);
    } catch {
      setError("Unable to load team members. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMembers = async () => {
      await fetchMembers();
    };
    loadMembers();
  }, []);

  const openInvite = () => {
    setShowInvite(true);
    setInviteResult(null);
    setError(null);
    setCopied(false);
  };

  const closeInvite = () => {
    if (inviting) return;

    setShowInvite(false);
    setInviteResult(null);
    setError(null);
    setCopied(false);
  };

  const invite = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setInviting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to invite team member");
      }

      setInviteResult(data);

      const updated = await fetch("/api/admin/team");

      if (updated.ok) {
        const updatedMembers = await updated.json();
        setMembers(updatedMembers);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to invite team member");
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (id: string, newRole: string) => {
    const member = members.find((m) => m._id === id);

    if (!member || member.role === newRole) return;

    const previousRole = member.role;

    setChangingRole(id);
    setError(null);

    setMembers((prev) =>
      prev.map((m) => (m._id === id ? { ...m, role: newRole } : m)),
    );

    try {
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: id,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update role");
      }
    } catch (e) {
      setMembers((prev) =>
        prev.map((m) => (m._id === id ? { ...m, role: previousRole } : m)),
      );

      setError(
        e instanceof Error ? e.message : "Failed to update team member role",
      );
    } finally {
      setChangingRole(null);
    }
  };

  const revoke = async (id: string) => {
    const member = members.find((m) => m._id === id);

    if (!member) return;

    const confirmed = window.confirm(
      `Revoke admin access from ${member.name}? They'll be downgraded to customer.`,
    );

    if (!confirmed) return;

    setRevoking(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/team?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to revoke access");
      }

      setMembers((prev) => prev.filter((m) => m._id !== id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to revoke admin access",
      );
    } finally {
      setRevoking(null);
    }
  };

  const copyPassword = async () => {
    if (!inviteResult?.tempPassword) return;

    try {
      await navigator.clipboard.writeText(inviteResult.tempPassword);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("Unable to copy the temporary password.");
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-4 w-24 animate-pulse bg-[hsl(var(--muted))]" />
        <div className="mt-3 h-3 w-40 animate-pulse bg-[hsl(var(--muted))]" />

        <div className="mt-10 border border-[hsl(var(--border))]">
          <div className="h-12 bg-[hsl(var(--muted))]" />

          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex h-[72px] items-center gap-6 border-t border-[hsl(var(--border))] px-5"
            >
              <div className="h-3 w-40 animate-pulse bg-[hsl(var(--muted))]" />
              <div className="h-3 w-24 animate-pulse bg-[hsl(var(--muted))]" />
              <div className="h-3 w-20 animate-pulse bg-[hsl(var(--muted))]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Team members"
        description={` Manage access and permissions for your ${members.length} ${
          members.length === 1 ? "team member" : "team members"
        }`}
        action={
          <button
            type="button"
            onClick={openInvite}
            className="inline-flex h-10 items-center gap-2 bg-[hsl(var(--primary))] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} strokeWidth={2} />
            Invite member
          </button>
        }
      />

      {/* Error */}
      {error && !showInvite && (
        <div className="mb-5 flex items-start justify-between gap-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-red-500 transition-colors hover:text-red-700"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Team Overview */}
      <section className="mb-8 grid grid-cols-1 border-y border-[hsl(var(--border))] sm:grid-cols-3">
        <div className="flex items-center gap-4 border-b border-[hsl(var(--border))] px-5 py-5 sm:border-b-0 sm:border-r">
          <div className="flex h-9 w-9 items-center justify-center border border-[hsl(var(--border))]">
            <Users
              size={17}
              className="text-[hsl(var(--foreground))]"
              strokeWidth={1.8}
            />
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
              Total members
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
              {members.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-[hsl(var(--border))] px-5 py-5 sm:border-b-0 sm:border-r">
          <div className="flex h-9 w-9 items-center justify-center border border-[hsl(var(--border))]">
            <Shield
              size={17}
              className="text-[hsl(var(--foreground))]"
              strokeWidth={1.8}
            />
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
              Administrators
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
              {members.filter((m) => m.role === "super_admin").length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center border border-[hsl(var(--border))]">
            <Mail
              size={17}
              className="text-[hsl(var(--foreground))]"
              strokeWidth={1.8}
            />
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
              Support
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
              {members.filter((m) => m.role === "support").length}
            </p>
          </div>
        </div>
      </section>

      {/* Team Table */}
      <section className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {members.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center border border-[hsl(var(--border))]">
              <Users
                size={18}
                className="text-[hsl(var(--muted-foreground))]"
              />
            </div>

            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              No team members
            </h3>

            <p className="mt-1 max-w-sm text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              Invite your first team member to start managing your admin
              workspace.
            </p>

            <button
              type="button"
              onClick={openInvite}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--foreground))] underline underline-offset-4 hover:opacity-70"
            >
              <Plus size={15} />
              Invite a member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                    Member
                  </th>

                  <th className="w-[230px] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                    Role
                  </th>

                  <th className="w-[170px] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                    Joined
                  </th>

                  <th className="w-16 px-5 py-3" />
                </tr>
              </thead>

              <tbody>
                {members.map((member) => (
                  <tr
                    key={member._id}
                    className="border-b border-[hsl(var(--border))] last:border-b-0 transition-colors hover:bg-[hsl(var(--accent))]"
                  >
                    {/* Member */}
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-xs font-semibold uppercase text-[hsl(var(--foreground))]">
                          {member.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-[hsl(var(--foreground))]">
                            {member.name}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      <div className="relative w-fit">
                        <select
                          value={member.role}
                          disabled={changingRole === member._id}
                          onChange={(e) =>
                            changeRole(member._id, e.target.value)
                          }
                          aria-label={`Role for ${member.name}`}
                          className="h-9 min-w-[175px] appearance-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-3 pr-9 text-xs font-medium text-[hsl(var(--foreground))] outline-none transition-colors hover:border-[hsl(var(--foreground)/0.3)] focus:border-[hsl(var(--foreground)/0.5)] disabled:cursor-wait disabled:opacity-60"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="staff">Staff</option>
                          <option value="support">Support</option>
                        </select>

                        {changingRole === member._id ? (
                          <Loader2
                            size={13}
                            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[hsl(var(--muted-foreground))]"
                          />
                        ) : (
                          <ChevronDown
                            size={14}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                          />
                        )}
                      </div>

                      <p className="mt-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                        {ROLE_DESCRIPTIONS[member.role] || "Team access"}
                      </p>
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <CalendarDays size={14} strokeWidth={1.8} />
                        {new Date(member.createdAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => revoke(member._id)}
                        disabled={revoking === member._id}
                        aria-label={`Revoke access for ${member.name}`}
                        title="Revoke access"
                        className="inline-flex h-8 w-8 items-center justify-center border border-transparent text-[hsl(var(--muted-foreground))] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50"
                      >
                        {revoking === member._id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} strokeWidth={1.8} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Invite Modal */}
      {showInvite && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-team-member-title"
        >
          <div
            className="fixed inset-0 bg-black/55"
            onClick={closeInvite}
            aria-hidden="true"
          />

          <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
            <div className="relative my-auto w-full max-w-[440px] border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-[hsl(var(--border))] px-6 py-5">
                <div>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center border border-[hsl(var(--border))]">
                    <Shield
                      size={17}
                      strokeWidth={1.8}
                      className="text-[hsl(var(--foreground))]"
                    />
                  </div>

                  <h2
                    id="invite-team-member-title"
                    className="text-base font-semibold tracking-tight text-[hsl(var(--foreground))]"
                  >
                    Invite team member
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                    Create an admin account and assign its access level.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeInvite}
                  disabled={inviting}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] disabled:opacity-50"
                >
                  <X size={17} strokeWidth={1.8} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-6 py-6">
                {inviteResult ? (
                  <div>
                    <div className="mb-6 flex items-center gap-3 border-b border-[hsl(var(--border))] pb-5">
                      <div className="flex h-9 w-9 items-center justify-center border border-emerald-200 bg-emerald-50">
                        <CheckCircle
                          size={17}
                          className="text-emerald-600"
                          strokeWidth={1.8}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          Account created
                        </p>
                        <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                          {inviteForm.name} can now sign in.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">
                          Temporary password
                        </p>

                        <div className="mt-2 flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                          <code className="min-w-0 flex-1 overflow-x-auto px-3 py-3 text-sm font-mono text-[hsl(var(--foreground))]">
                            {inviteResult.tempPassword}
                          </code>

                          <button
                            type="button"
                            onClick={copyPassword}
                            className="flex h-10 w-10 shrink-0 items-center justify-center border-l border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                            aria-label="Copy temporary password"
                            title="Copy password"
                          >
                            {copied ? (
                              <CheckCircle
                                size={15}
                                className="text-emerald-600"
                              />
                            ) : (
                              <Copy size={15} strokeWidth={1.8} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="border-l-2 border-[hsl(var(--border))] py-1 pl-3">
                        <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                          Share this password securely with the new team member.
                          They should change it immediately after their first
                          login.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeInvite}
                        className="mt-2 h-10 w-full bg-[hsl(var(--primary))] text-sm font-medium text-white transition-opacity hover:opacity-90"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {error && (
                      <div className="flex items-start justify-between gap-3 border border-red-200 bg-red-50 px-3 py-3 text-xs leading-5 text-red-700">
                        <span>{error}</span>

                        <button
                          type="button"
                          onClick={() => setError(null)}
                          className="shrink-0 text-red-500 hover:text-red-700"
                          aria-label="Dismiss error"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Name */}
                    <div>
                      <label
                        htmlFor="team-name"
                        className="mb-2 block text-xs font-semibold text-[hsl(var(--foreground))]"
                      >
                        Name
                      </label>

                      <input
                        id="team-name"
                        type="text"
                        autoComplete="name"
                        value={inviteForm.name}
                        onChange={(e) =>
                          setInviteForm((form) => ({
                            ...form,
                            name: e.target.value,
                          }))
                        }
                        placeholder="e.g. Abdul Muizz"
                        className="h-10 w-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] transition-colors focus:border-[hsl(var(--foreground)/0.5)]"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="team-email"
                        className="mb-2 block text-xs font-semibold text-[hsl(var(--foreground))]"
                      >
                        Email
                      </label>

                      <input
                        id="team-email"
                        type="email"
                        autoComplete="email"
                        value={inviteForm.email}
                        onChange={(e) =>
                          setInviteForm((form) => ({
                            ...form,
                            email: e.target.value,
                          }))
                        }
                        placeholder="name@company.com"
                        className="h-10 w-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] transition-colors focus:border-[hsl(var(--foreground)/0.5)]"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label
                        htmlFor="team-role"
                        className="mb-2 block text-xs font-semibold text-[hsl(var(--foreground))]"
                      >
                        Access level
                      </label>

                      <div className="relative">
                        <select
                          id="team-role"
                          value={inviteForm.role}
                          onChange={(e) =>
                            setInviteForm((form) => ({
                              ...form,
                              role: e.target.value,
                            }))
                          }
                          className="h-10 w-full appearance-none border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 pr-10 text-sm text-[hsl(var(--foreground))] outline-none transition-colors focus:border-[hsl(var(--foreground)/0.5)]"
                        >
                          <option value="staff">Staff</option>
                          <option value="support">Support</option>
                        </select>

                        <ChevronDown
                          size={15}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                        />
                      </div>

                      <p className="mt-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
                        {ROLE_DESCRIPTIONS[inviteForm.role]}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="border-t border-[hsl(var(--border))] pt-5">
                      <button
                        type="button"
                        onClick={invite}
                        disabled={inviting}
                        className="flex h-10 w-full items-center justify-center bg-[hsl(var(--primary))] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {inviting && (
                          <Loader2 size={14} className="mr-2 animate-spin" />
                        )}

                        {inviting ? "Creating account..." : "Invite member"}
                      </button>

                      <p className="mt-3 text-center text-[11px] text-[hsl(var(--muted-foreground))]">
                        A temporary password will be generated automatically.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
