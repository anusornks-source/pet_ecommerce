import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { syncProductImagesToMarketingAssets } from "@/lib/marketingAssets";

/** POST - Import supplier product to Product */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; spId: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id: supplierId, spId } = await params;
  const sp = await prisma.supplierProduct.findFirst({
    where: { id: spId, supplierId },
    include: { category: true, petType: true, supplier: { select: { name: true } } },
  });
  if (!sp) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }
  if (sp.productId) {
    return NextResponse.json({ success: false, error: "สินค้านี้ import แล้ว" }, { status: 400 });
  }

  const body = await request.json();
  const { shopId, categoryId, petTypeId, price, stock } = body;

  if (!shopId || !categoryId) {
    return NextResponse.json({ success: false, error: "กรุณาเลือก shop และ category" }, { status: 400 });
  }

  const sellPrice = price != null ? parseFloat(price) : (sp.supplierPrice ?? 0) * 1.5;
  const sellStock = stock != null ? parseInt(stock) : 0;

  const product = await prisma.product.create({
    data: {
      shopId,
      name: sp.name,
      name_th: sp.name_th,
      description: sp.description,
      description_th: sp.description_th,
      shortDescription: sp.shortDescription,
      shortDescription_th: sp.shortDescription_th,
      price: sellPrice,
      stock: sellStock,
      images: sp.images,
      categoryId,
      petTypeId: petTypeId || sp.petTypeId,
      costPrice: sp.supplierPrice,
      source: "SUPPLIER",
      sourceDescription: `จาก Supplier: ${sp.supplier?.name ?? supplierId}`,
      sourceData: { supplierProductId: sp.id, supplierId },
    },
    include: { category: true, petType: true, variants: true },
  });

  await prisma.productSupplier.upsert({
    where: {
      productId_supplierId: { productId: product.id, supplierId },
    },
    create: {
      productId: product.id,
      supplierId,
      supplierSku: sp.supplierSku,
      supplierUrl: sp.supplierUrl,
      supplierPrice: sp.supplierPrice,
      note: sp.note,
    },
    update: {
      supplierSku: sp.supplierSku,
      supplierUrl: sp.supplierUrl,
      supplierPrice: sp.supplierPrice,
      note: sp.note,
    },
  });

  await prisma.supplierProduct.update({
    where: { id: spId },
    data: { productId: product.id },
  });

  if (sp.images.length > 0) {
    await syncProductImagesToMarketingAssets(product.id, shopId, sp.images);
  }

  return NextResponse.json({ success: true, data: product }, { status: 201 });
}
