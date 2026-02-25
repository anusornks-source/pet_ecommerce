import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Update quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const { quantity } = await request.json();

  if (quantity < 1) {
    return NextResponse.json({ success: false, error: "จำนวนต้องมากกว่า 0" }, { status: 400 });
  }

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== session.userId) {
    return NextResponse.json({ success: false, error: "ไม่พบรายการ" }, { status: 404 });
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });

  return NextResponse.json({ success: true });
}

// Remove item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== session.userId) {
    return NextResponse.json({ success: false, error: "ไม่พบรายการ" }, { status: 404 });
  }

  await prisma.cartItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}
