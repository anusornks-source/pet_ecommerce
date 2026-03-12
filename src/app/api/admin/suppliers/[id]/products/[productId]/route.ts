import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

/** PATCH - Update product-supplier link (e.g. supplierPrice) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id: supplierId, productId } = await params;
  const body = await request.json();
  const { supplierPrice, supplierSku, supplierUrl, note } = body;

  const link = await prisma.productSupplier.findFirst({
    where: { supplierId, productId },
    include: { product: { select: { id: true, name: true, name_th: true, images: true, price: true, stock: true, shortDescription: true, shortDescription_th: true, cjProductId: true, costPrice: true } } },
  });
  if (!link) {
    return NextResponse.json({ success: false, error: "ไม่พบการเชื่อมโยง" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (supplierPrice !== undefined) {
    const val = supplierPrice == null || supplierPrice === "" ? null : Number(supplierPrice);
    updates.push(`"supplierPrice" = $${i++}`);
    values.push(val);
  }
  if (supplierSku !== undefined) {
    updates.push(`"supplierSku" = $${i++}`);
    values.push(supplierSku?.trim() || null);
  }
  if (supplierUrl !== undefined) {
    updates.push(`"supplierUrl" = $${i++}`);
    values.push(supplierUrl?.trim() || null);
  }
  if (note !== undefined) {
    updates.push(`"note" = $${i++}`);
    values.push(note?.trim() || null);
  }

  if (updates.length > 0) {
    values.push(link.id);
    await prisma.$executeRawUnsafe(
      `UPDATE product_suppliers SET ${updates.join(", ")} WHERE id = $${i}`,
      ...values
    );
  }

  const updated = await prisma.productSupplier.findUnique({
    where: { id: link.id },
    include: { product: { select: { id: true, name: true, name_th: true, images: true, price: true, stock: true, shortDescription: true, shortDescription_th: true, cjProductId: true, costPrice: true } } },
  });
  return NextResponse.json({ success: true, data: updated });
}

/** DELETE - Remove product from supplier */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id: supplierId, productId } = await params;

  const link = await prisma.productSupplier.findFirst({
    where: { supplierId, productId },
  });
  if (!link) {
    return NextResponse.json({ success: false, error: "ไม่พบการเชื่อมโยง" }, { status: 404 });
  }

  await prisma.productSupplier.delete({ where: { id: link.id } });
  return NextResponse.json({ success: true });
}
