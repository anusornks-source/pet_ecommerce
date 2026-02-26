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
      items: { include: { product: true } },
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
  const { status } = body;

  const validStatuses = [
    "PENDING",
    "CONFIRMED",
    "SHIPPING",
    "DELIVERED",
    "CANCELLED",
  ];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { success: false, error: "สถานะไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ success: true, data: order });
}
