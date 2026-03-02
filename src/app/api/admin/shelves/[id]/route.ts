import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { name, slug, description, color, active, order } = body;

  // Check slug uniqueness if being changed
  if (slug) {
    const existing = await prisma.shelf.findFirst({ where: { slug, NOT: { id } } });
    if (existing) {
      return NextResponse.json({ success: false, error: "slug นี้มีอยู่แล้ว" }, { status: 409 });
    }
  }

  const shelf = await prisma.shelf.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description: description || null }),
      ...(color !== undefined && { color }),
      ...(active !== undefined && { active }),
      ...(order !== undefined && { order }),
    },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ success: true, data: shelf });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  await prisma.shelf.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
