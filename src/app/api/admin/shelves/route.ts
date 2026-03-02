import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const shelves = await prisma.shelf.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ success: true, data: shelves });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { name, slug, description, color, active } = await request.json();

  if (!name || !slug) {
    return NextResponse.json({ success: false, error: "name และ slug จำเป็น" }, { status: 400 });
  }

  const existing = await prisma.shelf.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ success: false, error: "slug นี้มีอยู่แล้ว" }, { status: 409 });
  }

  const maxOrder = await prisma.shelf.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const shelf = await prisma.shelf.create({
    data: { name, slug, description: description || null, color: color || "#0ea5e9", active: active ?? true, order: nextOrder },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ success: true, data: shelf }, { status: 201 });
}
