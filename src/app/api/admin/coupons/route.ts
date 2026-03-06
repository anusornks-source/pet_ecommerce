import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function GET(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const coupons = await prisma.coupon.findMany({ where: { shopId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, data: coupons });
}

export async function POST(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { code, type, value, minOrder, maxUses, active, expiresAt } = await request.json();

  if (!code || !type || value === undefined) {
    return NextResponse.json({ success: false, error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      shopId,
      code: code.toUpperCase().trim(),
      type,
      value: parseFloat(value),
      minOrder: minOrder ? parseFloat(minOrder) : null,
      maxUses: maxUses ? parseInt(maxUses) : null,
      active: active !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ success: true, data: coupon }, { status: 201 });
}
