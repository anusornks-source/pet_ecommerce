import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import { syncProductImagesToMarketingAssets } from "@/lib/marketingAssets";
import { ProductValidationStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId, payload } = auth;
  const includeShop = payload.role === "ADMIN";

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const source = searchParams.get("source") || "";       // "CJ" | "own" | ""
  const active = searchParams.get("active") || "";       // "true" | "false" | ""
  const categoryId = searchParams.get("categoryId") || "";
  const petType = searchParams.get("petType") || "";     // slug e.g. "dog"
  const tagId = searchParams.get("tagId") || "";
  const validationStatusParam = searchParams.get("validationStatus") || ""; // "" = default Approved, "all" = no filter

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = shopId === "all" ? {} : { shopId };
  const validStatuses = Object.values(ProductValidationStatus);
  if (validationStatusParam === "all") {
    // no filter by validationStatus
  } else {
    const status = validationStatusParam && validStatuses.includes(validationStatusParam as ProductValidationStatus)
      ? (validationStatusParam as ProductValidationStatus)
      : ProductValidationStatus.Approved;
    where.validationStatus = status;
  }

  const nameOnly = searchParams.get("nameOnly") === "true";
  if (search) {
    where.OR = nameOnly
      ? [
          { name: { contains: search, mode: "insensitive" } },
          { name_th: { contains: search, mode: "insensitive" } },
          { id: { contains: search, mode: "insensitive" } },
          { variants: { some: { sku: { contains: search, mode: "insensitive" } } } },
          { variants: { some: { cjVid: { contains: search, mode: "insensitive" } } } },
          { variants: { some: { id: { contains: search, mode: "insensitive" } } } },
        ]
      : [
          { name: { contains: search, mode: "insensitive" } },
          { name_th: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { description_th: { contains: search, mode: "insensitive" } },
        ];
  }
  if (source === "CJ") where.source = "CJ";
  if (source === "own") where.source = null;
  if (source === "exCJ") { where.source = null; where.sourceData = { not: null }; }
  if (active === "true") where.active = true;
  if (active === "false") where.active = false;
  if (categoryId) where.categoryId = categoryId;
  if (petType) where.petType = { slug: petType };
  if (tagId) where.tags = { some: { id: tagId } };

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const PAGE_SIZE = 50;

  const sort = searchParams.get("sort") || "newest";
  const isBestSeller = sort === "best_seller";

  if (isBestSeller) {
    const productIds = await prisma.product.findMany({
      where,
      select: { id: true },
    });
    const ids = productIds.map((p) => p.id);
    if (ids.length === 0) {
      return NextResponse.json({ success: true, data: [], total: 0, page, pageSize: PAGE_SIZE });
    }
    const shopWhere = shopId === "all" ? {} : { order: { shopId } };
    const soldByProduct = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { in: ids }, ...shopWhere },
      _sum: { quantity: true },
    });
    const soldMap = new Map(soldByProduct.map((r) => [r.productId, r._sum.quantity ?? 0]));
    const sortedIds = [...ids].sort((a, b) => (soldMap.get(b) ?? 0) - (soldMap.get(a) ?? 0));
    const pageIds = sortedIds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const products = await prisma.product.findMany({
      where: { id: { in: pageIds } },
      include: { category: true, petType: true, tags: true, shop: includeShop, variants: { select: { id: true, sku: true, cjVid: true, size: true, color: true, price: true, stock: true, variantImage: true } }, _count: { select: { marketingPacks: true } } },
    });
    const productsOrdered = pageIds.map((id) => products.find((p) => p.id === id)!).filter(Boolean);
    const soldCounts = pageIds.map((id) => soldMap.get(id) ?? 0);
    return NextResponse.json({
      success: true,
      data: productsOrdered.map((p, i) => ({ ...p, soldCount: soldCounts[i] })),
      total: ids.length,
      page,
      pageSize: PAGE_SIZE,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any =
    sort === "oldest"    ? { createdAt: "asc" } :
    sort === "price_asc" ? { price: "asc" } :
    sort === "price_desc"? { price: "desc" } :
    sort === "stock_asc" ? { stock: "asc" } :
    sort === "stock_desc"? { stock: "desc" } :
    sort === "name_asc"  ? { name: "asc" } :
    sort === "name_desc" ? { name: "desc" } :
                           { createdAt: "desc" };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, petType: true, tags: true, shop: includeShop, variants: { select: { id: true, sku: true, cjVid: true, size: true, color: true, price: true, stock: true, variantImage: true } }, _count: { select: { marketingPacks: true } } },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: products, total, page, pageSize: PAGE_SIZE });
}

export async function POST(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const body = await request.json();
  const {
    name,
    name_th,
    description,
    description_th,
    shortDescription,
    shortDescription_th,
    price,
    stock,
    images,
    categoryId,
    petTypeId,
    featured,
    validationStatus,
    variants = [],
  } = body;

  const validStatuses = Object.values(ProductValidationStatus);
  const status: ProductValidationStatus =
    validationStatus && validStatuses.includes(validationStatus as ProductValidationStatus)
      ? (validationStatus as ProductValidationStatus)
      : ProductValidationStatus.Approved;

  if (!name || !description || price == null || stock == null || !categoryId) {
    return NextResponse.json(
      { success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
      { status: 400 }
    );
  }

  type VariantInput = { size?: string; color?: string; price: string; stock: string; sku?: string; variantImage?: string };
  const imageArr = Array.isArray(images) ? images : [];
  const product = await prisma.product.create({
    data: {
      shopId,
      name,
      name_th: name_th || null,
      description,
      description_th: description_th || null,
      shortDescription: shortDescription || null,
      shortDescription_th: shortDescription_th || null,
      price: parseFloat(price),
      stock: parseInt(stock),
      images: imageArr,
      categoryId,
      petTypeId: petTypeId || null,
      featured: !!featured,
      validationStatus: status,
      ...(variants.length > 0 && {
        variants: {
          create: variants.map((v: VariantInput) => ({
            size: v.size || null,
            color: v.color || null,
            price: parseFloat(v.price) || 0,
            stock: parseInt(v.stock) || 0,
            sku: v.sku || null,
            variantImage: v.variantImage || null,
          })),
        },
      }),
    },
    include: { category: true, petType: true, variants: true },
  });

  const variantImages = (variants as { variantImage?: string }[]).map((v) => v.variantImage).filter(Boolean) as string[];
  const allImageUrls = [...imageArr, ...variantImages];
  if (allImageUrls.length > 0) {
    await syncProductImagesToMarketingAssets(product.id, shopId, allImageUrls);
  }

  return NextResponse.json({ success: true, data: product }, { status: 201 });
}
