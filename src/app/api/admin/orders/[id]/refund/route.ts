import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

// POST /api/admin/orders/[id]/refund
// Issues a full Stripe refund for the order's payment
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
    return NextResponse.json({ success: false, error: "ออเดอร์นี้ไม่มีข้อมูลการชำระเงิน" }, { status: 400 });
  }

  if (order.payment.method !== "STRIPE") {
    return NextResponse.json({ success: false, error: "คืนเงินอัตโนมัติได้เฉพาะออเดอร์ที่ชำระผ่าน Stripe เท่านั้น" }, { status: 400 });
  }

  if (order.payment.status === "REFUNDED") {
    return NextResponse.json({ success: false, error: "ออเดอร์นี้ถูกคืนเงินไปแล้ว" }, { status: 400 });
  }

  if (!order.payment.ref) {
    return NextResponse.json({ success: false, error: "ไม่พบ Payment Intent ID" }, { status: 400 });
  }

  let refund: Stripe.Refund;
  try {
    refund = await getStripe().refunds.create({ payment_intent: order.payment.ref });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe refund failed";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }

  // Update payment + order status + statusHistory
  const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as Array<{
    status: string; timestamp: string; note?: string;
  }>;
  history.push({
    status: "REFUNDED",
    timestamp: new Date().toISOString(),
    note: `คืนเงิน ฿${(order.payment.amount).toLocaleString()} ผ่าน Stripe (${refund.id})`,
  });

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: order.payment.id },
      data: { status: "REFUNDED" },
    }),
    prisma.order.update({
      where: { id },
      data: { status: "CANCELLED", statusHistory: history },
    }),
  ]);

  return NextResponse.json({ success: true, refundId: refund.id });
}
