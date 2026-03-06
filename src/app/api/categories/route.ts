import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const shopSlug = new URL(request.url).searchParams.get("shopSlug");

  const where = shopSlug
    ? { products: { some: { shop: { slug: shopSlug }, active: true } } }
    : undefined;

  const categories = await prisma.category.findMany({
    where,
    include: {
      _count: {
        select: {
          products: shopSlug
            ? { where: { shop: { slug: shopSlug }, active: true } }
            : true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ success: true, data: categories });
}
