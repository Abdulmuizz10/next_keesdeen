import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Subscriber from "@/lib/models/Subscriber";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://keesdeen.com";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const token = req.nextUrl.searchParams.get("token");

  if (!id || !token || !verifyUnsubscribeToken(id, token)) {
    return NextResponse.redirect(`${SITE_URL}/unsubscribe?status=invalid`);
  }

  await dbConnect();

  const subscriber = await Subscriber.findById(id);
  if (!subscriber) {
    return NextResponse.redirect(`${SITE_URL}/unsubscribe?status=invalid`);
  }

  if (subscriber.status !== "unsubscribed") {
    subscriber.status = "unsubscribed";
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();
  }

  return NextResponse.redirect(`${SITE_URL}/unsubscribe?status=success`);
}
