import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const status = searchParams.get("status");
  const platformSource = searchParams.get("platformSource");

  const where: Record<string, unknown> = {};
  if (shopId) where.shopId = shopId;
  if (status) where.status = status;
  if (platformSource) where.platformSource = platformSource;

  const data = await prisma.trendCandidate.findMany({
    where,
    orderBy: [{ status: "asc" }, { overallScore: "desc" }, { createdAt: "desc" }],
    include: {
      product: { select: { id: true, name: true, name_th: true, images: true } },
    },
  });

  // Group by status for pipeline view
  const grouped = {
    pending: data.filter((d) => d.status === "pending"),
    scored: data.filter((d) => d.status === "scored"),
    approved: data.filter((d) => d.status === "approved"),
    enriched: data.filter((d) => d.status === "enriched"),
    imported: data.filter((d) => d.status === "imported"),
    rejected: data.filter((d) => d.status === "rejected"),
  };

  return NextResponse.json({ success: true, data, grouped, total: data.length });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  }

  await prisma.trendCandidate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
