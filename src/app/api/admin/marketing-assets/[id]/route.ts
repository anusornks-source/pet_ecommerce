import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { note } = body;

  const asset = await prisma.marketingAsset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
  }

  const updated = await prisma.marketingAsset.update({
    where: { id },
    data: { ...(note !== undefined && { note: note === "" ? null : String(note) }) },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  const asset = await prisma.marketingAsset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
  }

  // ลบจาก blob เฉพาะเมื่อไม่มี product อื่นหรือ marketing asset อื่นใช้ URL นี้
  try {
    if (asset.url && asset.url.includes("blob.vercel-storage.com")) {
      const otherProductUsingUrl = await prisma.product.findFirst({
        where: {
          ...(asset.productId && { id: { not: asset.productId } }),
          OR: [
            { images: { has: asset.url } },
            { videos: { has: asset.url } },
          ],
        },
        select: { id: true },
      });
      const otherAssetCount = await prisma.marketingAsset.count({
        where: {
          id: { not: id },
          url: asset.url,
        },
      });
      if (!otherProductUsingUrl && otherAssetCount === 0) {
        await del(asset.url);
      }
    }
  } catch (err) {
    console.error("[marketing-assets] blob del error:", err);
  }

  // ถ้า asset นี้เป็นรูป/วิดีโอสินค้า ให้เอาออกจาก product.images/videos/mediaOrder ด้วย
  if (asset.productId && asset.url) {
    const product = await prisma.product.findUnique({
      where: { id: asset.productId },
      select: { images: true, videos: true, mediaOrder: true },
    });
    if (product) {
      const url = asset.url;
      const trim = (u: string) => u?.trim() ?? "";
      const updates: { images?: string[]; videos?: string[]; mediaOrder?: string[] } = {};
      if (asset.type === "IMAGE") {
        const newImages = product.images.filter((u) => u !== url && trim(u) !== trim(url));
        if (newImages.length !== product.images.length) updates.images = newImages;
      } else if (asset.type === "VIDEO") {
        const newVideos = (product.videos ?? []).filter((u) => u !== url && trim(u) !== trim(url));
        if (newVideos.length !== (product.videos?.length ?? 0)) updates.videos = newVideos;
      }
      const newMediaOrder = (product.mediaOrder ?? []).filter((u) => u !== url && trim(u) !== trim(url));
      if (newMediaOrder.length !== (product.mediaOrder?.length ?? 0)) updates.mediaOrder = newMediaOrder;
      if (Object.keys(updates).length > 0) {
        await prisma.product.update({
          where: { id: asset.productId },
          data: updates,
        });
      }
    }
  }

  await prisma.marketingAsset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
