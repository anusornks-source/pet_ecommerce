import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOrderNotification } from "@/lib/email";

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

  const { address, phone, note, paymentMethod, couponCode } = await request.json();

  if (!address || !phone || !paymentMethod) {
    return NextResponse.json(
      { success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
      { status: 400 }
    );
  }

  // Get cart with variants
  const cart = await prisma.cart.findUnique({
    where: { userId: session.userId },
    include: { items: { include: { product: true, variant: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json(
      { success: false, error: "ตะกร้าสินค้าว่างเปล่า" },
      { status: 400 }
    );
  }

  // Check stock (use variant stock if applicable)
  for (const item of cart.items) {
    const availableStock = item.variant ? item.variant.stock : item.product.stock;
    if (availableStock < item.quantity) {
      return NextResponse.json(
        { success: false, error: `สินค้า "${item.product.name}" มีไม่เพียงพอ` },
        { status: 400 }
      );
    }
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + (item.variant?.price ?? item.product.price) * item.quantity,
    0
  );
  const shipping = subtotal > 500 ? 0 : 50;

  // Validate coupon if provided
  let discount = 0;
  let coupon = null;
  if (couponCode) {
    coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (coupon && coupon.active) {
      if ((!coupon.expiresAt || coupon.expiresAt > new Date()) &&
          (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
          (coupon.minOrder === null || subtotal >= coupon.minOrder)) {
        discount = coupon.type === "PERCENT"
          ? Math.round((subtotal * coupon.value) / 100)
          : Math.min(coupon.value, subtotal);
      }
    }
  }

  const total = subtotal + shipping - discount;

  // Create order + payment in transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: session.userId,
        address,
        phone,
        note,
        total,
        discount,
        couponCode: coupon ? coupon.code : null,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            price: item.variant?.price ?? item.product.price,
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
        status: "PENDING",
      },
    });

    // Update stock (variant or product)
    for (const item of cart.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Increment coupon usedCount
    if (coupon) {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  // Send email notification (fire-and-forget — don't block order response)
  try {
    const [settings, user] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }),
    ]);

    if (settings?.adminEmail && user) {
      sendOrderNotification({
        orderId: order.id,
        customerName: user.name,
        customerEmail: user.email,
        phone,
        address,
        note,
        paymentMethod,
        total: order.total,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
        })),
        storeName: settings.storeName,
        adminEmail: settings.adminEmail,
      }).catch(() => {}); // ignore email errors silently
    }
  } catch {
    // ignore — never block the order
  }

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}
