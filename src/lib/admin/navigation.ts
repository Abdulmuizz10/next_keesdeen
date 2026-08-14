import type { Permission } from "@/lib/permissions";

export interface NavItem {
  path: string;
  label: string;
  group: string;
  permission: Permission;
}

const NAV_META: Record<string, { label: string; group: string }> = {
  "/admin": { label: "Dashboard", group: "main" },
  "/admin/orders": { label: "Orders", group: "sales" },
  "/admin/refunds": { label: "Refunds", group: "sales" },
  "/admin/products": { label: "Products", group: "catalog" },
  "/admin/categories": { label: "Categories", group: "catalog" },
  "/admin/collections": { label: "Collections", group: "catalog" },
  "/admin/customers": { label: "Customers", group: "people" },
  "/admin/subscribers": { label: "Subscribers", group: "people" },
  "/admin/reviews": { label: "Reviews", group: "people" },
  "/admin/promotions": { label: "Promotions", group: "marketing" },
  "/admin/coupons": { label: "Coupons", group: "marketing" },
  "/admin/hero": { label: "Homepage", group: "catalog" },
  "/admin/tax-shipping": {
    label: "Tax & Shipping",
    group: "settings",
  },
  "/admin/settings": { label: "Settings", group: "settings" },
  "/admin/team": { label: "Team", group: "settings" },
  "/admin/audit-log": { label: "Audit Log", group: "settings" },
  "/admin/reports": { label: "Reports", group: "settings" },
};

export function buildNavItems(
  permissions: { path: string; permissions: Record<string, Permission> }[],
  role: string,
): NavItem[] {
  return permissions
    .filter((r) => r.permissions[role] !== "none")
    .map((r) => {
      const meta = NAV_META[r.path];
      if (!meta) return null;
      return {
        path: r.path,
        label: meta.label,
        group: meta.group,
        permission: r.permissions[role] as Permission,
      };
    })
    .filter(Boolean) as NavItem[];
}
