import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const { name, phone, role, password } = await request.json();

  if (!name) {
    return NextResponse.json({ success: false, error: "ชื่อจำเป็น" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    name,
    phone: phone || null,
    role: role === "ADMIN" ? "ADMIN" : "USER",
  };

  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
    }
    updateData.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, phone: true, active: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const { active } = await request.json();

  const user = await prisma.user.update({
    where: { id },
    data: { active },
    select: { id: true, active: true },
  });

  return NextResponse.json({ success: true, data: user });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  // Prevent deleting yourself
  if ((auth as { userId: string }).userId === id) {
    return NextResponse.json({ success: false, error: "ไม่สามารถลบบัญชีตัวเองได้" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
