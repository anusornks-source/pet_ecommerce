import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

/** GET ?productId=xxx - List suppliers for a product */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  if (!productId) {
    return NextResponse.json({ success: false, error: "productId required" }, { status: 400 });
  }

  const links = await prisma.productSupplier.findMany({
    where: { productId },
    include: {
      supplier: true,
    },
  });
  return NextResponse.json({ success: true, data: links });
}
