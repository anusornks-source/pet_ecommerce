import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

/** GET /api/admin/shops — list all shops (ADMIN only) */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, { strictAdmin: true });
  if (isNextResponse(auth)) return auth;

  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { products: true, orders: true, members: true } },
      members: {
        select: { role: true, user: { select: { id: true, name: true, email: true, phone: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ success: true, data: shops });
}

/** POST /api/admin/shops — create a new shop (ADMIN only) */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, { strictAdmin: true });
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { name, name_th, slug, description, description_th, logoUrl, coverUrl, usePetType } = body;

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ success: false, error: "Name and slug are required" }, { status: 400 });
  }

  const existing = await prisma.shop.findUnique({ where: { slug: slug.trim() } });
  if (existing) {
    return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 400 });
  }

  const shop = await prisma.shop.create({
    data: {
      name: name.trim(),
      name_th: name_th?.trim() || null,
      slug: slug.trim().toLowerCase(),
      description: description?.trim() || null,
      description_th: description_th?.trim() || null,
      logoUrl: logoUrl?.trim() || null,
      coverUrl: coverUrl?.trim() || null,
      usePetType: usePetType !== false,
    },
  });

  // Auto-create ShopSettings
  await prisma.shopSettings.create({
    data: { shopId: shop.id },
  });

  // Auto-add creator as OWNER
  await prisma.shopMember.create({
    data: { userId: auth.userId, shopId: shop.id, role: "OWNER" },
  });

  return NextResponse.json({ success: true, data: shop });
}
