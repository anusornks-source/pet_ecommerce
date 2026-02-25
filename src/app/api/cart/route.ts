import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET cart
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.userId },
    include: {
      items: {
        include: { product: { include: { category: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  return NextResponse.json({ success: true, data: cart });
}

// ADD item to cart
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { productId, quantity = 1 } = await request.json();

  if (!productId) {
    return NextResponse.json({ success: false, error: "productId is required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }
  if (product.stock < quantity) {
    return NextResponse.json({ success: false, error: "สินค้าไม่เพียงพอ" }, { status: 400 });
  }

  // Get or create cart
  const cart = await prisma.cart.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId },
    update: {},
  });

  // Upsert cart item
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: { include: { product: { include: { category: true } } } },
    },
  });

  return NextResponse.json({ success: true, data: updatedCart });
}

// DELETE all cart items
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const cart = await prisma.cart.findUnique({ where: { userId: session.userId } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  return NextResponse.json({ success: true });
}
