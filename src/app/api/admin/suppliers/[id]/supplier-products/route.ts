import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

/** GET - List supplier products */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id: supplierId } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    return NextResponse.json({ success: false, error: "ไม่พบซัพพลายเออร์" }, { status: 404 });
  }

  const list = await prisma.supplierProduct.findMany({
    where: { supplierId },
    include: { category: true, petType: true, product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: list });
}

/** POST - Create supplier product */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id: supplierId } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    return NextResponse.json({ success: false, error: "ไม่พบซัพพลายเออร์" }, { status: 404 });
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

  if (!name || !description) {
    return NextResponse.json({ success: false, error: "กรุณากรอก name และ description" }, { status: 400 });
  }

  const sp = await prisma.supplierProduct.create({
    data: {
      supplierId,
      name: String(name).trim(),
      name_th: name_th?.trim() || null,
      description: String(description).trim(),
      description_th: description_th?.trim() || null,
      shortDescription: shortDescription?.trim() || null,
      shortDescription_th: shortDescription_th?.trim() || null,
      supplierSku: supplierSku?.trim() || null,
      supplierUrl: supplierUrl?.trim() || null,
      supplierPrice: supplierPrice != null ? parseFloat(supplierPrice) : null,
      images: Array.isArray(images) ? images : [],
      categoryId: categoryId || null,
      petTypeId: petTypeId || null,
      note: note?.trim() || null,
    },
    include: { category: true, petType: true },
  });
  return NextResponse.json({ success: true, data: sp }, { status: 201 });
}
