import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus");
  const source = searchParams.get("source");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (paymentStatus) where.payment = { status: paymentStatus };
  if (source === "CJ") where.items = { some: { OR: [{ product: { cjProductId: { not: null } } }, { variant: { cjVid: { not: null } } }] } };
  if (source === "MANUAL") where.NOT = { items: { some: { OR: [{ product: { cjProductId: { not: null } } }, { variant: { cjVid: { not: null } } }] } } };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { product: { select: { name: true, cjProductId: true } }, variant: { select: { cjVid: true } } } },
        payment: { select: { method: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: orders, total, page, pageSize: PAGE_SIZE });
}
