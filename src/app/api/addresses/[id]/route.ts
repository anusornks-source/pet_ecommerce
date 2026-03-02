import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PUT /api/addresses/[id] — update address
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { label, name, phone, address, city, province, zipCode, isDefault } = await req.json();

  const existing = await prisma.address.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return NextResponse.json({ success: false, error: "ไม่พบที่อยู่" }, { status: 404 });

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.userId, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.address.update({
    where: { id },
    data: { label, name, phone, address, city, province, zipCode, isDefault },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/addresses/[id] — delete address
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.address.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return NextResponse.json({ success: false, error: "ไม่พบที่อยู่" }, { status: 404 });

  await prisma.address.delete({ where: { id } });

  // If deleted address was default, assign default to oldest remaining
  if (existing.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return NextResponse.json({ success: true });
}
