import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, variants: { orderBy: { createdAt: "asc" } } },
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
    description,
    price,
    stock,
    images,
    categoryId,
    petType,
    active,
    featured,
    variants,
  } = body;

  type VariantInput = {
    id?: string; size?: string; color?: string; price: string; stock: string;
    sku?: string; cjVid?: string; variantImage?: string;
    attributes?: { name: string; value: string }[] | null;
    active?: boolean;
  };

  // Handle variants: replace all existing variants with the new set
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
        })),
      });
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(images !== undefined && {
        images: Array.isArray(images) ? images : [],
      }),
      ...(categoryId !== undefined && { categoryId }),
      ...(petType !== undefined && { petType: petType || null }),
      ...(active !== undefined && { active: !!active }),
      ...(featured !== undefined && { featured: !!featured }),
    },
    include: { category: true, variants: { orderBy: { createdAt: "asc" } } },
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
