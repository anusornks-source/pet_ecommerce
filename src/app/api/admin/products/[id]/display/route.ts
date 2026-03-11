import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

/** PATCH /api/admin/products/[id]/display
 * Update product images and/or videos arrays (for reorder, add/remove from marketing assets)
 * Body: { images?: string[], videos?: string[] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId, payload } = auth;
  const isAdmin = payload.role === "ADMIN";

  const { id } = await params;
  const body = await request.json();
  const { images, videos } = body as { images?: string[]; videos?: string[] };

  const existing = await prisma.product.findFirst({
    where: isAdmin ? { id } : { id, shopId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }

  const data: { images?: string[]; videos?: string[] } = {};
  if (images !== undefined) data.images = Array.isArray(images) ? images : [];
  if (videos !== undefined) data.videos = Array.isArray(videos) ? videos : [];

  const product = await prisma.product.update({
    where: { id },
    data,
    select: { id: true, images: true, videos: true },
  });

  return NextResponse.json({ success: true, data: product });
}
