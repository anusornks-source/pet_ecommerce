import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import { syncProductImagesToMarketingAssets } from "@/lib/marketingAssets";

/** POST /api/admin/products/[id]/add-images-to-marketing-assets
 * Add all product images + variant images to marketing assets (creates if not exist)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId, payload } = auth;
  const isAdmin = payload.role === "ADMIN";

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: isAdmin ? { id } : { id, shopId },
    include: { variants: { select: { variantImage: true } } },
  });

  if (!product) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }

  const variantImages = product.variants
    .map((v) => v.variantImage)
    .filter((u): u is string => !!u);
  const allUrls = [...product.images, ...variantImages];

  const { created, skipped } = await syncProductImagesToMarketingAssets(
    product.id,
    product.shopId,
    allUrls
  );

  return NextResponse.json({
    success: true,
    data: { created, skipped, total: allUrls.length },
  });
}
