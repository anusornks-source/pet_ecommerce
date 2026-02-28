import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/addresses — list user's saved addresses
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ success: true, data: addresses });
}

// POST /api/addresses — create new address
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { label, name, phone, address, isDefault } = await req.json();
  if (!name || !phone || !address) {
    return NextResponse.json({ success: false, error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
  }

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.userId },
      data: { isDefault: false },
    });
  }

  const count = await prisma.address.count({ where: { userId: session.userId } });

  const created = await prisma.address.create({
    data: {
      userId: session.userId,
      label: label || "บ้าน",
      name,
      phone,
      address,
      isDefault: isDefault || count === 0,
    },
  });

  return NextResponse.json({ success: true, data: created });
}
