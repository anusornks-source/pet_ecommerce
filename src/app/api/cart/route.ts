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
        include: {
          product: { include: { category: true } },
          variant: true,
        },
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

  const { productId, quantity = 1, variantId = null } = await request.json();

  if (!productId) {
    return NextResponse.json({ success: false, error: "productId is required" }, { status: 400 });
  }

  // Validate stock — use variant stock if provided, otherwise product stock
  if (variantId) {
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return NextResponse.json({ success: false, error: "ไม่พบ variant" }, { status: 404 });
    if (variant.stock < quantity) return NextResponse.json({ success: false, error: "สินค้าไม่เพียงพอ" }, { status: 400 });
  } else {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
    if (product.stock < quantity) return NextResponse.json({ success: false, error: "สินค้าไม่เพียงพอ" }, { status: 400 });
  }

  // Get or create cart
  const cart = await prisma.cart.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId },
    update: {},
  });

  // Find existing item (handle null variantId: use findFirst to avoid null != null issue in composite unique)
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? null },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
    });
  }

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: { include: { category: true } },
          variant: true,
        },
      },
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
