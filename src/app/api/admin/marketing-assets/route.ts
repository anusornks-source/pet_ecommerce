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
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "32")));

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

  const isShopContext = !!shopId && !productId && !marketingPackId;
  const assets = await prisma.marketingAsset.findMany({
    where,
    include: {
      marketingPack: { select: { id: true, productName: true, lang: true } },
      product: {
        select: {
          id: true,
          name: true,
          name_th: true,
          ...(isShopContext && { images: true, videos: true }),
        },
      },
    },
  });

  // ลำดับตาม context (shop/product/pack) — แยกกันไม่ชน
  let orderIds: string[] = [];
  if (shopId && !productId && !marketingPackId) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { marketingAssetOrder: true },
    });
    orderIds = shop?.marketingAssetOrder ?? [];
  } else if (productId && !marketingPackId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { marketingAssetOrder: true },
    });
    orderIds = product?.marketingAssetOrder ?? [];
  } else if (marketingPackId) {
    const pack = await prisma.productMarketingPack.findUnique({
      where: { id: marketingPackId },
      select: { marketingAssetOrder: true },
    });
    orderIds = pack?.marketingAssetOrder ?? [];
  }

  const byId = new Map(assets.map((a) => [a.id, a]));
  const ordered = orderIds
    .map((id) => byId.get(id))
    .filter(Boolean) as typeof assets;
  const unordered = assets.filter((a) => !orderIds.includes(a.id));
  unordered.sort(
    (a, b) =>
      (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
      a.createdAt.getTime() - b.createdAt.getTime()
  );
  const sorted = [...ordered, ...unordered];

  const total = sorted.length;
  const offset = (page - 1) * limit;
  const paged = sorted.slice(offset, offset + limit);

  return NextResponse.json({
    success: true,
    data: paged,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
