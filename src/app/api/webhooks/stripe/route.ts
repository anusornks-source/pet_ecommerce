import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Client } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" });
const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

// Must disable body parsing — Stripe needs raw body for signature verification
export const config = { api: { bodyParser: false } };

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[Stripe Webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    console.error("[Stripe Webhook] no orderId in metadata", session.id);
    return NextResponse.json({ error: "No orderId in metadata" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    console.error("[Stripe Webhook] order not found:", orderId);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Idempotency — skip if already paid
  if (order.status !== "PENDING") {
    return NextResponse.json({ received: true, skipped: true });
  }

  const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as Array<{
    status: string; timestamp: string; note?: string;
  }>;
  history.push({ status: "CONFIRMED", timestamp: new Date().toISOString(), note: "Stripe payment completed" });

  // Update order + payment atomically
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED", statusHistory: history },
    }),
    prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        method: "STRIPE",
        status: "PAID",
        amount: (session.amount_total ?? 0) / 100,
        ref: session.payment_intent as string,
        paidAt: new Date(),
      },
      update: {
        status: "PAID",
        ref: session.payment_intent as string,
        paidAt: new Date(),
      },
    }),
  ]);

  // Push CJ order creation job to QStash (non-blocking)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  try {
    await qstash.publishJSON({
      url: `${baseUrl}/api/jobs/cj-order`,
      body: { orderId },
      retries: 3,
      delay: 2, // seconds — give DB a moment to commit
    });
  } catch (err) {
    console.error("[Stripe Webhook] QStash publish failed:", err);
    // Non-fatal — CJ order can be created manually from admin
  }

  return NextResponse.json({ received: true });
}
