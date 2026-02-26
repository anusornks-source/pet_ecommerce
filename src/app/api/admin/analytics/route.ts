import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    ordersByStatus,
    recentOrders,
    topProducts,
    categoryRevenue,
    paymentMethods,
    userGrowth,
  ] = await Promise.all([
    // Orders grouped by status
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { total: true },
    }),

    // All orders in last 30 days for revenue-by-day chart
    prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, total: true, status: true },
      orderBy: { createdAt: "asc" },
    }),

    // Top 5 products by quantity sold
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),

    // Revenue by category
    prisma.orderItem.findMany({
      include: {
        product: { include: { category: true } },
      },
    }),

    // Payment method distribution
    prisma.payment.groupBy({
      by: ["method"],
      _count: { id: true },
      _sum: { amount: true },
    }),

    // Users registered per day (last 30 days)
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Build revenue-by-day (last 30 days)
  const revenueByDay: Record<string, number> = {};
  const ordersCountByDay: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    revenueByDay[key] = 0;
    ordersCountByDay[key] = 0;
  }
  for (const order of recentOrders) {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    if (key in revenueByDay) {
      revenueByDay[key] += order.total;
      ordersCountByDay[key] += 1;
    }
  }
  const revenueChart = Object.entries(revenueByDay).map(([date, revenue]) => ({
    date,
    revenue,
    orders: ordersCountByDay[date],
  }));

  // Build user growth by day
  const userByDay: Record<string, number> = {};
  for (const key of Object.keys(revenueByDay)) userByDay[key] = 0;
  for (const u of userGrowth) {
    const key = new Date(u.createdAt).toISOString().slice(0, 10);
    if (key in userByDay) userByDay[key] += 1;
  }
  const userGrowthChart = Object.entries(userByDay).map(([date, count]) => ({
    date,
    count,
  }));

  // Resolve top product names
  const topProductIds = topProducts.map((p) => p.productId);
  const productDetails = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, price: true },
  });
  const productMap = Object.fromEntries(productDetails.map((p) => [p.id, p]));
  const topProductsData = topProducts.map((p) => ({
    name: productMap[p.productId]?.name ?? "Unknown",
    quantity: p._sum.quantity ?? 0,
    revenue: p._sum.price ?? 0,
  }));

  // Revenue by category
  const catMap: Record<string, { name: string; icon: string; revenue: number; quantity: number }> = {};
  for (const item of categoryRevenue) {
    const cat = item.product?.category;
    if (!cat) continue;
    if (!catMap[cat.id]) catMap[cat.id] = { name: cat.name, icon: cat.icon ?? "📦", revenue: 0, quantity: 0 };
    catMap[cat.id].revenue += item.price * item.quantity;
    catMap[cat.id].quantity += item.quantity;
  }
  const categoryData = Object.values(catMap).sort((a, b) => b.revenue - a.revenue);

  // Order status summary
  const statusData = ordersByStatus.map((s) => ({
    status: s.status,
    count: s._count.id,
    revenue: s._sum.total ?? 0,
  }));

  // Payment method summary
  const paymentData = paymentMethods.map((p) => ({
    method: p.method,
    count: p._count.id,
    amount: p._sum.amount ?? 0,
  }));

  return NextResponse.json({
    success: true,
    data: {
      revenueChart,
      userGrowthChart,
      topProducts: topProductsData,
      categoryData,
      statusData,
      paymentData,
    },
  });
}
