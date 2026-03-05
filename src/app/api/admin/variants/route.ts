import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const fulfillmentMethod = searchParams.get("fulfillmentMethod") || ""; // SELF | CJ | SUPPLIER | INHERIT | ""
  const active = searchParams.get("active") || "";       // "true" | "false" | ""
  const outOfStock = searchParams.get("outOfStock") === "true";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { cjVid: { contains: search, mode: "insensitive" } },
      { product: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (fulfillmentMethod === "INHERIT") {
    where.fulfillmentMethod = null;
  } else if (fulfillmentMethod) {
    where.fulfillmentMethod = fulfillmentMethod;
  }
  if (active === "true") where.active = true;
  if (active === "false") where.active = false;
  if (outOfStock) where.stock = { lte: 0 };

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const PAGE_SIZE = 50;

  const [variants, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            fulfillmentMethod: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.productVariant.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: variants, total, page, pageSize: PAGE_SIZE });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id, active } = await request.json();
  if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

  const variant = await prisma.productVariant.update({
    where: { id },
    data: { active },
  });

  return NextResponse.json({ success: true, data: variant });
}
