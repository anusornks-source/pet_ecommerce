import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

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
