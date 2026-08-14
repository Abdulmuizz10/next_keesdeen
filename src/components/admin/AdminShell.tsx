"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AdminSidebar, type NavItem } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { AdminThemeProvider } from "./AdminThemeProvider";

interface AdminShellProps {
  navItems: NavItem[];
  user: { name: string; email: string; role: string };
  children: ReactNode;
}

const SIDEBAR_COLLAPSE_KEY = "keesdeen-admin-sidebar-collapsed";
const EXPANDED_W = 240;
const COLLAPSED_W = 64;

export function AdminShell({ navItems, user, children }: AdminShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;

    return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true";
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(next));
      return next;
    });
  };

  return (
    <AdminThemeProvider>
      <div className="admin-shell min-h-screen bg-[hsl(var(--background))]">
        {/* Sidebar */}
        <AdminSidebar
          navItems={navItems}
          user={user}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />

        {/* Main content area — pushes right of sidebar on desktop */}
        <div
          className="flex flex-col min-h-screen transition-[padding-left] duration-200"
          style={{ paddingLeft: `var(--admin-sidebar-w, 0px)` }}
        >
          {/* Dummy element that sets the CSS variable via inline style on desktop */}
          <style>{`
            @media (min-width: 1024px) {
              :root { --admin-sidebar-w: ${collapsed ? COLLAPSED_W : EXPANDED_W}px; }
            }
          `}</style>

          <AdminTopbar
            user={user}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminThemeProvider>
  );
}
