import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/marketing-assets/reorder
 * Body: { ids: string[], shopId?, productId?, marketingPackId?, page?, limit? }
 * เมื่อมี page+limit = merge ลำดับของหน้านั้นเข้ากับ full order
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { ids, shopId, productId, marketingPackId, page, limit } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: "ids array required" }, { status: 400 });
  }

  const hasShop = !!shopId && !productId && !marketingPackId;
  const hasProduct = !!productId && !marketingPackId;
  const hasPack = !!marketingPackId;

  if (!hasShop && !hasProduct && !hasPack) {
    return NextResponse.json(
      { success: false, error: "ต้องมี shopId, productId หรือ marketingPackId อย่างใดอย่างหนึ่ง" },
      { status: 400 }
    );
  }

  try {
    let newOrder: string[] = ids;

    if (page != null && limit != null && page >= 1 && limit >= 1) {
      let fullOrder: string[] = [];
      if (hasShop) {
        const shop = await prisma.shop.findUnique({
          where: { id: shopId },
          select: { marketingAssetOrder: true },
        });
        fullOrder = shop?.marketingAssetOrder ?? [];
      } else if (hasPack) {
        const pack = await prisma.productMarketingPack.findUnique({
          where: { id: marketingPackId },
          select: { marketingAssetOrder: true },
        });
        fullOrder = pack?.marketingAssetOrder ?? [];
      } else {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { marketingAssetOrder: true },
        });
        fullOrder = product?.marketingAssetOrder ?? [];
      }
      const offset = (page - 1) * limit;
      newOrder = [
        ...fullOrder.slice(0, offset),
        ...ids,
        ...fullOrder.slice(offset + ids.length),
      ];
    }

    if (hasShop) {
      await prisma.shop.update({
        where: { id: shopId },
        data: { marketingAssetOrder: newOrder },
      });
    } else if (hasPack) {
      await prisma.productMarketingPack.update({
        where: { id: marketingPackId },
        data: { marketingAssetOrder: newOrder },
      });
    } else {
      await prisma.product.update({
        where: { id: productId },
        data: { marketingAssetOrder: newOrder },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Reorder failed",
    });
  }
}
