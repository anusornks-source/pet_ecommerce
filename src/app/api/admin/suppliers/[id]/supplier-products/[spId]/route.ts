import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

/** PATCH - Update supplier product */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; spId: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id: supplierId, spId } = await params;
  const sp = await prisma.supplierProduct.findFirst({
    where: { id: spId, supplierId },
  });
  if (!sp) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }

  const body = await request.json();
  const {
    name,
    name_th,
    description,
    description_th,
    shortDescription,
    shortDescription_th,
    supplierSku,
    supplierUrl,
    supplierPrice,
    images,
    categoryId,
    petTypeId,
    note,
  } = body;

  const updated = await prisma.supplierProduct.update({
    where: { id: spId },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(name_th !== undefined && { name_th: name_th?.trim() || null }),
      ...(description !== undefined && { description: String(description).trim() }),
      ...(description_th !== undefined && { description_th: description_th?.trim() || null }),
      ...(shortDescription !== undefined && { shortDescription: shortDescription?.trim() || null }),
      ...(shortDescription_th !== undefined && { shortDescription_th: shortDescription_th?.trim() || null }),
      ...(supplierSku !== undefined && { supplierSku: supplierSku?.trim() || null }),
      ...(supplierUrl !== undefined && { supplierUrl: supplierUrl?.trim() || null }),
      ...(supplierPrice !== undefined && { supplierPrice: supplierPrice != null ? parseFloat(supplierPrice) : null }),
      ...(images !== undefined && { images: Array.isArray(images) ? images : [] }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(petTypeId !== undefined && { petTypeId: petTypeId || null }),
      ...(note !== undefined && { note: note?.trim() || null }),
    },
    include: { category: true, petType: true, product: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ success: true, data: updated });
}

/** DELETE - Remove supplier product */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; spId: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id: supplierId, spId } = await params;
  const sp = await prisma.supplierProduct.findFirst({
    where: { id: spId, supplierId },
  });
  if (!sp) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }

  await prisma.supplierProduct.delete({ where: { id: spId } });
  return NextResponse.json({ success: true });
}
