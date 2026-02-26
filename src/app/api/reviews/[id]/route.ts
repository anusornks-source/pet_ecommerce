import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { id } = await params;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ success: false, error: "ไม่พบรีวิว" }, { status: 404 });
  }

  if (review.userId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
