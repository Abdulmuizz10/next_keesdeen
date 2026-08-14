import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import Order from "@/lib/models/Order";
import { buildWorkbook, workbookToBuffer } from "@/lib/export/excel";
import { buildPrintableDoc, docToBuffer } from "@/lib/export/docx";
import { formatPrice } from "@/lib/format";

function bufferToStream(buffer: Buffer) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    },
  });
}

export async function GET(request: NextRequest) {
  await requireRouteAccess("/admin/orders");
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "xlsx").toLowerCase();
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};
  if (status) query.status = status;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) query.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

  const rows = orders.map((order) => ({
    orderNumber: order.orderNumber,
    date: new Date(order.createdAt).toLocaleDateString(),
    customer: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`.trim(),
    email: order.email,
    status: order.status,
    paymentStatus: order.paymentStatus,
    items: order.lines.map((l) => `${l.title} (${l.quantity})`).join("; "),
    subtotal: formatPrice(order.subtotal),
    shipping: formatPrice(order.shippingTotal),
    tax: formatPrice(order.taxTotal),
    total: formatPrice(order.grandTotal),
  }));

  const baseName = `orders-${new Date().toISOString().slice(0, 10)}`;

  if (format === "docx") {
    const doc = await buildPrintableDoc("Orders Export", [
      {
        heading: "Orders",
        headers: ["Order #", "Date", "Customer", "Email", "Status", "Payment", "Items", "Total"],
        rows: rows.map((r) => [r.orderNumber, r.date, r.customer, r.email, r.status, r.paymentStatus, r.items, r.total]),
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
    "Orders",
    [
      { key: "orderNumber", label: "Order #", width: 18 },
      { key: "date", label: "Date", width: 14 },
      { key: "customer", label: "Customer", width: 24 },
      { key: "email", label: "Email", width: 28 },
      { key: "status", label: "Status", width: 14 },
      { key: "paymentStatus", label: "Payment", width: 18 },
      { key: "items", label: "Items", width: 42 },
      { key: "subtotal", label: "Subtotal", width: 14 },
      { key: "shipping", label: "Shipping", width: 14 },
      { key: "tax", label: "Tax", width: 12 },
      { key: "total", label: "Total", width: 14 },
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
