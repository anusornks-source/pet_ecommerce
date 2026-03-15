import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductValidationStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const petType = searchParams.get("petType");
  const search = searchParams.get("search");
  const featured = searchParams.get("featured");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
  const skip = (page - 1) * limit;

  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort") || "newest";

  const shopSlug = searchParams.get("shopSlug");
  const shelfSlug = searchParams.get("shelf");

  const where: Record<string, unknown> = { active: true, validationStatus: ProductValidationStatus.Approved };
  let shelfOrderedIds: string[] | null = null;

  if (shopSlug) {
    where.shop = { slug: shopSlug };
  }
  if (shelfSlug && shopSlug) {
    const shelf = await prisma.shelf.findFirst({
      where: { slug: shelfSlug, shop: { slug: shopSlug } },
      include: { items: { select: { productId: true }, orderBy: { order: "asc" } } },
    });
    if (shelf && shelf.items.length > 0) {
      shelfOrderedIds = shelf.items.map((i) => i.productId);
      where.id = { in: shelfOrderedIds };
    } else {
      return NextResponse.json({ success: true, data: [], pagination: { page, limit, total: 0, pages: 0 } });
    }
  }
  if (category) {
    where.category = { slug: category };
  }
  if (petType) {
    where.petType = { slug: petType };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { name_th: { contains: search, mode: "insensitive" } },
      { shortDescription: { contains: search, mode: "insensitive" } },
      { shortDescription_th: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { description_th: { contains: search, mode: "insensitive" } },
    ];
  }
  if (featured === "true") {
    where.featured = true;
  }
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
      ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
    };
  }

  if (sort === "best_seller") {
    const productIds = (await prisma.product.findMany({ where, select: { id: true } })).map((p) => p.id);
    if (productIds.length === 0) {
      return NextResponse.json({ success: true, data: [], pagination: { page, limit, total: 0, pages: 0 } });
    }
    const shopWhere = shopSlug
      ? { order: { shop: { slug: shopSlug } } }
      : {};
    const soldByProduct = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds }, ...shopWhere },
      _sum: { quantity: true },
    });
    const soldMap = new Map(soldByProduct.map((r) => [r.productId, r._sum.quantity ?? 0]));
    const sortedIds = [...productIds].sort((a, b) => (soldMap.get(b) ?? 0) - (soldMap.get(a) ?? 0));
    const pageIds = sortedIds.slice(skip, skip + limit);
    const products = await prisma.product.findMany({
      where: { id: { in: pageIds } },
      include: {
        category: true,
        petType: true,
        tags: true,
        variants: true,
        shop: { select: { id: true, slug: true, name: true, name_th: true } },
      },
    });
    const productsOrdered = pageIds.map((id) => products.find((p) => p.id === id)!).filter(Boolean);
    return NextResponse.json({
      success: true,
      data: productsOrdered,
      pagination: { page, limit, total: productIds.length, pages: Math.ceil(productIds.length / limit) },
    });
  }

  const orderBy =
    sort === "price_asc" ? { price: "asc" as const } :
    sort === "price_desc" ? { price: "desc" as const } :
    sort === "name_asc" ? { name: "asc" as const } :
    sort === "oldest" ? { createdAt: "asc" as const } :
    { createdAt: "desc" as const };

  const pageIds = shelfOrderedIds ? shelfOrderedIds.slice(skip, skip + limit) : null;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: pageIds ? { ...where, id: { in: pageIds } } : where,
      include: {
        category: true,
        petType: true,
        tags: true,
        variants: true,
        shop: { select: { id: true, slug: true, name: true, name_th: true } },
      },
      ...(pageIds ? {} : { orderBy, skip, take: limit }),
    }),
    prisma.product.count({ where }),
  ]);

  const data = pageIds
    ? pageIds.map((id) => products.find((p) => p.id === id)!).filter(Boolean)
    : products;

  return NextResponse.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
