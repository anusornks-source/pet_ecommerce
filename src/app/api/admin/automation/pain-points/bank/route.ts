import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");

  const data = await prisma.painPoint.findMany({
    where: shopId ? { shopId } : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { shopId, category, painPoint, painPoint_th, severity, productOpportunity, nicheKeyword, shopCanSolve } = body;
  const createdById = auth.userId;

  if (!nicheKeyword) {
    return NextResponse.json({ success: false, error: "nicheKeyword required" }, { status: 400 });
  }

  const existing = await prisma.painPoint.findFirst({
    where: { shopId: shopId ?? null, nicheKeyword },
  });

  if (existing) {
    return NextResponse.json({ success: true, data: existing, skipped: true });
  }

  const data = await prisma.painPoint.create({
    data: {
      shopId: shopId ?? null,
      category: category ?? "",
      painPoint: painPoint ?? "",
      painPoint_th: painPoint_th ?? null,
      severity: severity ?? "medium",
      productOpportunity: productOpportunity ?? "",
      nicheKeyword,
      shopCanSolve: shopCanSolve ?? false,
      createdById,
    },
  });

  return NextResponse.json({ success: true, data, skipped: false });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  }

  await prisma.painPoint.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
