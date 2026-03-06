import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { id } = await params;
  const { code, type, value, minOrder, maxUses, active, expiresAt } = await request.json();

  // Verify coupon belongs to this shop
  const existingCoupon = await prisma.coupon.findFirst({ where: { id, shopId } });
  if (!existingCoupon) {
    return NextResponse.json({ success: false, error: "ไม่พบคูปอง" }, { status: 404 });
  }

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
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { id } = await params;
  // Verify coupon belongs to this shop
  const existingCouponDel = await prisma.coupon.findFirst({ where: { id, shopId } });
  if (!existingCouponDel) {
    return NextResponse.json({ success: false, error: "ไม่พบคูปอง" }, { status: 404 });
  }

  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
