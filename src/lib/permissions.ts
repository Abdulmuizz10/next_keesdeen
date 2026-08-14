import { UserRole } from "./models/User";

/**
 * Route-prefix-to-role permission map.
 * This is the single source of truth for admin route permissions.
 * Import this in BOTH middleware AND Route Handlers — never trust middleware alone.
 */

export type Permission =
  | "full"
  | "read"
  | "write"
  | "request"
  | "approve"
  | "none";

export interface RoutePermission {
  path: string;
  permissions: Record<UserRole, Permission>;
}

/**
 * Admin route permissions by role:
 * - super_admin: full access to everything under /admin/*
 * - staff: everything except /admin/coupons, /admin/tax-shipping, /admin/audit-log
 * - support: read-only on /admin/orders and /admin/reviews, plus "request refund" but NOT "approve refund"
 * - customer: no admin access
 */
export const adminRoutePermissions: RoutePermission[] = [
  // Dashboard - everyone with admin access can view
  {
    path: "/admin",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "read",
      customer: "none",
    },
  },
  // Products management
  {
    path: "/admin/products",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "none",
      customer: "none",
    },
  },
  // Categories management
  {
    path: "/admin/categories",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "none",
      customer: "none",
    },
  },
  // Collections management
  {
    path: "/admin/collections",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "none",
      customer: "none",
    },
  },
  // Orders management
  {
    path: "/admin/orders",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "read", // Support can view orders
      customer: "none",
    },
  },
  // Refunds - special handling
  {
    path: "/admin/refunds",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "request", // Support can REQUEST refunds but not approve
      customer: "none",
    },
  },
  // Reviews management
  {
    path: "/admin/reviews",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "read", // Support can view reviews
      customer: "none",
    },
  },
  // Customers management
  {
    path: "/admin/customers",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "read",
      customer: "none",
    },
  },
  // Promotions management
  // {
  //   path: "/admin/promotions",
  //   permissions: {
  //     super_admin: "full",
  //     staff: "full",
  //     support: "none",
  //     customer: "none",
  //   },
  // },
  // Coupons management - RESTRICTED
  {
    path: "/admin/coupons",
    permissions: {
      super_admin: "full",
      staff: "none", // Staff CANNOT access coupons
      support: "none",
      customer: "none",
    },
  },
  // Tax & Shipping settings - RESTRICTED
  {
    path: "/admin/tax-shipping",
    permissions: {
      super_admin: "full",
      staff: "none", // Staff CANNOT access tax/shipping
      support: "none",
      customer: "none",
    },
  },
  // Site settings
  {
    path: "/admin/settings",
    permissions: {
      super_admin: "full",
      staff: "write",
      support: "none",
      customer: "none",
    },
  },
  // Homepage Builder (hero slides + sections)
  {
    path: "/admin/hero",
    permissions: {
      super_admin: "full",
      staff: "write",
      support: "none",
      customer: "none",
    },
  },
  // Subscribers/Marketing
  {
    path: "/admin/subscribers",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "read",
      customer: "none",
    },
  },
  // Promotions/Marketing
  {
    path: "/admin/promotions",
    permissions: {
      super_admin: "full",
      staff: "full",
      support: "read",
      customer: "none",
    },
  },
  // Audit Log - RESTRICTED
  {
    path: "/admin/audit-log",
    permissions: {
      super_admin: "full",
      staff: "none", // Staff CANNOT access audit log
      support: "none",
      customer: "none",
    },
  },
  // User/Team management
  {
    path: "/admin/team",
    permissions: {
      super_admin: "full",
      staff: "none",
      support: "none",
      customer: "none",
    },
  },
  // Reports & Analytics
  {
    path: "/admin/reports",
    permissions: {
      super_admin: "full",
      staff: "read",
      support: "none",
      customer: "none",
    },
  },
];

/**
 * Check if a role has access to a specific admin path.
 * Returns the permission level or "none" if no access.
 */
export function getRoutePermission(path: string, role: UserRole): Permission {
  // Customers never have admin access
  if (role === "customer") {
    return "none";
  }

  // Find the most specific matching route (longest prefix match)
  let matchedPermission: Permission = "none";
  let longestMatch = 0;

  for (const route of adminRoutePermissions) {
    if (path === route.path || path.startsWith(route.path + "/")) {
      if (route.path.length > longestMatch) {
        longestMatch = route.path.length;
        matchedPermission = route.permissions[role];
      }
    }
  }

  // If no specific route matched but it's under /admin, check base /admin permission
  if (matchedPermission === "none" && path.startsWith("/admin")) {
    const baseAdmin = adminRoutePermissions.find((r) => r.path === "/admin");
    if (baseAdmin) {
      matchedPermission = baseAdmin.permissions[role];
    }
  }

  return matchedPermission;
}

/**
 * Check if a role can access an admin route (any permission except "none").
 */
export function canAccessRoute(path: string, role: UserRole): boolean {
  return getRoutePermission(path, role) !== "none";
}

/**
 * Check if a role can write to an admin route.
 */
export function canWriteRoute(path: string, role: UserRole): boolean {
  const permission = getRoutePermission(path, role);
  return permission === "full" || permission === "write";
}

/**
 * Check if a role can perform a specific action.
 * This is used for fine-grained control like refund approval.
 */
export function canPerformAction(
  path: string,
  role: UserRole,
  action: "read" | "write" | "request" | "approve",
): boolean {
  const permission = getRoutePermission(path, role);

  switch (action) {
    case "read":
      return permission !== "none";
    case "write":
      return permission === "full" || permission === "write";
    case "request":
      return (
        permission === "full" ||
        permission === "request" ||
        permission === "write"
      );
    case "approve":
      return permission === "full"; // Only full access can approve
    default:
      return false;
  }
}

/**
 * Get all accessible admin routes for a role.
 * Useful for building navigation menus.
 */
export function getAccessibleRoutes(role: UserRole): RoutePermission[] {
  return adminRoutePermissions.filter(
    (route) => route.permissions[role] !== "none",
  );
}

/**
 * Admin roles that can access /admin/* at all.
 */
export const ADMIN_ROLES: UserRole[] = ["super_admin", "staff", "support"];

/**
 * Check if a role is an admin role.
 */
export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}
