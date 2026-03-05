import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { name, name_th, slug, icon } = body;

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(name_th !== undefined && { name_th: name_th || null }),
      ...(slug !== undefined && { slug }),
      ...(icon !== undefined && { icon: icon || null }),
    },
  });

  return NextResponse.json({ success: true, data: category });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productCount > 0) {
    return NextResponse.json(
      { success: false, error: `ไม่สามารถลบได้ มีสินค้า ${productCount} รายการในหมวดหมู่นี้` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "ลบหมวดหมู่เรียบร้อย" });
}
