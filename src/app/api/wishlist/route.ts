import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const items = await prisma.wishlist.findMany({
    where: { userId: session.userId },
    include: { product: { include: { category: true, petType: true, tags: true, variants: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: items });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { productId } = await request.json();
  if (!productId) {
    return NextResponse.json({ success: false, error: "ไม่พบ productId" }, { status: 400 });
  }

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: session.userId, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, wishlisted: false });
  }

  await prisma.wishlist.create({ data: { userId: session.userId, productId } });
  return NextResponse.json({ success: true, wishlisted: true }, { status: 201 });
}
