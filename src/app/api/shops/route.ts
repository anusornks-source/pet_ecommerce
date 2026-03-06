import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/shops?slug=xxx — public shop info */
export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ success: false, error: "slug required" }, { status: 400 });

  const shop = await prisma.shop.findUnique({
    where: { slug, active: true },
    select: { id: true, name: true, slug: true, logoUrl: true, usePetType: true },
  });
  if (!shop) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: shop });
}
