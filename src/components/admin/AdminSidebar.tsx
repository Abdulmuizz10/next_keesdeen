"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  Layers,
  ShoppingCart,
  RotateCcw,
  Star,
  Users,
  Tag,
  Percent,
  Truck,
  Settings,
  Mail,
  FileText,
  Shield,
  BarChart3,
  X,
  PanelTop,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/permissions";
import Image from "next/image";
import { fvIcon } from "@/assets";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NavItem {
  path: string;
  label: string;
  group: string;
  permission: Permission;
}

interface AdminSidebarProps {
  navItems: NavItem[];
  user: { name: string; email: string; role: string };
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/orders": ShoppingCart,
  "/admin/refunds": RotateCcw,
  "/admin/products": Package,
  "/admin/categories": FolderOpen,
  "/admin/collections": Layers,
  "/admin/customers": Users,
  "/admin/subscribers": Mail,
  "/admin/reviews": Star,
  "/admin/promotions": Tag,
  "/admin/coupons": Percent,
  "/admin/hero": PanelTop,
  "/admin/tax-shipping": Truck,
  "/admin/settings": Settings,
  "/admin/team": Shield,
  "/admin/audit-log": FileText,
  "/admin/reports": BarChart3,
};

/* ------------------------------------------------------------------ */
/*  Nav metadata                                                        */
/* ------------------------------------------------------------------ */

// const NAV_META: Record<
//   string,
//   { icon: LucideIcon; label: string; group: string }
// > = {
//   "/admin": { icon: LayoutDashboard, label: "Dashboard", group: "main" },
//   "/admin/orders": { icon: ShoppingCart, label: "Orders", group: "sales" },
//   "/admin/refunds": { icon: RotateCcw, label: "Refunds", group: "sales" },
//   "/admin/products": { icon: Package, label: "Products", group: "catalog" },
//   "/admin/categories": {
//     icon: FolderOpen,
//     label: "Categories",
//     group: "catalog",
//   },
//   "/admin/collections": {
//     icon: Layers,
//     label: "Collections",
//     group: "catalog",
//   },
//   "/admin/hero": { icon: PanelTop, label: "Homepage", group: "catalog" },
//   "/admin/customers": { icon: Users, label: "Customers", group: "people" },
//   "/admin/subscribers": { icon: Mail, label: "Subscribers", group: "people" },
//   "/admin/reviews": { icon: Star, label: "Reviews", group: "people" },
//   "/admin/promotions": { icon: Tag, label: "Promotions", group: "marketing" },
//   "/admin/coupons": { icon: Percent, label: "Coupons", group: "marketing" },
//   "/admin/tax-shipping": {
//     icon: Truck,
//     label: "Tax & Shipping",
//     group: "settings",
//   },
//   "/admin/settings": { icon: Settings, label: "Settings", group: "settings" },
//   "/admin/team": { icon: Shield, label: "Team", group: "settings" },
//   "/admin/audit-log": { icon: FileText, label: "Audit Log", group: "settings" },
//   "/admin/reports": { icon: BarChart3, label: "Reports", group: "settings" },
// };

const GROUP_LABELS: Record<string, string> = {
  main: "",
  sales: "Sales",
  catalog: "Catalog",
  people: "People",
  marketing: "Marketing",
  settings: "Settings",
};

const GROUP_ORDER = [
  "main",
  "sales",
  "catalog",
  "people",
  "marketing",
  "settings",
];

