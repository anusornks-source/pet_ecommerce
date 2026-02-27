import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

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

  // Get current order to build statusHistory
  const current = await prisma.order.findUnique({ where: { id }, select: { statusHistory: true } });
  const history = (Array.isArray(current?.statusHistory) ? current.statusHistory : []) as Array<{
    status: string; timestamp: string; note?: string;
  }>;

  history.push({ status, timestamp: new Date().toISOString(), ...(note ? { note } : {}) });

  const order = await prisma.order.update({
    where: { id },
    data: { status, statusHistory: history },
  });

  return NextResponse.json({ success: true, data: order });
}
