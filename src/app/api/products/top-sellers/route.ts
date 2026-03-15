import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductValidationStatus } from "@/generated/prisma/client";

/** GET ?shopSlug=xxx&limit=8 - Top selling products for a shop */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shopSlug = searchParams.get("shopSlug");
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "8")));

  if (!shopSlug) {
    return NextResponse.json({ success: false, error: "shopSlug required" }, { status: 400 });
  }

  const shop = await prisma.shop.findUnique({
    where: { slug: shopSlug, active: true },
    select: { id: true },
  });
  if (!shop) {
    return NextResponse.json({ success: true, data: [] });
  }

  const soldByProduct = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { shopId: shop.id } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const productIds = soldByProduct.map((r) => r.productId);
  if (productIds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true, validationStatus: ProductValidationStatus.Approved },
    include: {
      category: true,
      petType: true,
      tags: true,
      variants: true,
      shop: { select: { id: true, slug: true, name: true, name_th: true } },
    },
  });

  const ordered = productIds.map((id) => products.find((p) => p.id === id)!).filter(Boolean);
  return NextResponse.json({ success: true, data: ordered });
}
