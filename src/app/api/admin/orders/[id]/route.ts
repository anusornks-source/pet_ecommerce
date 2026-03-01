import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { createCJOrder, getCJInventory, getCJFreight } from "@/lib/cjDropshipping";

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
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
  const force = request.nextUrl.searchParams.get("force") === "true";
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
      total: true,
      user: { select: { name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, cjProductId: true, stock: true, costPrice: true } },
          variant: { select: { id: true, cjVid: true, stock: true } },
        },
      },
    },
  });

  if (!current) {
    return NextResponse.json({ success: false, error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  }

  // ── CONFIRM: stock check (local + CJ) ────────────────────────────────────
  if (status === "CONFIRMED" && current.status !== "CONFIRMED") {
    // 1. Fetch CJ real-time inventory for all CJ variant items
    const cjVidItems = current.items.filter((item) => item.variant?.cjVid);
    const cjVids = cjVidItems.map((item) => item.variant!.cjVid!);
    let inventoryMap: Record<string, number> = {};
    let cjApiAvailable = false;

    if (cjVids.length > 0) {
      try {
        inventoryMap = await getCJInventory(cjVids);
        cjApiAvailable = Object.keys(inventoryMap).length > 0;
      } catch {
        // If CJ API fails entirely, fall through to local stock check only
      }
    }

    // 2. Check each item — CJ items use CJ real-time stock, others use local DB
    const outOfStock: string[] = [];
    const stockCheckItems: {
      name: string;
      quantity: number;
      available: number;
      source: "CJ" | "local";
      ok: boolean;
    }[] = [];

    for (const item of current.items) {
      const cjVid = item.variant?.cjVid;
      if (cjVid && cjApiAvailable) {
        const cjStock = inventoryMap[cjVid] ?? 0;
        const ok = cjStock >= item.quantity;
        stockCheckItems.push({ name: item.product.name, quantity: item.quantity, available: cjStock, source: "CJ", ok });
        if (!ok) outOfStock.push(`${item.product.name} (CJ มีสต็อก ${cjStock} ชิ้น ต้องการ ${item.quantity} ชิ้น)`);
      } else {
        const localStock = item.variant ? item.variant.stock : item.product.stock;
        const ok = localStock >= 0;
        stockCheckItems.push({ name: item.product.name, quantity: item.quantity, available: localStock + item.quantity, source: "local", ok });
        if (!ok) outOfStock.push(`${item.product.name} (ขาด ${Math.abs(localStock)} ชิ้น)`);
      }
    }

    // dryRun: return stock check + freight/cost estimate without committing
    if (dryRun) {
      // 3. Freight estimate for CJ items (best-effort)
      const logisticName = process.env.CJ_LOGISTIC_NAME || "CJPACKET";
      const usdToThb = 36;
      const cjItems = current.items.filter((item) => item.product.cjProductId);

      const freightItems: { name: string; priceUSD: number; logistic: string }[] = [];
      let freightTotalUSD = 0;
      let freightApiAvailable = false;

      for (const item of cjItems) {
        try {
          const opts = await getCJFreight(item.product.cjProductId!, item.quantity);
          if (opts.length > 0) {
            freightApiAvailable = true;
            const match =
              opts.find((o) => o.logisticName === logisticName) ??
              opts.reduce((a, b) => (a.logisticPrice < b.logisticPrice ? a : b));
            freightItems.push({ name: item.product.name, priceUSD: match.logisticPrice, logistic: match.logisticName });
            freightTotalUSD += match.logisticPrice;
          }
        } catch { /* skip */ }
      }

      // 4. Cost estimate
      const itemsCostUSD = cjItems.reduce(
        (sum, item) => sum + (item.product.costPrice ?? 0) * item.quantity,
        0
      );
      const itemsCostTHB = Math.ceil(itemsCostUSD * usdToThb);
      const freightTHB = Math.ceil(freightTotalUSD * usdToThb);

      return NextResponse.json({
        success: true,
        dryRun: true,
        stockCheck: {
          ok: outOfStock.length === 0,
          cjApiAvailable,
          items: stockCheckItems,
          outOfStock,
        },
        costEstimate: cjItems.length > 0 ? {
          itemsCostUSD: Math.round(itemsCostUSD * 100) / 100,
          itemsCostTHB,
          freightTotalUSD: Math.round(freightTotalUSD * 100) / 100,
          freightTHB,
          totalCostTHB: itemsCostTHB + freightTHB,
          estimatedMarginTHB: current.total - (itemsCostTHB + freightTHB),
          usdToThb,
          freightItems,
          freightApiAvailable,
          logistic: logisticName,
        } : null,
      });
    }

    if (outOfStock.length > 0 && !force) {
      return NextResponse.json(
        { success: false, error: `สต็อกไม่เพียงพอ:\n${outOfStock.join("\n")}` },
        { status: 400 }
      );
    }

    // 3. Update cjStock to CJ real-time value minus ordered quantity (display stock is not touched)
    for (const item of cjVidItems) {
      const cjVid = item.variant!.cjVid!;
      if (inventoryMap[cjVid] === undefined) continue;
      await prisma.productVariant.update({
        where: { id: item.variant!.id },
        data: { cjStock: Math.max(0, inventoryMap[cjVid] - item.quantity) },
      });
    }
  } else if (dryRun) {
    // dryRun for non-CONFIRM transitions — nothing to check, just return ok
    return NextResponse.json({ success: true, dryRun: true, stockCheck: null, costEstimate: null });
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
        }, id);
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
