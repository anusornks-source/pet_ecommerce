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

  const logs = await prisma.cjApiLog.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: logs });
}
