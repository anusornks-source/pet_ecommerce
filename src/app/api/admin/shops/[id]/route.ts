import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireShopOwner, isNextResponse } from "@/lib/adminAuth";

/** GET /api/admin/shops/[id] — get shop detail (ADMIN or shop OWNER/MANAGER) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireShopOwner(request, id, "MANAGER");
  if (isNextResponse(auth)) return auth;
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      settings: true,
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      shopCategories: { include: { category: true } },
      _count: { select: { products: true, orders: true } },
    },
  });

  if (!shop) {
    return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: shop });
}

/** PUT /api/admin/shops/[id] — update shop (ADMIN or shop OWNER) */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireShopOwner(request, id, "OWNER");
  if (isNextResponse(auth)) return auth;
  const body = await request.json();
  const { name, name_th, slug, description, description_th, logoUrl, coverUrl, usePetType, active, primaryColor, secondaryColor, bgColor } = body;

  const shop = await prisma.shop.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(name_th !== undefined && { name_th: name_th?.trim() || null }),
      ...(slug !== undefined && { slug: slug.trim().toLowerCase() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(description_th !== undefined && { description_th: description_th?.trim() || null }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl?.trim() || null }),
      ...(coverUrl !== undefined && { coverUrl: coverUrl?.trim() || null }),
      ...(usePetType !== undefined && { usePetType: !!usePetType }),
      ...(active !== undefined && { active: !!active }),
    },
  });

  if (primaryColor !== undefined || secondaryColor !== undefined || bgColor !== undefined) {
    await prisma.shopSettings.upsert({
      where: { shopId: id },
      create: {
        shopId: id,
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(bgColor && { bgColor }),
      },
      update: {
        ...(primaryColor && { primaryColor }),
        ...(secondaryColor && { secondaryColor }),
        ...(bgColor && { bgColor }),
      },
    });
  }

  return NextResponse.json({ success: true, data: shop });
}

/** DELETE /api/admin/shops/[id] — deactivate shop */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const shop = await prisma.shop.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true, data: shop });
}
