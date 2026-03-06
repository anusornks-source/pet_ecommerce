import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

/** GET /api/admin/shops/[id]/categories — list categories enabled for this shop */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request, "STAFF");
  if (isShopAuthResponse(auth)) return auth;

  const { id } = await params;

  // All global categories + which ones are enabled for this shop
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      shopCategories: { where: { shopId: id }, select: { id: true } },
      group: true,
    },
  });

  const data = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    name_th: cat.name_th,
    slug: cat.slug,
    icon: cat.icon,
    groupId: cat.groupId,
    group: cat.group ? { id: cat.group.id, name: cat.group.name, name_th: cat.group.name_th, icon: cat.group.icon } : null,
    enabled: cat.shopCategories.length > 0,
  }));

  return NextResponse.json({ success: true, data });
}

/** PUT /api/admin/shops/[id]/categories — set enabled categories for this shop */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request, "OWNER");
  if (isShopAuthResponse(auth)) return auth;

  const { id } = await params;
  const { categoryIds } = await request.json(); // string[]

  if (!Array.isArray(categoryIds)) {
    return NextResponse.json({ success: false, error: "categoryIds must be an array" }, { status: 400 });
  }

  // Delete all existing, then create selected
  await prisma.shopCategory.deleteMany({ where: { shopId: id } });
  if (categoryIds.length > 0) {
    await prisma.shopCategory.createMany({
      data: categoryIds.map((categoryId: string) => ({ shopId: id, categoryId })),
    });
  }

  return NextResponse.json({ success: true });
}
