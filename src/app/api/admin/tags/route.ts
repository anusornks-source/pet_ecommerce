import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const tags = await prisma.tag.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ success: true, data: tags });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { name, nameEn, slug, color = "orange", icon } = body;

  if (!name || !slug) {
    return NextResponse.json({ success: false, error: "name และ slug จำเป็น" }, { status: 400 });
  }

  try {
    const tag = await prisma.tag.create({
      data: { name, nameEn: nameEn || null, slug, color, icon: icon || null },
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
