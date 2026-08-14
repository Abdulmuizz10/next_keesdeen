import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Subscriber from "@/lib/models/Subscriber";

export async function POST(request: NextRequest) {
  const { permission } = await requireRouteAccess("/admin/subscribers");
  if (permission === "read") {
    return NextResponse.json({ error: "Read-only access" }, { status: 403 });
  }
  await dbConnect();

  const { action, ids, tag } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  switch (action) {
    case "add_tag":
      if (!tag) return NextResponse.json({ error: "tag required" }, { status: 400 });
      await Subscriber.updateMany(
        { _id: { $in: ids } },
        { $addToSet: { tags: tag.toLowerCase().trim() } }
      );
      break;

    case "remove_tag":
      if (!tag) return NextResponse.json({ error: "tag required" }, { status: 400 });
      await Subscriber.updateMany(
        { _id: { $in: ids } },
        { $pull: { tags: tag.toLowerCase().trim() } }
      );
      break;

    case "unsubscribe":
      await Subscriber.updateMany(
        { _id: { $in: ids } },
        { status: "unsubscribed", unsubscribedAt: new Date() }
      );
      break;

    case "resubscribe":
      await Subscriber.updateMany(
        { _id: { $in: ids } },
        { status: "active", $unset: { unsubscribedAt: 1 } }
      );
      break;

    case "delete":
      if (permission !== "full") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
      await Subscriber.deleteMany({ _id: { $in: ids } });
      break;

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, affected: ids.length });
}
