import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/marketing-assets/reorder
 * Body: { ids: string[] } — asset IDs in desired order
 * Updates sortOrder for each asset (0, 1, 2, ...)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: "ids array required" }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      ids.map((id: string, index: number) =>
        prisma.marketingAsset.updateMany({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Reorder failed",
    });
  }
}
