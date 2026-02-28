import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PUT /api/addresses/[id] — update address
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { label, name, phone, address, isDefault } = await req.json();

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).address.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return NextResponse.json({ success: false, error: "ไม่พบที่อยู่" }, { status: 404 });

  if (isDefault) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).address.updateMany({
      where: { userId: session.userId, id: { not: id } },
      data: { isDefault: false },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (prisma as any).address.update({
    where: { id },
    data: { label, name, phone, address, isDefault },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/addresses/[id] — delete address
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).address.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return NextResponse.json({ success: false, error: "ไม่พบที่อยู่" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).address.delete({ where: { id } });

  // If deleted address was default, assign default to oldest remaining
  if (existing.isDefault) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = await (prisma as any).address.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return NextResponse.json({ success: true });
}
