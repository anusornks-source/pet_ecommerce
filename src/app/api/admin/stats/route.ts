import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const [
    totalProducts,
    totalCategories,
    totalOrders,
    totalUsers,
    recentOrders,
    revenueResult,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          take: 2,
          include: {
            product: { select: { name: true, cjProductId: true } },
            variant: { select: { cjVid: true } },
          },
        },
        payment: { select: { method: true, status: true } },
      },
    }),
    prisma.order.aggregate({
      where: { status: "DELIVERED" },
      _sum: { total: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      totalProducts,
      totalCategories,
      totalOrders,
      totalUsers,
      revenue: revenueResult._sum.total ?? 0,
      recentOrders,
    },
  });
}
