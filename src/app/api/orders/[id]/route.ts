import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      payment: true,
    },
  });

  if (!order || order.userId !== session.userId) {
    return NextResponse.json({ success: false, error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: order });
}
