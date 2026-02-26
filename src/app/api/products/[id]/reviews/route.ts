import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reviews = await prisma.review.findMany({
    where: { productId: id },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: reviews });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { id } = await params;
  const { rating, comment } = await request.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ success: false, error: "คะแนนต้องอยู่ระหว่าง 1-5" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }

  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId: id, userId: session.userId } },
  });
  if (existing) {
    return NextResponse.json({ success: false, error: "คุณรีวิวสินค้านี้ไปแล้ว" }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      productId: id,
      userId: session.userId,
      rating: Number(rating),
      comment: comment?.trim() || null,
    },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json({ success: true, data: review }, { status: 201 });
}
