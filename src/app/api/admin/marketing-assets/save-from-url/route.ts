import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { MarketingAssetType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { url, productId, marketingPackId, prompt, angle } = body as {
    url: string;
    productId: string;
    marketingPackId?: string;
    prompt?: string;
    angle?: string;
  };

  if (!url || !productId) {
    return NextResponse.json(
      { success: false, error: "url and productId required" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, shopId: true },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
  }

  let blobUrl: string;
  let contentType: string | null = null;
  let sizeBytes: number | null = null;
  let width: number | null = null;
  let height: number | null = null;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
    const buf = Buffer.from(await res.arrayBuffer());
    sizeBytes = buf.length;

    if (contentType && ALLOWED_IMAGE_TYPES.includes(contentType)) {
      try {
        const meta = await sharp(buf).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      } catch {
        // ignore dimension read failure
      }
    }

    const ext = contentType?.split("/")[1] ?? "jpg";
    const pathname = `marketing-assets/product-${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(pathname, buf, {
      access: "public",
      contentType: contentType ?? "image/jpeg",
    });
    blobUrl = blob.url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[save-from-url]", msg);
    return NextResponse.json(
      { success: false, error: `ไม่สามารถดึงรูปได้: ${msg}` },
      { status: 500 }
    );
  }

  const asset = await prisma.marketingAsset.create({
    data: {
      url: blobUrl,
      type: MarketingAssetType.IMAGE,
      contentType,
      sizeBytes,
      width,
      height,
      productId,
      shopId: product.shopId,
      marketingPackId: marketingPackId || null,
      prompt: prompt || null,
      angle: angle || null,
    },
  });

  return NextResponse.json({ success: true, data: asset });
}
