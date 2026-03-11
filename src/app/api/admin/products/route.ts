import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import { syncProductImagesToMarketingAssets } from "@/lib/marketingAssets";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = shopId === "all" ? {} : { shopId };

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
    variants = [],
  } = body;

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
