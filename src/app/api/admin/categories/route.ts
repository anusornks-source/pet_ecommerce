import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ success: true, data: categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { name, name_th, slug, icon } = body;

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

  const category = await prisma.category.create({
    data: { name, name_th: name_th || null, slug, icon: icon || null },
  });

  return NextResponse.json({ success: true, data: category }, { status: 201 });
}
