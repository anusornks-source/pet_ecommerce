import { prisma } from "@/lib/prisma";

/**
 * ตรวจสอบว่า blob URL ยังถูกใช้งานอยู่หรือไม่
 * ใช้ก่อนลบ blob — ถ้ามีใครใช้อยู่ (Product, ProductVariant, MarketingAsset, SupplierProduct) ห้ามลบ
 *
 * @param url - URL ของ blob ที่จะตรวจสอบ
 * @param exclude - บริบทที่กำลังลบอยู่ ให้ exclude ออกจากผลการเช็ค
 * @returns true ถ้ายังมีที่อื่นใช้อยู่ (ห้ามลบ), false ถ้าไม่มีใครใช้แล้ว (ลบได้)
 */
export async function isBlobUrlInUse(
  url: string,
  exclude?: {
    marketingAssetId?: string;
    supplierProductId?: string;
    productId?: string; // product ที่กำลังจะเอา url ออกจาก images/videos/mediaOrder
  }
): Promise<boolean> {
  const trim = (u: string) => u?.trim() ?? "";
  const u = trim(url);
  if (!u || !u.includes("blob.vercel-storage.com")) return false;

  // Product (images, videos, mediaOrder) — exclude product ที่กำลังจะเอา url ออก
  const productWhere = {
    ...(exclude?.productId && { id: { not: exclude.productId } }),
    OR: [
      { images: { has: u } },
      { videos: { has: u } },
      { mediaOrder: { has: u } },
    ],
  };
  const otherProduct = await prisma.product.findFirst({
    where: productWhere,
    select: { id: true },
  });
  if (otherProduct) return true;

  // ProductVariant (variantImage)
  const variantUsing = await prisma.productVariant.findFirst({
    where: { variantImage: u },
    select: { id: true },
  });
  if (variantUsing) return true;

  // MarketingAsset — exclude asset ที่กำลังลบ
  const assetWhere = {
    url: u,
    ...(exclude?.marketingAssetId && { id: { not: exclude.marketingAssetId } }),
  };
  const otherAssetCount = await prisma.marketingAsset.count({
    where: assetWhere,
  });
  if (otherAssetCount > 0) return true;

  // SupplierProduct (images) — exclude supplier product ที่กำลังลบ
  const spWhere = {
    images: { has: u },
    ...(exclude?.supplierProductId && { id: { not: exclude.supplierProductId } }),
  };
  const otherSpCount = await prisma.supplierProduct.count({
    where: spWhere,
  });
  if (otherSpCount > 0) return true;

  return false;
}
