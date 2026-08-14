import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/models/User";

/**
 * Lightweight permission check for middleware.
 * Duplicates the core logic from /lib/permissions.ts to avoid
 * pulling mongoose into the edge runtime via the model import chain.
 */
const ADMIN_ROLES: UserRole[] = ["super_admin", "staff", "support"];

const RESTRICTED_ROUTES: Record<string, UserRole[]> = {
  "/admin/coupons": ["super_admin"],
  "/admin/tax-shipping": ["super_admin"],
  "/admin/audit-log": ["super_admin"],
  "/admin/team": ["super_admin"],
};

function canAccessAdminRoute(pathname: string, role: UserRole): boolean {
  if (!ADMIN_ROLES.includes(role)) return false;
  for (const [prefix, allowedRoles] of Object.entries(RESTRICTED_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return allowedRoles.includes(role);
    }
  }
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const session = await auth();

  // ---- /admin pages ----
  if (pathname.startsWith("/admin")) {
    if (!session?.user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = session.user.role as UserRole;

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!canAccessAdminRoute(pathname, role)) {
      const forbiddenUrl = new URL("/admin", request.url);
      forbiddenUrl.searchParams.set("error", "forbidden");
      return NextResponse.redirect(forbiddenUrl);
    }

    return NextResponse.next();
  }

  // ---- /api/admin routes ----
  if (pathname.startsWith("/api/admin")) {
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = session.user.role as UserRole;
    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const pageRoute = pathname.replace("/api/admin", "/admin");
    if (!canAccessAdminRoute(pageRoute, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ---- /checkout, /account ----
  if (pathname.startsWith("/checkout") || pathname.startsWith("/account")) {
    if (!session?.user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
