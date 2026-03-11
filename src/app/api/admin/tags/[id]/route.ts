import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

// Global tags — only platform ADMIN can edit/delete.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { name, nameEn, slug, color, icon } = body;

  const existingTag = await prisma.tag.findUnique({ where: { id } });
  if (!existingTag) {
    return NextResponse.json({ success: false, error: "ไม่พบแท็ก" }, { status: 404 });
  }

  try {
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameEn !== undefined && { nameEn: nameEn || null }),
        ...(slug !== undefined && { slug }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon: icon || null }),
      },
    });
    return NextResponse.json({ success: true, data: tag });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    if (msg.includes("Unique constraint") || msg.includes("unique")) {
      return NextResponse.json({ success: false, error: "slug นี้ถูกใช้แล้ว" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const existingTag = await prisma.tag.findUnique({ where: { id } });
  if (!existingTag) {
    return NextResponse.json({ success: false, error: "ไม่พบแท็ก" }, { status: 404 });
  }

  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
