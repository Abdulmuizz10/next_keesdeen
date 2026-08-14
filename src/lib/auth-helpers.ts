import "server-only";
import { auth } from "./auth";
import { canAccessRoute, canPerformAction, isAdminRole, Permission, getRoutePermission } from "./permissions";
import type { UserRole } from "./models/User";

/**
 * Auth helpers for use in Route Handlers and Server Components.
 * These complement the middleware checks — NEVER rely on middleware alone.
 */

export interface AuthResult {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  } | null;
}

/**
 * Get the current authenticated user.
 * Use this in Server Components and Route Handlers.
 */
export async function getCurrentUser(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user) {
    return { authenticated: false, user: null };
  }

  return {
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    },
  };
}

/**
 * Require authentication in a Route Handler.
 * Returns the user or throws an error response.
 */
export async function requireAuth(): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
}> {
  const { authenticated, user } = await getCurrentUser();

  if (!authenticated || !user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return user;
}

/**
 * Require admin role in a Route Handler.
 * Returns the user or throws an error response.
 */
export async function requireAdmin(): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
}> {
  const user = await requireAuth();

  if (!isAdminRole(user.role)) {
    throw new Response(JSON.stringify({ error: "Forbidden", message: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return user;
}

/**
 * Require specific route permission in a Route Handler.
 * This should be called even when middleware already checks permissions,
 * since Route Handlers can be hit directly.
 *
 * @param routePath The admin route path to check (e.g., "/admin/products")
 */
export async function requireRouteAccess(routePath: string): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permission: Permission;
}> {
  const user = await requireAdmin();

  const permission = getRoutePermission(routePath, user.role);

  if (permission === "none") {
    throw new Response(
      JSON.stringify({
        error: "Forbidden",
        message: "You don't have permission to access this resource",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return { ...user, permission };
}

/**
 * Require specific action permission in a Route Handler.
 * Use this for fine-grained control like refund approval.
 *
 * @param routePath The admin route path to check
 * @param action The action to perform
 */
export async function requireActionPermission(
  routePath: string,
  action: "read" | "write" | "request" | "approve"
): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
}> {
  const user = await requireAdmin();

  if (!canPerformAction(routePath, user.role, action)) {
    throw new Response(
      JSON.stringify({
        error: "Forbidden",
        message: `You don't have permission to ${action} this resource`,
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return user;
}

/**
 * Check if the current user can access a route (without throwing).
 * Use this for conditional UI rendering.
 */
export async function checkRouteAccess(routePath: string): Promise<boolean> {
  const { authenticated, user } = await getCurrentUser();

  if (!authenticated || !user) {
    return false;
  }

  return canAccessRoute(routePath, user.role);
}

/**
 * Check if the current user can perform an action (without throwing).
 * Use this for conditional UI rendering.
 */
export async function checkActionPermission(
  routePath: string,
  action: "read" | "write" | "request" | "approve"
): Promise<boolean> {
  const { authenticated, user } = await getCurrentUser();

  if (!authenticated || !user) {
    return false;
  }

  return canPerformAction(routePath, user.role, action);
}
