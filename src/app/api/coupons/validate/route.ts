import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { code, subtotal, shopId } = await request.json();

  if (!code) {
    return NextResponse.json({ success: false, error: "กรุณากรอกโค้ด" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (coupon && shopId && coupon.shopId !== shopId) {
    return NextResponse.json({ success: false, error: "โค้ดนี้ไม่ใช่ของร้านนี้" }, { status: 400 });
  }

  if (!coupon || !coupon.active) {
    return NextResponse.json({ success: false, error: "โค้ดไม่ถูกต้องหรือหมดอายุ" }, { status: 400 });
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: "โค้ดหมดอายุแล้ว" }, { status: 400 });
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ success: false, error: "โค้ดถูกใช้ครบจำนวนแล้ว" }, { status: 400 });
  }

  if (coupon.minOrder !== null && subtotal < coupon.minOrder) {
    return NextResponse.json(
      { success: false, error: `ต้องสั่งซื้อขั้นต่ำ ฿${coupon.minOrder.toLocaleString()}` },
      { status: 400 }
    );
  }

  let discount = 0;
  if (coupon.type === "PERCENT") {
    discount = Math.round((subtotal * coupon.value) / 100);
  } else {
    discount = Math.min(coupon.value, subtotal);
  }

  return NextResponse.json({
    success: true,
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
    },
  });
}
