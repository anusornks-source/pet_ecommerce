import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { getCJTrackingInfo } from "@/lib/cjDropshipping";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) {
    return NextResponse.json({ success: false, error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  }

  if (!order.cjOrderId) {
    return NextResponse.json({ success: false, error: "ออเดอร์นี้ไม่มี CJ Order ID" }, { status: 400 });
  }

  const tracking = await getCJTrackingInfo(order.cjOrderId, id);

  if (!tracking.cjStatus && !tracking.trackingNumber) {
    return NextResponse.json({ success: false, error: "ไม่สามารถดึงข้อมูลจาก CJ ได้" }, { status: 502 });
  }

  // Update tracking fields in DB
  const updated = await prisma.order.update({
    where: { id },
    data: {
      ...(tracking.cjStatus && { cjStatus: tracking.cjStatus }),
      ...(tracking.trackingNumber && { trackingNumber: tracking.trackingNumber }),
      ...(tracking.trackingCarrier && { trackingCarrier: tracking.trackingCarrier }),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      cjStatus: updated.cjStatus,
      trackingNumber: updated.trackingNumber,
      trackingCarrier: updated.trackingCarrier,
    },
  });
}
