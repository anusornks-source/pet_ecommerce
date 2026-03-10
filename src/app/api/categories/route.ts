import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const shopSlug = sp.get("shopSlug");
  const shopId = sp.get("shopId");
  const limit = sp.get("limit") ? parseInt(sp.get("limit")!) : undefined;

  const shopFilter = shopSlug
    ? { shop: { slug: shopSlug } }
    : shopId
    ? { shopId }
    : null;

  const where = shopFilter
    ? { products: { some: { ...shopFilter, active: true } } }
    : undefined;

  const categories = await prisma.category.findMany({
    where,
    include: {
      group: {
        select: { id: true, name: true, name_th: true, icon: true },
      },
      _count: {
        select: {
          products: shopFilter
            ? { where: { ...shopFilter, active: true } }
            : true,
        },
      },
    },
    orderBy: { name: "asc" },
    ...(limit ? { take: limit } : {}),
  });
  return NextResponse.json({ success: true, data: categories });
}
