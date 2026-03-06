import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  // Shop scoping: non-ADMIN users can only see logs for orders in their shops
  if (auth.role !== "ADMIN" && auth.shopRoles) {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { shopId: true },
    });
    if (!order || !auth.shopRoles[order.shopId]) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const logs = await prisma.cjApiLog.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: logs });
}
