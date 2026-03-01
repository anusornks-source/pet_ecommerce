import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { getCJInventory } from "@/lib/cjDropshipping";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  const variants = await prisma.productVariant.findMany({
    where: { productId: id, cjVid: { not: null } },
    select: { id: true, cjVid: true },
  });

  if (variants.length === 0) {
    return NextResponse.json({ success: false, error: "ไม่มี variant ที่มี CJ VID" }, { status: 400 });
  }

  const vids = variants.map((v) => v.cjVid!);
  const inventoryMap = await getCJInventory(vids);

  let updated = 0;
  for (const variant of variants) {
    const stock = inventoryMap[variant.cjVid!];
    if (stock !== undefined) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock },
      });
      updated++;
    }
  }

  // Update product total stock
  const allVariants = await prisma.productVariant.findMany({
    where: { productId: id },
    select: { stock: true },
  });
  const totalStock = allVariants.reduce((s, v) => s + v.stock, 0);
  await prisma.product.update({ where: { id }, data: { stock: totalStock } });

  return NextResponse.json({
    success: true,
    data: { updated, total: variants.length, inventoryMap },
  });
}
