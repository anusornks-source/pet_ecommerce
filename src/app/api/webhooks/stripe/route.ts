import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Client } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";
import { logApi } from "@/lib/apiLogger";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
const getQStash = () => new Client({ token: process.env.QSTASH_TOKEN! });

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    await logApi({ type: "WEBHOOK", source: "STRIPE", method: "POST", path: "/api/webhooks/stripe", statusCode: 400, success: false, error: "Missing stripe-signature" });
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[Stripe Webhook] signature verification failed:", err);
    await logApi({ type: "WEBHOOK", source: "STRIPE", method: "POST", path: "/api/webhooks/stripe", statusCode: 400, success: false, error: "Invalid signature" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Idempotency: skip if event already processed ──────────────────────────
  try {
    await prisma.processedStripeEvent.create({ data: { id: event.id } });
  } catch {
    // Unique constraint violation = already processed
    return NextResponse.json({ received: true, skipped: true });
  }

  // ── Handle events ─────────────────────────────────────────────────────────
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        console.error("[Stripe Webhook] no orderId in metadata", session.id);
        await logApi({ type: "WEBHOOK", source: "STRIPE", method: "POST", path: "/api/webhooks/stripe", eventType: event.type, eventId: event.id, statusCode: 400, success: false, error: "no orderId in session metadata", request: { sessionId: session.id } });
        break;
      }

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== "PENDING") {
        await logApi({ type: "WEBHOOK", source: "STRIPE", method: "POST", path: "/api/webhooks/stripe", eventType: event.type, eventId: event.id, statusCode: 200, success: false, error: `order not found or not PENDING (status: ${order?.status})`, request: { sessionId: session.id, orderId } });
        break;
      }

      const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as Array<{
        status: string; timestamp: string; note?: string;
      }>;
      history.push({
        status: "CONFIRMED",
        timestamp: new Date().toISOString(),
        note: "ชำระผ่าน Stripe สำเร็จ",
      });

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

      await logApi({
        type: "WEBHOOK", source: "STRIPE", method: "POST", path: "/api/webhooks/stripe",
        eventType: event.type, eventId: event.id, statusCode: 200, success: true,
        request: { sessionId: session.id, orderId, amountTotal: session.amount_total },
        response: { orderStatus: "CONFIRMED" },
      });

      // Push CJ order creation job to QStash
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
      try {
        await getQStash().publishJSON({
          url: `${baseUrl}/api/jobs/cj-order`,
          body: { orderId },
          retries: 3,
          delay: 2,
        });
      } catch (err) {
        console.error("[Stripe Webhook] QStash publish failed:", err);
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;
      if (!paymentIntentId) {
        await logApi({ type: "WEBHOOK", source: "STRIPE", method: "POST", path: "/api/webhooks/stripe", eventType: event.type, eventId: event.id, statusCode: 400, success: false, error: "no payment_intent on charge" });
        break;
      }

      const payment = await prisma.payment.findFirst({ where: { ref: paymentIntentId } });
      if (!payment) {
        await logApi({ type: "WEBHOOK", source: "STRIPE", method: "POST", path: "/api/webhooks/stripe", eventType: event.type, eventId: event.id, statusCode: 404, success: false, error: `payment not found for paymentIntent ${paymentIntentId}` });
        break;
      }

      const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
      if (!order) break;

      const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as Array<{
        status: string; timestamp: string; note?: string;
      }>;
      history.push({
        status: "REFUNDED",
        timestamp: new Date().toISOString(),
        note: `คืนเงิน ฿${((charge.amount_refunded ?? 0) / 100).toLocaleString()} ผ่าน Stripe`,
      });

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED" },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "CANCELLED", statusHistory: history },
        }),
      ]);

      await logApi({
        type: "WEBHOOK", source: "STRIPE", method: "POST", path: "/api/webhooks/stripe",
        eventType: event.type, eventId: event.id, statusCode: 200, success: true,
        request: { chargeId: charge.id, paymentIntentId, amountRefunded: charge.amount_refunded },
        response: { orderId: order.id, orderStatus: "CANCELLED", paymentStatus: "REFUNDED" },
      });
      break;
    }

    default:
      await logApi({ type: "WEBHOOK", source: "STRIPE", method: "POST", path: "/api/webhooks/stripe", eventType: event.type, eventId: event.id, statusCode: 200, success: true, response: { note: "unhandled event" } });
      break;
  }

  return NextResponse.json({ received: true });
}
