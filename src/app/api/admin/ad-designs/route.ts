import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

  const list = await prisma.adDesign.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      productId: true,
      name: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      product: {
        select: { id: true, name: true, name_th: true },
      },
    },
  });

  let filtered = list;
  if (search) {
    const q = search.toLowerCase();
    filtered = list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.note && d.note.toLowerCase().includes(q)) ||
        (d.product.name && d.product.name.toLowerCase().includes(q)) ||
        (d.product.name_th && d.product.name_th.toLowerCase().includes(q))
    );
  }

  const data = filtered.map((d) => ({
    id: d.id,
    productId: d.productId,
    name: d.name,
    note: d.note,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    productName: d.product.name,
    productNameTh: d.product.name_th,
  }));

  return NextResponse.json({ success: true, data });
}
