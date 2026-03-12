import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
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
  const { productId, supplierSku, supplierUrl, supplierPrice, note } = body;

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
    const supplierPriceVal = supplierPrice != null && supplierPrice !== "" ? Number(supplierPrice) : null;
    const linkId = `c${randomUUID().replace(/-/g, "").slice(0, 24)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO product_suppliers (id, "productId", "supplierId", "supplierSku", "supplierUrl", "supplierPrice", note, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      linkId,
      productId,
      supplierId,
      supplierSku?.trim() || null,
      supplierUrl?.trim() || null,
      supplierPriceVal,
      note?.trim() || null
    );
    const link = await prisma.productSupplier.findUnique({
      where: { id: linkId },
      include: {
        product: {
          select: { id: true, name: true, name_th: true, images: true, price: true, stock: true, shortDescription: true, shortDescription_th: true, cjProductId: true, costPrice: true },
        },
      },
    });
    if (!link) {
      return NextResponse.json({ success: false, error: "สร้างแล้วแต่ดึงข้อมูลไม่สำเร็จ" }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: link });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint") || msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ success: false, error: "สินค้านี้มีในซัพพลายเออร์นี้แล้ว" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
