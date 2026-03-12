import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

/** POST - Add product to supplier */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id: supplierId } = await params;
  const body = await request.json();
  const { productId, supplierSku, supplierUrl, note } = body;

  if (!productId) {
    return NextResponse.json({ success: false, error: "กรุณาระบุ productId" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    return NextResponse.json({ success: false, error: "ไม่พบซัพพลายเออร์" }, { status: 404 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }

  try {
    const link = await prisma.productSupplier.create({
      data: {
        productId,
        supplierId,
        supplierSku: supplierSku?.trim() || null,
        supplierUrl: supplierUrl?.trim() || null,
        note: note?.trim() || null,
      },
      include: {
        product: {
          select: { id: true, name: true, name_th: true, images: true, price: true, stock: true },
        },
      },
    });
    return NextResponse.json({ success: true, data: link });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint") || msg.includes("unique")) {
      return NextResponse.json({ success: false, error: "สินค้านี้มีในซัพพลายเออร์นี้แล้ว" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
