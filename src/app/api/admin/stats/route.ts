import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function GET(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const [
    totalProducts,
    totalCategories,
    totalOrders,
    totalUsers,
    recentOrders,
    revenueResult,
  ] = await Promise.all([
    prisma.product.count({ where: { shopId } }),
    prisma.category.count(),
    prisma.order.count({ where: { shopId } }),
    prisma.user.count(),
    prisma.order.findMany({
      where: { shopId },
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
      where: { status: "DELIVERED", shopId },
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
