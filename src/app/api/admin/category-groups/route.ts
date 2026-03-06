import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const groups = await prisma.categoryGroup.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { categories: true } } },
  });
  return NextResponse.json({ success: true, data: groups });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { name, name_th, slug, icon } = await request.json();
  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ success: false, error: "name and slug required" }, { status: 400 });
  }

  const maxOrder = await prisma.categoryGroup.aggregate({ _max: { order: true } });
  const group = await prisma.categoryGroup.create({
    data: {
      name: name.trim(),
      name_th: name_th?.trim() || null,
      slug: slug.trim().toLowerCase(),
      icon: icon?.trim() || null,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json({ success: true, data: group });
}
