import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

const PAGE_SIZE = 30;

export async function GET(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const days = parseInt(searchParams.get("days") ?? "0"); // 0 = all

  const now = new Date();
  const cutoff = days > 0 ? new Date(now.getTime() - days * 86400000) : undefined;

  // Build where: carts with items, optionally filtered by shop and age
  const where: Record<string, unknown> = {
    items: { some: {} }, // must have at least 1 item
  };
  if (cutoff) {
    where.updatedAt = { lt: cutoff };
  }
  // Filter by shop: cart items must belong to products in this shop
  if (shopId !== "all") {
    where.items = { some: { product: { shopId } } };
  }

  const [carts, total] = await Promise.all([
    prisma.cart.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, name_th: true, price: true, normalPrice: true, images: true, shopId: true, source: true, fulfillmentMethod: true, cjProductId: true } },
            variant: { select: { id: true, size: true, color: true, price: true, sku: true, variantImage: true, fulfillmentMethod: true, cjVid: true } },
          },
        },
      },
      orderBy: { updatedAt: "asc" }, // oldest first (most abandoned)
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.cart.count({ where }),
  ]);

  // Calculate stats from all matching carts (not just current page)
  const allCarts = await prisma.cart.findMany({
    where,
    select: {
      updatedAt: true,
      items: {
        select: {
          quantity: true,
          product: { select: { price: true } },
          variant: { select: { price: true } },
        },
      },
    },
  });

  let totalValue = 0;
  let totalItems = 0;
  let totalAgeDays = 0;
  for (const c of allCarts) {
    const ageDays = (now.getTime() - new Date(c.updatedAt).getTime()) / 86400000;
    totalAgeDays += ageDays;
    for (const item of c.items) {
      const price = item.variant?.price ?? item.product.price;
      totalValue += price * item.quantity;
      totalItems += item.quantity;
    }
  }

  const stats = {
    totalCarts: total,
    totalValue,
    totalItems,
    avgAgeDays: total > 0 ? Math.round(totalAgeDays / total) : 0,
  };

  // Enrich cart data with computed fields
  const data = carts.map((c) => {
    let cartValue = 0;
    let itemCount = 0;
    for (const item of c.items) {
      const price = item.variant?.price ?? item.product.price;
      cartValue += price * item.quantity;
      itemCount += item.quantity;
    }
    const ageDays = Math.round((now.getTime() - new Date(c.updatedAt).getTime()) / 86400000);
    return { ...c, cartValue, itemCount, ageDays };
  });

  return NextResponse.json({ success: true, data, stats, total, page, pageSize: PAGE_SIZE });
}
