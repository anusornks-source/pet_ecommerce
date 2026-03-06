import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const { name, name_th, slug, icon } = await request.json();

  const group = await prisma.categoryGroup.update({
    where: { id },
    data: { name, name_th: name_th || null, slug, icon: icon || null },
  });
  return NextResponse.json({ success: true, data: group });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  // Ungroup categories before deleting
  await prisma.category.updateMany({ where: { groupId: id }, data: { groupId: null } });
  await prisma.categoryGroup.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
