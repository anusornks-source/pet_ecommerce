import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const productId = searchParams.get("productId");
  const marketingPackId = searchParams.get("marketingPackId");

  if (!shopId && !productId && !marketingPackId) {
    return NextResponse.json(
      { success: false, error: "shopId, productId หรือ marketingPackId ต้องมีอย่างน้อยหนึ่งค่า" },
      { status: 400 }
    );
  }

  const where: { shopId?: string; productId?: string; marketingPackId?: string } = {};
  if (shopId) where.shopId = shopId;
  if (productId) where.productId = productId;
  if (marketingPackId) where.marketingPackId = marketingPackId;

  const assets = await prisma.marketingAsset.findMany({
    where,
    include: {
      marketingPack: { select: { id: true, productName: true, lang: true } },
      product: { select: { id: true, name: true, name_th: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: assets });
}
