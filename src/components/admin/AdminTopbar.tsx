"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Menu,
  Bell,
  LogOut,
  User,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface AdminTopbarProps {
  user: { name: string; email: string; role: string };
  onMenuClick: () => void;
}

export function AdminTopbar({ user, onMenuClick }: AdminTopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 bg-[hsl(var(--sidebar-bg))] border-b border-[hsl(var(--border))] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      {/* Left: Hamburger (mobile) + breadcrumb area */}
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* View storefront */}
        <Link
          href="/"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] rounded-lg transition-colors"
        >
          <ExternalLink size={14} />
          Storefront
        </Link>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications placeholder */}
        <button className="relative p-2 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[hsl(var(--destructive))] rounded-full" />
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 p-1.5 pr-3 rounded-sm transition-colors",
              profileOpen
                ? "bg-[hsl(var(--accent))]"
                : "hover:bg-[hsl(var(--accent))]",
            )}
          >
            <div className="w-8 h-8 rounded-full bg-[hsl(155,50%,93%)] text-[hsl(155,96%,32%)] flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-medium text-[hsl(var(--foreground))]">
              {user.name}
            </span>
            <ChevronDown
              size={14}
              className={cn(
                "hidden sm:block text-[hsl(var(--muted-foreground))] transition-transform",
                profileOpen && "rotate-180",
              )}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-lg py-1 z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {user.name}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                  {user.email}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize mt-0.5">
                  {user.role.replace("_", " ")}
                </p>
              </div>

              <div className="py-1">
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  <User
                    size={16}
                    className="text-[hsl(var(--muted-foreground))]"
                  />
                  My Account
                </Link>
                <Link
                  href="/"
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  <ExternalLink
                    size={16}
                    className="text-[hsl(var(--muted-foreground))]"
                  />
                  View Storefront
                </Link>
              </div>

              <div className="border-t border-[hsl(var(--border))] py-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[hsl(var(--destructive))] hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
