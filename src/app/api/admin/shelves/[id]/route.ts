import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { id } = await params;
  const body = await request.json();
  const { name, name_th, slug, description, description_th, color, active, order, sourceType, limit } = body;

  // Verify shelf belongs to this shop
  const existingShelf = await prisma.shelf.findFirst({ where: { id, shopId } });
  if (!existingShelf) {
    return NextResponse.json({ success: false, error: "ไม่พบชั้นวาง" }, { status: 404 });
  }

  // Check slug uniqueness if being changed
  if (slug) {
    const existing = await prisma.shelf.findFirst({ where: { slug, shopId, NOT: { id } } });
    if (existing) {
      return NextResponse.json({ success: false, error: "slug นี้มีอยู่แล้ว" }, { status: 409 });
    }
  }

  const validSource = sourceType && ["manual", "best_seller", "featured"].includes(sourceType) ? sourceType : undefined;
  const shelfLimit = typeof limit === "number" ? Math.min(20, Math.max(1, limit)) : undefined;

  const shelf = await prisma.shelf.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(name_th !== undefined && { name_th: name_th || null }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description: description || null }),
      ...(description_th !== undefined && { description_th: description_th || null }),
      ...(color !== undefined && { color }),
      ...(active !== undefined && { active }),
      ...(order !== undefined && { order }),
      ...(validSource !== undefined && { sourceType: validSource }),
      ...(shelfLimit !== undefined && { limit: shelfLimit }),
    },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ success: true, data: shelf });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { id } = await params;
  // Verify shelf belongs to this shop
  const existingShelfDel = await prisma.shelf.findFirst({ where: { id, shopId } });
  if (!existingShelfDel) {
    return NextResponse.json({ success: false, error: "ไม่พบชั้นวาง" }, { status: 404 });
  }

  await prisma.shelf.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
