import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import User from "@/lib/models/User";
import AuditLog from "@/lib/models/AuditLog";

export async function GET() {
  const user = await requireRouteAccess("/admin/team");
  await dbConnect();

  const admins = await User.find({
    role: { $in: ["super_admin", "staff", "support"] },
  })
    .sort({ role: 1, createdAt: -1 })
    .lean();

  return NextResponse.json(
    admins.map((a) => ({
      _id: a._id.toString(),
      name: a.name,
      email: a.email,
      role: a.role,
      createdAt: a.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: NextRequest) {
  const currentUser = await requireRouteAccess("/admin/team");
  await dbConnect();

  const { email, name, role } = await request.json();
  if (!email || !name || !role)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  if (!["staff", "support"].includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing)
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 },
    );

  const tempPassword = `Keesdeen${Math.random().toString(36).slice(2, 8)}!`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const newUser = await User.create({
    email: email.toLowerCase(),
    name,
    passwordHash,
    role,
    emailVerified: new Date(),
  });

  // Audit log
  await AuditLog.create({
    userId: currentUser.id,
    userEmail: currentUser.email,
    userRole: currentUser.role,
    action: "create",
    resourceType: "User",
    resourceId: newUser._id,
    resourceIdentifier: email,
    description: `Invited ${name} as ${role}`,
  });

  return NextResponse.json({ _id: newUser._id.toString(), tempPassword });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await requireRouteAccess("/admin/team");
  await dbConnect();

  const { _id, role } = await request.json();
  if (!_id || !role)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!["super_admin", "staff", "support"].includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const targetUser = await User.findById(_id);
  if (!targetUser)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const oldRole = targetUser.role;
  targetUser.role = role;
  await targetUser.save();

  await AuditLog.create({
    userId: currentUser.id,
    userEmail: currentUser.email,
    userRole: currentUser.role,
    action: "role_change",
    resourceType: "User",
    resourceId: targetUser._id,
    resourceIdentifier: targetUser.email,
    description: `Changed ${targetUser.name}'s role from ${oldRole} to ${role}`,
    changes: [{ field: "role", oldValue: oldRole, newValue: role }],
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const currentUser = await requireRouteAccess("/admin/team");
  await dbConnect();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (id === currentUser.id)
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 400 },
    );

  const targetUser = await User.findById(id);
  if (!targetUser)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Downgrade to customer rather than delete
  const oldRole = targetUser.role;
  targetUser.role = "customer";
  await targetUser.save();

  await AuditLog.create({
    userId: currentUser.id,
    userEmail: currentUser.email,
    userRole: currentUser.role,
    action: "role_change",
    resourceType: "User",
    resourceId: targetUser._id,
    resourceIdentifier: targetUser.email,
    description: `Revoked admin access for ${targetUser.name} (was ${oldRole})`,
    changes: [{ field: "role", oldValue: oldRole, newValue: "customer" }],
  });

  return NextResponse.json({ success: true });
}
