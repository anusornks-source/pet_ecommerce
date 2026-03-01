import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" });

// POST /api/checkout/stripe
// Creates a Stripe Checkout Session for an existing PENDING order
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await request.json();
  if (!orderId) {
    return NextResponse.json({ success: false, error: "orderId required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId, userId: session.userId },
    include: { items: { include: { product: true, variant: true } } },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  }

  if (order.status !== "PENDING") {
    return NextResponse.json({ success: false, error: "ออเดอร์นี้ไม่อยู่ในสถานะ PENDING" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: order.items.map((item) => ({
      price_data: {
        currency: "thb",
        product_data: {
          name: item.variant
            ? `${item.product.name} (${item.variant.name ?? ""})`
            : item.product.name,
        },
        unit_amount: Math.round((item.variant?.price ?? item.product.price) * 100),
      },
      quantity: item.quantity,
    })),
    metadata: { orderId: order.id },
    success_url: `${baseUrl}/orders/${order.id}?payment=success`,
    cancel_url: `${baseUrl}/orders/${order.id}?payment=cancel`,
  });

  // Save stripeSessionId so we can trace webhook → order
  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ success: true, url: checkoutSession.url });
}
