import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCartShipping } from "@/lib/shipping";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.userId },
    include: {
      items: {
        include: {
          product: { select: { shopId: true, price: true } },
          variant: { select: { price: true } },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        shipping: 0,
        subtotal: 0,
        freeShippingMin: null,
        addForFreeShipping: null,
      },
    });
  }

  const result = await calculateCartShipping(cart.items);
  return NextResponse.json({ success: true, data: result });
}
