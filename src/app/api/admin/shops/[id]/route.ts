import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

/** GET /api/admin/shops/[id] — get shop detail */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
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

/** PUT /api/admin/shops/[id] — update shop */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { name, name_th, slug, description, description_th, logoUrl, coverUrl, usePetType, active } = body;

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
