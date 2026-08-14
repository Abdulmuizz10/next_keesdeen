import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import AuditLog from "@/lib/models/AuditLog";

export async function GET(request: NextRequest) {
  await requireRouteAccess("/admin/audit-log");
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user") || "";
  const action = searchParams.get("action") || "";
  const resourceType = searchParams.get("resourceType") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (user) query.userEmail = { $regex: user, $options: "i" };
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json(
    logs.map((log) => ({
      _id: log._id.toString(),
      userId: log.userId.toString(),
      userEmail: log.userEmail,
      userRole: log.userRole,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId?.toString() || null,
      resourceIdentifier: log.resourceIdentifier || null,
      description: log.description,
      changes: log.changes || [],
      ipAddress: log.ipAddress || null,
      createdAt: log.createdAt.toISOString(),
    }))
  );
}
