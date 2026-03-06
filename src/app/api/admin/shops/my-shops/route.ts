import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/admin/shops/my-shops — returns shops accessible to current user */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let shops;
  if (payload.role === "ADMIN") {
    // Super admin sees all shops
    shops = await prisma.shop.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, name_th: true, slug: true, logoUrl: true, usePetType: true, active: true },
    });
  } else {
    // Shop members see only their shops
    const memberships = await prisma.shopMember.findMany({
      where: { userId: payload.userId },
      include: {
        shop: {
          select: { id: true, name: true, name_th: true, slug: true, logoUrl: true, usePetType: true, active: true },
        },
      },
    });
    shops = memberships.map((m) => m.shop);
  }

  return NextResponse.json({ success: true, data: shops });
}
