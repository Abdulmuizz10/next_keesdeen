import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import AuditLog from "@/lib/models/AuditLog";
import { AuditLogClient } from "./AuditLogClient";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  await requireRouteAccess("/admin/audit-log");
  await dbConnect();

  const logs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  // Gather unique values for filter dropdowns
  const users = [...new Set(logs.map((l) => l.userEmail))];
  const actions = [...new Set(logs.map((l) => l.action))];
  const resourceTypes = [...new Set(logs.map((l) => l.resourceType))];

  const serialized = logs.map((log) => ({
    _id: log._id.toString(),
    userEmail: log.userEmail,
    userRole: log.userRole,
    action: log.action,
    resourceType: log.resourceType,
    resourceIdentifier: log.resourceIdentifier || null,
    description: log.description,
    changes: (log.changes || []).map((c) => ({
      field: c.field,
      oldValue: c.oldValue != null ? String(c.oldValue) : null,
      newValue: c.newValue != null ? String(c.newValue) : null,
    })),
    ipAddress: log.ipAddress || null,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <AuditLogClient
      initialLogs={serialized}
      users={users}
      actions={actions}
      resourceTypes={resourceTypes}
    />
  );
}
