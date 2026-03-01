import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";
import { createCJOrder, getCJInventory } from "@/lib/cjDropshipping";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

// POST /api/jobs/cj-order
// Called by QStash after Stripe payment — creates CJ order for CJ products
export async function POST(request: NextRequest) {
  // Verify QStash signature
  const signature = request.headers.get("upstash-signature") ?? "";
  const rawBody = await request.text();

  try {
    const isValid = await receiver.verify({ signature, body: rawBody });
    if (!isValid) {
      return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const { orderId } = JSON.parse(rawBody) as { orderId: string };
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      cjOrderId: true,
      address: true,
      phone: true,
      note: true,
      statusHistory: true,
      user: { select: { name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, cjProductId: true, stock: true } },
          variant: { select: { id: true, cjVid: true, stock: true } },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Skip if CJ order already created (idempotency)
  if (order.cjOrderId) {
    return NextResponse.json({ skipped: true, cjOrderId: order.cjOrderId });
  }

  const cjProducts = order.items
    .filter((item) => item.variant?.cjVid || item.product?.cjProductId)
    .map((item) => ({
      vid: (item.variant?.cjVid ?? item.product?.cjProductId) as string,
      quantity: item.quantity,
    }));

  if (cjProducts.length === 0) {
    return NextResponse.json({ skipped: true, reason: "No CJ products in order" });
  }

  const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as Array<{
    status: string; timestamp: string; note?: string;
  }>;

  // Update CJ real-time stock before creating order
  const cjVidItems = order.items.filter((item) => item.variant?.cjVid);
  const cjVids = cjVidItems.map((item) => item.variant!.cjVid!);
  if (cjVids.length > 0) {
    try {
      const inventoryMap = await getCJInventory(cjVids);
      for (const item of cjVidItems) {
        const vid = item.variant!.cjVid!;
        if (inventoryMap[vid] !== undefined) {
          await prisma.productVariant.update({
            where: { id: item.variant!.id },
            data: { cjStock: Math.max(0, inventoryMap[vid] - item.quantity) },
          });
        }
      }
    } catch { /* non-fatal */ }
  }

  try {
    const { cjOrderId } = await createCJOrder({
      orderNumber: orderId,
      shippingCustomerName: order.user?.name ?? "",
      shippingPhone: order.phone ?? "",
      shippingAddress: order.address ?? "",
      shippingCity: "",
      shippingProvince: "",
      shippingCountry: "Thailand",
      shippingCountryCode: "TH",
      shippingZip: "",
      logisticName: process.env.CJ_LOGISTIC_NAME || "CJPACKET",
      products: cjProducts,
      remark: order.note ?? "",
    }, orderId);

    history.push({ status: "CJ_SUBMITTED", timestamp: new Date().toISOString(), note: `CJ Order ID: ${cjOrderId}` });
    await prisma.order.update({
      where: { id: orderId },
      data: { cjOrderId, statusHistory: history },
    });

    return NextResponse.json({ success: true, cjOrderId });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown CJ error";
    history.push({ status: "CJ_ERROR", timestamp: new Date().toISOString(), note: errMsg });
    await prisma.order.update({
      where: { id: orderId },
      data: { statusHistory: history },
    });
    // Return 500 so QStash retries
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
