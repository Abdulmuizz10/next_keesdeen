import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * POST /api/revalidate
 * Revalidates storefront ISR pages immediately after admin saves.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paths } = body as { paths?: string[] };

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: "paths array is required" }, { status: 400 });
    }

    for (const p of paths) {
      revalidatePath(p);
    }

    return NextResponse.json({ revalidated: true, paths });
  } catch {
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
