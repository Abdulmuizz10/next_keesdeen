import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Subscriber from "@/lib/models/Subscriber";

export async function GET(request: NextRequest) {
  await requireRouteAccess("/admin/subscribers");
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const source = searchParams.get("source") || "";
  const tag = searchParams.get("tag") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (search) query.email = { $regex: search, $options: "i" };
  if (status) query.status = status;
  if (source) query.source = source;
  if (tag) query.tags = tag;

  const subscribers = await Subscriber.find(query)
    .sort({ subscribedAt: -1 })
    .limit(500)
    .lean();

  return NextResponse.json(
    subscribers.map((s) => ({
      _id: s._id.toString(),
      email: s.email,
      firstName: s.firstName || "",
      lastName: s.lastName || "",
      status: s.status,
      source: s.source,
      tags: s.tags,
      subscribedAt: s.subscribedAt.toISOString(),
      unsubscribedAt: s.unsubscribedAt?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
    }))
  );
}

export async function PATCH(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/subscribers");
  if (permission === "read") {
    return NextResponse.json({ error: "Read-only access" }, { status: 403 });
  }
  await dbConnect();

  const { _id, ...updates } = await request.json();

  if (updates.status === "unsubscribed") {
    updates.unsubscribedAt = new Date();
  } else if (updates.status === "active") {
    updates.unsubscribedAt = null;
  }

  await Subscriber.findByIdAndUpdate(_id, updates);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/subscribers");
  if (permission !== "full") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  await dbConnect();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await Subscriber.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
