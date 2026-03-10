import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/shops?slug=xxx — public shop info */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  // If slug is provided, return single shop (existing behavior)
  if (slug) {
    const shop = await prisma.shop.findUnique({
      where: { slug, active: true },
      select: { id: true, name: true, name_th: true, slug: true, logoUrl: true, usePetType: true },
    });
    if (!shop) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: shop });
  }

  // Otherwise, return all active shops for CartNova hub / filters
  const shops = await prisma.shop.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      name_th: true,
      slug: true,
      logoUrl: true,
      description: true,
      description_th: true,
      usePetType: true,
    },
  });

  return NextResponse.json({ success: true, data: shops });
}
