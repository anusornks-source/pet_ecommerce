import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

// GET — list all products with highlight status
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (isNextResponse(guard)) return guard;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const products = await prisma.product.findMany({
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    include: { category: true },
    orderBy: [
      { highlight: "desc" },
      { highlightOrder: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ success: true, data: products });
}

// POST — toggle highlight or reorder
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (isNextResponse(guard)) return guard;

  const body = await req.json();
  const { action, productId, ids } = body;

  if (action === "toggle") {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const nowHighlight = !product.highlight;

    // When adding to shelf, assign next order
    let highlightOrder: number | null = null;
    if (nowHighlight) {
      const maxOrder = await prisma.product.aggregate({
        where: { highlight: true },
        _max: { highlightOrder: true },
      });
      highlightOrder = (maxOrder._max.highlightOrder ?? 0) + 1;
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { highlight: nowHighlight, highlightOrder: nowHighlight ? highlightOrder : null },
    });

    return NextResponse.json({ success: true, data: updated });
  }

  if (action === "reorder" && Array.isArray(ids)) {
    // ids is an ordered array of productIds
    await Promise.all(
      ids.map((id: string, index: number) =>
        prisma.product.update({
          where: { id },
          data: { highlightOrder: index + 1 },
        })
      )
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
}
