import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

// POST /api/payments/stripe — create PaymentIntent for an existing order
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ success: false, error: "Stripe ยังไม่ได้ตั้งค่า กรุณาเพิ่ม STRIPE_SECRET_KEY ใน .env" }, { status: 503 });
  }

  const { orderId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ success: false, error: "ต้องระบุ orderId" }, { status: 400 });
  }

  // Verify order belongs to this user
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.userId },
    include: { payment: true },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: "ไม่พบ order" }, { status: 404 });
  }

  // Amount in satangs (THB smallest unit = satang = 1/100 baht)
  const amountSatangs = Math.round(order.total * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountSatangs,
    currency: "thb",
    metadata: { orderId, userId: session.userId },
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({
    success: true,
    data: { clientSecret: paymentIntent.client_secret },
  });
}
