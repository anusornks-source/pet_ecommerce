import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import { FulfillmentMethod, ProductValidationStatus } from "@/generated/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId, payload } = auth;
  const isAdmin = payload.role === "ADMIN";

  const { id } = await params;
  const [product, soldResult] = await Promise.all([
    prisma.product.findFirst({
      where: isAdmin ? { id } : { id, shopId },
      include: {
        category: true,
        petType: true,
        shop: { select: { id: true, name: true } },
        variants: { orderBy: { createdAt: "asc" } },
        tags: true,
        _count: { select: { marketingAssets: true } },
      },
    }),
    prisma.orderItem.aggregate({
      where: {
        productId: id,
        order: {
          ...(isAdmin ? {} : { shopId }),
          status: { not: "CANCELLED" },
        },
      },
      _sum: { quantity: true },
    }),
  ]);

  if (!product) {
    return NextResponse.json(
      { success: false, error: "ไม่พบสินค้า" },
      { status: 404 }
    );
  }

  const soldCount = soldResult._sum.quantity ?? 0;
  return NextResponse.json({ success: true, data: { ...product, soldCount } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId, payload } = auth;
  const isAdmin = payload.role === "ADMIN";

  const { id } = await params;
  const body = await request.json();
  const {
    name,
    name_th,
    description,
    description_th,
    shortDescription,
    shortDescription_th,
    sourceDescription,
    price,
    normalPrice,
    stock,
    images,
    videos,
    categoryId,
    petTypeId,
    active,
    featured,
    deliveryDays,
    warehouseCountry,
    fulfillmentMethod,
    validationStatus,
    variants,
    tagIds,
    shopId: newShopId,
  } = body;

  type VariantInput = {
    id?: string; size?: string; color?: string; price: string; stock: string;
    sku?: string; cjVid?: string; variantImage?: string;
    attributes?: { name: string; value: string }[] | null;
    active?: boolean;
    fulfillmentMethod?: string | null;
  };

  // Platform ADMIN can access any product; shop members only their shop
  const existing = await prisma.product.findFirst({
    where: isAdmin ? { id } : { id, shopId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }

  if (variants !== undefined) {
    await prisma.productVariant.deleteMany({ where: { productId: id } });
    if (variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants.map((v: VariantInput) => ({
          productId: id,
          size: v.size || null,
          color: v.color || null,
          price: parseFloat(v.price) || 0,
          stock: parseInt(v.stock) || 0,
          sku: v.sku || null,
          cjVid: v.cjVid || null,
          variantImage: v.variantImage || null,
          attributes: v.attributes ?? null,
          active: v.active !== false,
          fulfillmentMethod: (v.fulfillmentMethod as FulfillmentMethod | null) ?? null,
        })),
      });
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(name_th !== undefined && { name_th: name_th || null }),
      ...(description !== undefined && { description }),
      ...(description_th !== undefined && { description_th: description_th || null }),
      ...(shortDescription !== undefined && { shortDescription: shortDescription || null }),
      ...(shortDescription_th !== undefined && { shortDescription_th: shortDescription_th || null }),
      ...(sourceDescription !== undefined && { sourceDescription: sourceDescription || null }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(normalPrice !== undefined && { normalPrice: normalPrice != null ? parseFloat(normalPrice) : null }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(images !== undefined && { images: Array.isArray(images) ? images : [] }),
      ...(videos !== undefined && { videos: Array.isArray(videos) ? videos : [] }),
      ...(categoryId !== undefined && { categoryId }),
      ...(petTypeId !== undefined && { petTypeId: petTypeId || null }),
      ...(active !== undefined && { active: !!active }),
      ...(featured !== undefined && { featured: !!featured }),
      ...(deliveryDays !== undefined && { deliveryDays: parseInt(deliveryDays) }),
      ...(warehouseCountry !== undefined && { warehouseCountry: warehouseCountry || null }),
      ...(fulfillmentMethod !== undefined && { fulfillmentMethod: fulfillmentMethod as FulfillmentMethod }),
      ...(validationStatus !== undefined && Object.values(ProductValidationStatus).includes(validationStatus as ProductValidationStatus) && { validationStatus: validationStatus as ProductValidationStatus }),
      ...(tagIds !== undefined && { tags: { set: (tagIds as string[]).map((tid) => ({ id: tid })) } }),
      ...(isAdmin && newShopId !== undefined && { shopId: newShopId }),
    },
    include: { category: true, petType: true, variants: { orderBy: { createdAt: "asc" } }, tags: true },
  });

  return NextResponse.json({ success: true, data: product });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId, payload } = auth;
  const isAdmin = payload.role === "ADMIN";

  const { id } = await params;

  // Platform ADMIN can delete any product; shop members only their own shop's products
  const existingProduct = await prisma.product.findFirst({
    where: isAdmin ? { id } : { id, shopId },
    include: { _count: { select: { marketingAssets: true } } },
  });
  if (!existingProduct) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }
  if (existingProduct._count.marketingAssets > 0) {
    return NextResponse.json(
      { success: false, error: "ไม่สามารถลบได้ เนื่องจากมี Marketing Asset เชื่อมโยงอยู่ กรุณาลบหรือย้าย Marketing Asset ออกก่อน" },
      { status: 400 }
    );
  }

  await prisma.cartItem.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "ลบสินค้าเรียบร้อย" });
}
