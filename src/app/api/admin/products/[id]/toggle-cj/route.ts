import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const { action } = await request.json() as { action: "unlink" | "relink" };

  if (action === "unlink") {
    await prisma.$transaction([
      prisma.productVariant.updateMany({
        where: { productId: id },
        data: { cjVid: null, cjStock: null },
      }),
      prisma.product.update({
        where: { id },
        data: { cjProductId: null, source: null },
      }),
    ]);
    return NextResponse.json({ success: true, action: "unlink" });
  }

  if (action === "relink") {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!product?.sourceData) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูล CJ ต้นฉบับ (sourceData)" },
        { status: 400 }
      );
    }

    const sd = product.sourceData as {
      pid: string;
      variants?: { vid: string; variantSku: string }[];
    };

    // Restore cjVid per variant by matching sku
    for (const variant of product.variants) {
      const cjVariant = sd.variants?.find((v) => v.variantSku === variant.sku);
      if (cjVariant?.vid) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { cjVid: cjVariant.vid },
        });
      }
    }

    await prisma.product.update({
      where: { id },
      data: { cjProductId: sd.pid, source: "CJ" },
    });

    return NextResponse.json({ success: true, action: "relink" });
  }

  return NextResponse.json({ success: false, error: "action ไม่ถูกต้อง" }, { status: 400 });
}