// export function buildNavItems(
//   permissions: { path: string; permissions: Record<string, Permission> }[],
//   role: string,
// ): NavItem[] {
//   return permissions
//     .filter((r) => r.permissions[role] !== "none")
//     .map((r) => {
//       const meta = NAV_META[r.path];
//       if (!meta) return null;
//       return {
//         path: r.path,
//         label: meta.label,
//         icon: meta.icon,
//         group: meta.group,
//         permission: r.permissions[role] as Permission,
//       };
//     })
//     .filter(Boolean) as NavItem[];
// }

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminSidebar({
  navItems,
  user,
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) =>
    path === "/admin" ? pathname === "/admin" : pathname.startsWith(path);

  const groups = GROUP_ORDER.map((g) => ({
    key: g,
    label: GROUP_LABELS[g],
    items: navItems.filter((i) => i.group === g),
  })).filter((g) => g.items.length > 0);

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  /* ── Shared nav item ── */
  const NavLink = ({
    item,
    onClick,
  }: {
    item: NavItem;
    onClick?: () => void;
  }) => {
    const Icon = ICONS[item.path];
    const active = isActive(item.path);
    return (
      <Link
        href={item.path}
        onClick={onClick}
        title={collapsed ? item.label : undefined}
        className={cn(
          "relative flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors group",
          collapsed ? "px-2 justify-center" : "px-3",
          active
            ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-active-fg))]"
            : "text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--accent))]",
        )}
      >
        <Icon
          size={18}
          className={cn(
            "shrink-0",
            active
              ? "text-[hsl(var(--sidebar-active-fg))]"
              : "text-[hsl(var(--muted-foreground))]",
          )}
        />

        {/* Label — hidden when collapsed */}
        {!collapsed && <span className="truncate">{item.label}</span>}

        {/* Collapsed tooltip */}
        {collapsed && (
          <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] text-xs px-2 py-1 rounded shadow-lg border border-[hsl(var(--border))] opacity-0 group-hover:opacity-100 transition-opacity">
            {item.label}
            {item.permission === "read" && " (view only)"}
          </span>
        )}

        {/* Permission badges — only when expanded */}
        {!collapsed && item.permission === "read" && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            View
          </span>
        )}
        {!collapsed && item.permission === "request" && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
            Request
          </span>
        )}
      </Link>
    );
  };

  /* ── Sidebar content (shared between mobile/desktop) ── */
  const renderSidebarContent = (onItemClick?: () => void) => (
    <>
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-[hsl(var(--sidebar-border))] shrink-0",
          collapsed ? "justify-center px-2" : "justify-between px-5",
        )}
      >
        {!collapsed && (
          <Link
            href="/admin"
            className="flex items-center gap-2"
            onClick={onItemClick}
          >
            {/* <span className="w-8 h-8 rounded-lg bg-[hsl(155,96%,37%)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              K
            </span> */}
            <Image
              key={"logo"}
              src={fvIcon}
              alt="Brand logo"
              width={25}
              height={25}
              priority
            />
            <span className="font-sans text-lg font-semibold text-[hsl(var(--sidebar-fg))] truncate">
              Keesdeen
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/admin" onClick={onItemClick}>
            {/* <span className="font-sans w-8 h-8 rounded-lg bg-[hsl(155,96%,37%)] text-white flex items-center justify-center text-sm font-bold">
              K
            </span> */}
            <Image
              key={"logo"}
              src={fvIcon}
              alt="Brand logo"
              width={25}
              height={25}
              priority
            />
          </Link>
        )}
        {/* Collapse toggle (desktop only) */}
        <button
          className="hidden lg:flex p-1.5 rounded-md hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] transition-colors"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft
            size={16}
            className={cn("transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-4 admin-sidebar"
        style={{ padding: collapsed ? "16px 8px" : "16px 12px" }}
      >
        {groups.map((group) => (
          <div key={group.key} className="mb-4">
            {group.label && !collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase text-[hsl(var(--muted-foreground))]">
                {group.label}
              </p>
            )}
            {group.label && collapsed && (
              <div className="mb-1 h-px bg-[hsl(var(--border))]" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink item={item} onClick={onItemClick} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User area */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-4 shrink-0">
        {collapsed ? (
          <div className="flex justify-center">
            <div
              className="w-9 h-9 rounded-full bg-[hsl(155,50%,93%)] text-[hsl(155,96%,32%)] flex items-center justify-center text-xs font-bold"
              title={user.name}
            >
              {initials}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[hsl(155,50%,93%)] text-[hsl(155,96%,32%)] flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                {user.name}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      {/* Mobile sidebar (always full width, no collapse) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] flex flex-col lg:hidden admin-sidebar transition-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-[hsl(var(--sidebar-border))]">
          <Link
            href="/admin"
            className="flex items-center gap-2"
            onClick={onMobileClose}
          >
            <Image
              key={"logo"}
              src={fvIcon}
              alt="Brand logo"
              width={25}
              height={25}
              priority
            />
            <span className="font-sans text-lg font-semibold text-[hsl(var(--sidebar-fg))]">
              Keesdeen
            </span>
          </Link>
          <button
            className="p-1.5 rounded-md hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"
            onClick={onMobileClose}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 admin-sidebar">
          {groups.map((group) => (
            <div key={group.key} className="mb-4">
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase text-[hsl(var(--muted-foreground))]">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink item={item} onClick={onMobileClose} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-[hsl(var(--sidebar-border))] p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[hsl(155,50%,93%)] text-[hsl(155,96%,32%)] flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                {user.name}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar — fixed, width transitions */}
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] z-30 transition-[width] duration-200 overflow-hidden"
        style={{ width: collapsed ? 64 : 240 }}
      >
        {renderSidebarContent()}
      </aside>
    </>
  );
}
