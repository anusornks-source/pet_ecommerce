import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET user orders
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    include: {
      items: { include: { product: { include: { category: true } } } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: orders });
}

// CREATE order from cart
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { address, phone, note, paymentMethod } = await request.json();

  if (!address || !phone || !paymentMethod) {
    return NextResponse.json(
      { success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
      { status: 400 }
    );
  }

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId: session.userId },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json(
      { success: false, error: "ตะกร้าสินค้าว่างเปล่า" },
      { status: 400 }
    );
  }

  // Check stock
  for (const item of cart.items) {
    if (item.product.stock < item.quantity) {
      return NextResponse.json(
        { success: false, error: `สินค้า "${item.product.name}" มีไม่เพียงพอ` },
        { status: 400 }
      );
    }
  }

  const total = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Create order + payment in transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: session.userId,
        address,
        phone,
        note,
        total,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
      include: {
        items: { include: { product: { include: { category: true } } } },
      },
    });

    // Create payment record
    await tx.payment.create({
      data: {
        orderId: newOrder.id,
        method: paymentMethod,
        amount: total,
        status: paymentMethod === "COD" ? "PENDING" : "PENDING",
      },
    });

    // Update stock
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}
