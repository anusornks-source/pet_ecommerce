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
  const { name, slug, description, color, active, order } = body;

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

  const shelf = await prisma.shelf.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description: description || null }),
      ...(color !== undefined && { color }),
      ...(active !== undefined && { active }),
      ...(order !== undefined && { order }),
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
