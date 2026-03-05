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
  const { name, name_th, slug, icon, order } = await request.json();

  const petType = await prisma.petType.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(name_th !== undefined && { name_th: name_th || null }),
      ...(slug !== undefined && { slug }),
      ...(icon !== undefined && { icon: icon || null }),
      ...(order !== undefined && { order }),
    },
  });
  return NextResponse.json({ success: true, data: petType });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  // Unlink products first
  await prisma.product.updateMany({ where: { petTypeId: id }, data: { petTypeId: null } });
  await prisma.petType.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
