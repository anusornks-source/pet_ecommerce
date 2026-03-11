import { MarketingAssetType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Sync product images (and optionally variant images) to MarketingAsset.
 * Creates MarketingAsset records for URLs that don't already exist for this product.
 */
export async function syncProductImagesToMarketingAssets(
  productId: string,
  shopId: string,
  imageUrls: string[]
): Promise<{ created: number; skipped: number }> {
  const urls = [...new Set(imageUrls)].filter((u) => typeof u === "string" && u.trim().length > 0);
  if (urls.length === 0) return { created: 0, skipped: 0 };

  const existing = await prisma.marketingAsset.findMany({
    where: { productId, url: { in: urls } },
    select: { url: true },
  });
  const existingUrls = new Set(existing.map((e) => e.url));
  const toCreate = urls.filter((u) => !existingUrls.has(u));

  if (toCreate.length === 0) return { created: 0, skipped: urls.length };

  await prisma.marketingAsset.createMany({
    data: toCreate.map((url) => ({
      url,
      type: MarketingAssetType.IMAGE,
      productId,
      shopId,
    })),
  });

  return { created: toCreate.length, skipped: urls.length - toCreate.length };
}
