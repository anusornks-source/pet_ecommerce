import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { MarketingAssetType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const productId = formData.get("productId") as string | null;
  const marketingPackId = (formData.get("marketingPackId") as string) || null;
  const prompt = (formData.get("prompt") as string) || null;
  const angle = (formData.get("angle") as string) || null;

  if (!file || !productId) {
    return NextResponse.json(
      { success: false, error: "file and productId required" },
      { status: 400 },
    );
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: "รองรับเฉพาะไฟล์ภาพ (jpg, png, webp, gif)" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: "ไฟล์ใหญ่เกิน 10MB" },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, shopId: true },
  });
  if (!product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 },
    );
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());

    let width: number | null = null;
    let height: number | null = null;
    try {
      const meta = await sharp(buf).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      // ignore dimension read failure
    }

    const ext = file.type.split("/")[1] ?? "png";
    const pathname = `marketing-assets/product-${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(pathname, buf, {
      access: "public",
      contentType: file.type,
    });

    const asset = await prisma.marketingAsset.create({
      data: {
        url: blob.url,
        type: MarketingAssetType.IMAGE,
        contentType: file.type,
        sizeBytes: buf.length,
        width,
        height,
        productId,
        shopId: product.shopId,
        marketingPackId,
        prompt,
        angle,
      },
    });

    return NextResponse.json({ success: true, data: asset });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-direct]", msg);
    return NextResponse.json(
      { success: false, error: `อัปโหลดไม่สำเร็จ: ${msg}` },
      { status: 500 },
    );
  }
}
