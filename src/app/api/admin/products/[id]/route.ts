import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { FulfillmentMethod } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, petType: true, variants: { orderBy: { createdAt: "asc" } }, tags: true },
  });

  if (!product) {
    return NextResponse.json(
      { success: false, error: "ไม่พบสินค้า" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: product });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

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
    categoryId,
    petTypeId,
    active,
    featured,
    deliveryDays,
    warehouseCountry,
    fulfillmentMethod,
    variants,
    tagIds,
  } = body;

  type VariantInput = {
    id?: string; size?: string; color?: string; price: string; stock: string;
    sku?: string; cjVid?: string; variantImage?: string;
    attributes?: { name: string; value: string }[] | null;
    active?: boolean;
    fulfillmentMethod?: string | null;
  };

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
      ...(categoryId !== undefined && { categoryId }),
      ...(petTypeId !== undefined && { petTypeId: petTypeId || null }),
      ...(active !== undefined && { active: !!active }),
      ...(featured !== undefined && { featured: !!featured }),
      ...(deliveryDays !== undefined && { deliveryDays: parseInt(deliveryDays) }),
      ...(warehouseCountry !== undefined && { warehouseCountry: warehouseCountry || null }),
      ...(fulfillmentMethod !== undefined && { fulfillmentMethod: fulfillmentMethod as FulfillmentMethod }),
      ...(tagIds !== undefined && { tags: { set: (tagIds as string[]).map((tid) => ({ id: tid })) } }),
    },
    include: { category: true, petType: true, variants: { orderBy: { createdAt: "asc" } }, tags: true },
  });

  return NextResponse.json({ success: true, data: product });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  await prisma.cartItem.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "ลบสินค้าเรียบร้อย" });
}
