import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { adminRoutePermissions, isAdminRole } from "@/lib/permissions";
import { AdminShell } from "@/components/admin";
import { buildNavItems } from "@/lib/admin/navigation";
import type { UserRole } from "@/lib/models/User";
import "./admin.css";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { authenticated, user } = await getCurrentUser();

  if (!authenticated || !user) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  if (!isAdminRole(user.role)) {
    redirect("/");
  }

  // Build nav items filtered by role (items the role can't access are omitted)
  const navItems = buildNavItems(adminRoutePermissions, user.role as UserRole);

  return (
    <AdminShell
      navItems={navItems}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
