import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 30;
  const action = searchParams.get("action") ?? undefined;
  const success = searchParams.get("success");

  // Shop scoping: non-ADMIN users only see logs for their shops
  const shopFilter =
    auth.role !== "ADMIN" && auth.shopRoles
      ? { shopId: { in: Object.keys(auth.shopRoles) } }
      : {};

  const where = {
    ...shopFilter,
    ...(action ? { action } : {}),
    ...(success === "true" ? { success: true } : success === "false" ? { success: false } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.cjApiLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        order: { select: { id: true } },
      },
    }),
    prisma.cjApiLog.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: logs, total, page, pageSize });
}
