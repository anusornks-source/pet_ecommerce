import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } }, group: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ success: true, data: categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { name, name_th, slug, icon, groupId } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { success: false, error: "กรุณากรอกชื่อและ slug" },
      { status: 400 }
    );
  }

  const existing = await prisma.category.findFirst({
    where: { OR: [{ name }, { slug }] },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: "ชื่อหรือ slug นี้มีอยู่แล้ว" },
      { status: 409 }
    );
  }

  const maxOrder = await prisma.category.aggregate({ _max: { order: true } });
  const category = await prisma.category.create({
    data: {
      name,
      name_th: name_th || null,
      slug,
      icon: icon || null,
      groupId: groupId || null,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  return NextResponse.json({ success: true, data: category }, { status: 201 });
}

/** PATCH /api/admin/categories — bulk reorder: [{ id, order, groupId? }] */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const items: { id: string; order: number; groupId?: string | null }[] = await request.json();

  await Promise.all(
    items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { order: item.order, groupId: item.groupId ?? null },
      })
    )
  );

  return NextResponse.json({ success: true });
}
