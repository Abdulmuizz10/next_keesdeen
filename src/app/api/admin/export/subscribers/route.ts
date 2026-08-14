import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Subscriber from "@/lib/models/Subscriber";
import { buildWorkbook, workbookToBuffer } from "@/lib/export/excel";
import { buildPrintableDoc, docToBuffer } from "@/lib/export/docx";

function bufferToStream(buffer: Buffer) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    },
  });
}

export async function GET(request: NextRequest) {
  await requireRouteAccess("/admin/subscribers");
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "xlsx").toLowerCase();
  const search = (searchParams.get("search") || "").trim();
  const status = searchParams.get("status") || "";
  const source = searchParams.get("source") || "";
  const tag = searchParams.get("tag") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (status) query.status = status;
  if (source) query.source = source;
  if (tag) query.tags = tag;
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }];
  }

  const subscribers = await Subscriber.find(query).sort({ subscribedAt: -1 }).lean();

  const rows = subscribers.map((sub) => ({
    email: sub.email,
    firstName: sub.firstName || "",
    lastName: sub.lastName || "",
    status: sub.status,
    source: sub.source,
    tags: sub.tags.join(", "),
    subscribedAt: new Date(sub.subscribedAt).toLocaleDateString(),
    unsubscribedAt: sub.unsubscribedAt ? new Date(sub.unsubscribedAt).toLocaleDateString() : "",
  }));

  const baseName = `subscribers-${new Date().toISOString().slice(0, 10)}`;

  if (format === "docx") {
    const doc = await buildPrintableDoc("Subscribers Export", [
      {
        heading: "Subscribers",
        headers: ["Email", "First Name", "Last Name", "Status", "Source", "Tags", "Subscribed", "Unsubscribed"],
        rows: rows.map((r) => [r.email, r.firstName, r.lastName, r.status, r.source, r.tags, r.subscribedAt, r.unsubscribedAt]),
      },
    ]);
    const buffer = await docToBuffer(doc);
    return new NextResponse(bufferToStream(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${baseName}.docx"`,
      },
    });
  }

  const workbook = await buildWorkbook(
    "Subscribers",
    [
      { key: "email", label: "Email", width: 28 },
      { key: "firstName", label: "First Name", width: 16 },
      { key: "lastName", label: "Last Name", width: 16 },
      { key: "status", label: "Status", width: 14 },
      { key: "source", label: "Source", width: 16 },
      { key: "tags", label: "Tags", width: 24 },
      { key: "subscribedAt", label: "Subscribed", width: 16 },
      { key: "unsubscribedAt", label: "Unsubscribed", width: 16 },
    ],
    rows
  );
  const buffer = await workbookToBuffer(workbook);

  return new NextResponse(bufferToStream(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
    },
  });
}
