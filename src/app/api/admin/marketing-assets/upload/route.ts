import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { MarketingAssetType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

const ALLOWED_TYPES: Record<string, (typeof MarketingAssetType)[keyof typeof MarketingAssetType]> = {
  "image/jpeg": MarketingAssetType.IMAGE,
  "image/png": MarketingAssetType.IMAGE,
  "image/webp": MarketingAssetType.IMAGE,
  "image/gif": MarketingAssetType.IMAGE,
  "video/mp4": MarketingAssetType.VIDEO,
  "video/webm": MarketingAssetType.VIDEO,
  "application/pdf": MarketingAssetType.PDF,
};

const MAX_IMAGE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO = 50 * 1024 * 1024; // 50MB
const MAX_PDF = 10 * 1024 * 1024;   // 10MB

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const shopId = formData.get("shopId") as string | null;
  const productId = formData.get("productId") as string | null;

  if (!file) {
    return NextResponse.json({ success: false, error: "ไม่พบไฟล์" }, { status: 400 });
  }
  if (!shopId && !productId) {
    return NextResponse.json(
      { success: false, error: "shopId หรือ productId ต้องมีอย่างน้อยหนึ่งค่า" },
      { status: 400 }
    );
  }

  const assetType = ALLOWED_TYPES[file.type];
  if (!assetType) {
    return NextResponse.json(
      { success: false, error: "รองรับเฉพาะ jpg, png, webp, gif, mp4, webm, pdf" },
      { status: 400 }
    );
  }

  const maxSize = assetType === MarketingAssetType.IMAGE ? MAX_IMAGE : assetType === MarketingAssetType.VIDEO ? MAX_VIDEO : MAX_PDF;
  if (file.size > maxSize) {
    return NextResponse.json(
      { success: false, error: `ไฟล์ใหญ่เกิน ${Math.round(maxSize / 1024 / 1024)}MB` },
      { status: 400 }
    );
  }

  let resolvedShopId = shopId;
  if (productId && !shopId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { shopId: true },
    });
    resolvedShopId = product?.shopId ?? null;
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const prefix = productId ? `product-${productId}` : `shop-${shopId}`;
  const pathname = `marketing-assets/${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
  });

  let width: number | null = null;
  let height: number | null = null;

  if (assetType === MarketingAssetType.IMAGE) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const meta = await sharp(buf).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      // ignore
    }
  }

  const asset = await prisma.marketingAsset.create({
    data: {
      url: blob.url,
      type: assetType,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      width,
      height,
      shopId: resolvedShopId,
      productId: productId || null,
    },
  });

  return NextResponse.json({ success: true, data: asset });
}
