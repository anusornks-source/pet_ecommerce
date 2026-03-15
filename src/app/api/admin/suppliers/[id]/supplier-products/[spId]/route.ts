import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { isBlobUrlInUse } from "@/lib/blobUsage";
import { ProductValidationStatus } from "@/generated/prisma/client";

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
    sourceDescription,
    supplierSku,
    supplierUrl,
    supplierPrice,
    images,
    categoryId,
    remark,
    validationStatus,
    note,
    supplierId: newSupplierId,
  } = body;

  const validStatuses = ["Lead", "Qualified", "Approved", "Rejected"] as const;
  const updateData: Record<string, unknown> = {
    ...(name !== undefined && { name: String(name).trim() }),
    ...(name_th !== undefined && { name_th: name_th?.trim() || null }),
    ...(description !== undefined && { description: String(description).trim() }),
    ...(description_th !== undefined && { description_th: description_th?.trim() || null }),
    ...(shortDescription !== undefined && { shortDescription: shortDescription?.trim() || null }),
    ...(shortDescription_th !== undefined && { shortDescription_th: shortDescription_th?.trim() || null }),
    ...(sourceDescription !== undefined && { sourceDescription: sourceDescription?.trim() || null }),
    ...(supplierSku !== undefined && { supplierSku: supplierSku?.trim() || null }),
    ...(supplierUrl !== undefined && { supplierUrl: supplierUrl?.trim() || null }),
    ...(supplierPrice !== undefined && { supplierPrice: supplierPrice != null ? parseFloat(supplierPrice) : null }),
    ...(images !== undefined && { images: Array.isArray(images) ? images : [] }),
    ...(categoryId !== undefined && { categoryId: categoryId || null }),
    ...(remark !== undefined && { remark: remark?.trim() || null }),
    ...(validationStatus !== undefined && validStatuses.includes(validationStatus) && { validationStatus: validationStatus as ProductValidationStatus }),
    ...(note !== undefined && { note: note?.trim() || null }),
  };
  if (newSupplierId && typeof newSupplierId === "string") {
    const exists = await prisma.supplier.findUnique({ where: { id: newSupplierId } });
    if (exists) updateData.supplierId = newSupplierId;
  }

  const updated = await prisma.supplierProduct.update({
    where: { id: spId },
    data: updateData,
    include: { category: true, product: { select: { id: true, name: true } } },
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

  if (sp.productId) {
    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถลบได้ เนื่องจากมีสินค้า (Product) เชื่อมโยงอยู่ กรุณาตัดการเชื่อมโยงที่หน้ารายละเอียดสินค้าก่อน",
      },
      { status: 400 }
    );
  }

  // ลบรูปออกจาก Blob ถ้าไม่มีที่อื่นใช้งานแล้ว (Product/ProductVariant/MarketingAsset/SupplierProduct)
  try {
    const urls = Array.isArray(sp.images) ? sp.images : [];
    const isBlobUrl = (u: string) => u.includes("blob.vercel-storage.com");
    const trim = (u: string) => u?.trim() ?? "";

    for (const rawUrl of urls) {
      const url = trim(rawUrl);
      if (!url || !isBlobUrl(url)) continue;

      const inUse = await isBlobUrlInUse(url, { supplierProductId: spId });
      if (!inUse) {
        try {
          await del(url);
        } catch (err) {
          console.error("[supplier-products] blob del error:", err);
        }
      }
    }
  } catch (err) {
    console.error("[supplier-products] blob cleanup error:", err);
  }

  await prisma.supplierProduct.delete({ where: { id: spId } });
  return NextResponse.json({ success: true });
}
