import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { id } = await params;
  const body = await request.json();
  const { name, nameEn, slug, color, icon } = body;

  // Verify tag belongs to this shop (only shop-owned tags can be edited)
  const existingTag = await prisma.tag.findFirst({ where: { id, shopId } });
  if (!existingTag) {
    return NextResponse.json({ success: false, error: "ไม่พบแท็กหรือไม่มีสิทธิ์แก้ไข" }, { status: 404 });
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { id } = await params;
  // Verify tag belongs to this shop (only shop-owned tags can be deleted)
  const existingTagDel = await prisma.tag.findFirst({ where: { id, shopId } });
  if (!existingTagDel) {
    return NextResponse.json({ success: false, error: "ไม่พบแท็กหรือไม่มีสิทธิ์ลบ" }, { status: 404 });
  }

  // Prisma handles implicit many-to-many disconnect automatically on delete
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
