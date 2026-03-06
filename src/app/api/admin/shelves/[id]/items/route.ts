import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const search = request.nextUrl.searchParams.get("search") ?? "";

  const shelf = await prisma.shelf.findUnique({
    where: { id },
    include: { shop: { select: { id: true, name: true } } },
  });
  if (!shelf) {
    return NextResponse.json({ success: false, error: "ไม่พบ shelf" }, { status: 404 });
  }

  const items = await prisma.shelfItem.findMany({
    where: { shelfId: id },
    orderBy: { order: "asc" },
    include: {
      product: { include: { category: true } },
    },
  });

  const inShelfProductIds = items.map((i) => i.productId);

  const available = await prisma.product.findMany({
    where: {
      active: true,
      shopId: shelf.shopId,
      id: { notIn: inShelfProductIds },
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { category: true },
    orderBy: { name: "asc" },
    take: 40,
  });

  return NextResponse.json({ success: true, data: { shelf, items, available } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const { action, productId, ids } = await request.json();

  if (action === "add") {
    const maxOrder = await prisma.shelfItem.aggregate({
      where: { shelfId: id },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const item = await prisma.shelfItem.create({
      data: { shelfId: id, productId, order: nextOrder },
      include: { product: { include: { category: true } } },
    });
    return NextResponse.json({ success: true, data: item });
  }

  if (action === "remove") {
    await prisma.shelfItem.deleteMany({ where: { shelfId: id, productId } });
    return NextResponse.json({ success: true });
  }

  if (action === "reorder" && Array.isArray(ids)) {
    await Promise.all(
      ids.map((itemId: string, index: number) =>
        prisma.shelfItem.update({ where: { id: itemId }, data: { order: index } })
      )
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "action ไม่ถูกต้อง" }, { status: 400 });
}
