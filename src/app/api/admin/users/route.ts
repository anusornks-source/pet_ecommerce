import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const PAGE_SIZE = 50;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        active: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count(),
  ]);

  return NextResponse.json({ success: true, data: users, total, page, pageSize: PAGE_SIZE });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { name, email, password, phone, role } = await request.json();
  if (!name || !email || !password) {
    return NextResponse.json({ success: false, error: "ชื่อ อีเมล และรหัสผ่านจำเป็น" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ success: false, error: "อีเมลนี้มีอยู่แล้ว" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      role: role === "ADMIN" ? "ADMIN" : "USER",
    },
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
