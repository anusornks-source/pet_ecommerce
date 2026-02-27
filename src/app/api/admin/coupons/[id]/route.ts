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
  const { code, type, value, minOrder, maxUses, active, expiresAt } = await request.json();

  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      code: code?.toUpperCase().trim(),
      type,
      value: value !== undefined ? parseFloat(value) : undefined,
      minOrder: minOrder !== undefined ? (minOrder ? parseFloat(minOrder) : null) : undefined,
      maxUses: maxUses !== undefined ? (maxUses ? parseInt(maxUses) : null) : undefined,
      active,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
    },
  });

  return NextResponse.json({ success: true, data: coupon });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
