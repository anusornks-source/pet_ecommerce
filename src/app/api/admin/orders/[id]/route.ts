import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { createCJOrder } from "@/lib/cjDropshipping";

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

  // Get current order to build statusHistory + CJ data
  const current = await prisma.order.findUnique({
    where: { id },
    select: {
      statusHistory: true, cjOrderId: true,
      address: true, phone: true, note: true,
      user: { select: { name: true } },
      items: { include: { variant: { select: { cjVid: true } }, product: { select: { name: true, cjProductId: true } } } },
    },
  });

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
        // Log but do not block the confirm
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
