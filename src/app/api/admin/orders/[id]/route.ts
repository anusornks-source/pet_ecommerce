import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { createCJOrder, getCJInventory } from "@/lib/cjDropshipping";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: { include: { product: true, variant: true } },
      payment: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: "ไม่พบคำสั่งซื้อ" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: order });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { status, note } = body;

  const validStatuses = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { success: false, error: "สถานะไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  // Get current order to build statusHistory + CJ data + items with stock
  const current = await prisma.order.findUnique({
    where: { id },
    select: {
      status: true,
      statusHistory: true,
      cjOrderId: true,
      address: true,
      phone: true,
      note: true,
      user: { select: { name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, cjProductId: true, stock: true } },
          variant: { select: { id: true, cjVid: true, stock: true } },
        },
      },
    },
  });

  if (!current) {
    return NextResponse.json({ success: false, error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  }

  // ── CONFIRM: stock check + CJ inventory sync ──────────────────────────────
  if (status === "CONFIRMED" && current.status !== "CONFIRMED") {
    // 1. Check our DB stock (was already decremented at order placement)
    //    If stock < 0 → oversold → block confirm
    const outOfStock: string[] = [];
    for (const item of current.items) {
      const currentStock = item.variant ? item.variant.stock : item.product.stock;
      if (currentStock < 0) {
        outOfStock.push(`${item.product.name} (ขาด ${Math.abs(currentStock)} ชิ้น)`);
      }
    }
    if (outOfStock.length > 0) {
      return NextResponse.json(
        { success: false, error: `สต็อกไม่เพียงพอ: ${outOfStock.join(", ")}` },
        { status: 400 }
      );
    }

    // 2. Sync CJ inventory for CJ products (best-effort — don't block on failure)
    const cjVids = current.items
      .map((item) => item.variant?.cjVid)
      .filter((v): v is string => !!v);

    if (cjVids.length > 0) {
      try {
        const inventoryMap = await getCJInventory(cjVids);
        for (const item of current.items) {
          const cjVid = item.variant?.cjVid;
          if (!cjVid || inventoryMap[cjVid] === undefined) continue;
          // Update variant stock to CJ's real-time value (minus what we just ordered)
          const cjStock = inventoryMap[cjVid];
          await prisma.productVariant.update({
            where: { id: item.variant!.id },
            data: { stock: Math.max(0, cjStock - item.quantity) },
          });
        }
      } catch {
        // Non-blocking: CJ inventory sync failure doesn't prevent confirm
      }
    }
  }

  // ── CANCEL: restore stock ──────────────────────────────────────────────────
  if (status === "CANCELLED" && current.status !== "CANCELLED") {
    for (const item of current.items) {
      if (item.variant) {
        await prisma.productVariant.update({
          where: { id: item.variant.id },
          data: { stock: { increment: item.quantity } },
        });
      } else {
        await prisma.product.update({
          where: { id: item.product.id },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  }

  const history = (Array.isArray(current?.statusHistory) ? current.statusHistory : []) as Array<{
    status: string; timestamp: string; note?: string;
  }>;

  history.push({ status, timestamp: new Date().toISOString(), ...(note ? { note } : {}) });

  // Build update data
  const updateData: Record<string, unknown> = { status, statusHistory: history };

  // Auto-create CJ order when CONFIRMED (only once, only if items have cjVid)
  if (status === "CONFIRMED" && !current?.cjOrderId && current?.items) {
    const cjProducts = current.items
      .filter((item) => item.variant?.cjVid || item.product?.cjProductId)
      .map((item) => ({
        vid: (item.variant?.cjVid ?? item.product?.cjProductId) as string,
        quantity: item.quantity,
      }));

    if (cjProducts.length > 0) {
      try {
        const { cjOrderId } = await createCJOrder({
          orderNumber: id,
          shippingCustomerName: current.user?.name ?? "",
          shippingPhone: current.phone ?? "",
          shippingAddress: current.address ?? "",
          shippingCity: "",
          shippingProvince: "",
          shippingCountry: "Thailand",
          shippingCountryCode: "TH",
          shippingZip: "",
          logisticName: process.env.CJ_LOGISTIC_NAME || "CJPACKET",
          products: cjProducts,
          remark: current.note ?? "",
        });
        updateData.cjOrderId = cjOrderId;
        history.push({ status: "CJ_SUBMITTED", timestamp: new Date().toISOString(), note: `CJ Order ID: ${cjOrderId}` });
        updateData.statusHistory = history;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown CJ error";
        history.push({ status: "CJ_ERROR", timestamp: new Date().toISOString(), note: errMsg });
        updateData.statusHistory = history;
        console.error("CJ createOrder error:", errMsg);
      }
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ success: true, data: order });
}
