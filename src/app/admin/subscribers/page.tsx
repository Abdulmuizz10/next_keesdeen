import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Subscriber from "@/lib/models/Subscriber";
import { SubscribersClient } from "./SubscribersClient";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const { permission } = await requireRouteAccess("/admin/subscribers");
  await dbConnect();

  const subscribers = await Subscriber.find()
    .sort({ subscribedAt: -1 })
    .limit(500)
    .lean();

  // Gather unique sources and tags for filter dropdowns
  const sources = new Set<string>();
  const tags = new Set<string>();
  subscribers.forEach((s) => {
    if (s.source) sources.add(s.source);
    s.tags.forEach((t) => tags.add(t));
  });

  // Counts by status
  const statusCounts = {
    all: subscribers.length,
    active: subscribers.filter((s) => s.status === "active").length,
    unsubscribed: subscribers.filter((s) => s.status === "unsubscribed").length,
    bounced: subscribers.filter((s) => s.status === "bounced").length,
  };

  const serialized = subscribers.map((s) => ({
    _id: s._id.toString(),
    email: s.email,
    firstName: s.firstName || "",
    lastName: s.lastName || "",
    status: s.status as "active" | "unsubscribed" | "bounced",
    source: s.source,
    tags: s.tags,
    subscribedAt: s.subscribedAt.toISOString(),
    unsubscribedAt: s.unsubscribedAt?.toISOString() || null,
  }));

  return (
    <SubscribersClient
      initialSubscribers={serialized}
      sources={Array.from(sources)}
      allTags={Array.from(tags)}
      statusCounts={statusCounts}
      permission={permission}
    />
  );
}
