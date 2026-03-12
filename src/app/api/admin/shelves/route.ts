import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function GET(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const shelves = await prisma.shelf.findMany({
    where: shopId === "all" ? {} : { shopId },
    orderBy: { order: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ success: true, data: shelves });
}

export async function POST(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { name, name_th, slug, description, description_th, color, active, sourceType, limit } = await request.json();

  if (!name || !slug) {
    return NextResponse.json({ success: false, error: "name (EN) และ slug จำเป็น" }, { status: 400 });
  }

  const validSource = ["manual", "best_seller", "featured"].includes(sourceType) ? sourceType : "manual";
  const shelfLimit = typeof limit === "number" ? Math.min(20, Math.max(1, limit)) : 8;

  const existing = await prisma.shelf.findFirst({ where: { slug, shopId } });
  if (existing) {
    return NextResponse.json({ success: false, error: "slug นี้มีอยู่แล้ว" }, { status: 409 });
  }

  const maxOrder = await prisma.shelf.aggregate({ where: { shopId }, _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const shelf = await prisma.shelf.create({
    data: { shopId, name, name_th: name_th || null, slug, description: description || null, description_th: description_th || null, color: color || "#0ea5e9", active: active ?? true, order: nextOrder, sourceType: validSource, limit: shelfLimit },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ success: true, data: shelf }, { status: 201 });
}
