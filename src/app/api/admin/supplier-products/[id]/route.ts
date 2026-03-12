import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

/** GET - Fetch single supplier product by ID */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const sp = await prisma.supplierProduct.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true, nameTh: true, imageUrl: true, tel: true, email: true, contact: true, website: true } },
      category: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, name_th: true, images: true, price: true } },
    },
  });

  if (!sp) {
    return NextResponse.json({ success: false, error: "ไม่พบ Supplier Product" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: sp });
}
