import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { logApi } from "@/lib/apiLogger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  }

  if (!order.payment) {
    return NextResponse.json({ success: false, error: "ไม่พบข้อมูลการชำระเงิน" }, { status: 400 });
  }

  if (order.payment.method !== "COD") {
    return NextResponse.json({ success: false, error: "ใช้ได้เฉพาะ COD เท่านั้น" }, { status: 400 });
  }

  if (order.payment.status === "PAID") {
    return NextResponse.json({ success: false, error: "ชำระเงินแล้ว" }, { status: 400 });
  }

  const payment = await prisma.payment.update({
    where: { id: order.payment.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  await logApi({
    type: "API", source: "ADMIN", method: "POST", path: `/api/admin/orders/${id}/mark-paid`,
    statusCode: 200, userId: auth.userId, success: true,
    request: { orderId: id, paymentMethod: order.payment.method, amount: order.payment.amount },
    response: { paymentStatus: "PAID" },
  });

  return NextResponse.json({ success: true, data: payment });
}
