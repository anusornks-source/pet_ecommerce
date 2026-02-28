import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// PATCH /api/addresses/[id]/default — set as default address
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).address.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return NextResponse.json({ success: false, error: "ไม่พบที่อยู่" }, { status: 404 });

  // Unset all, then set this one
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).address.updateMany({
    where: { userId: session.userId },
    data: { isDefault: false },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (prisma as any).address.update({
    where: { id },
    data: { isDefault: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
