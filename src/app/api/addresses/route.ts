import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/addresses — list user's saved addresses
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addresses = await (prisma as any).address.findMany({
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

  // If new address is default, unset others first
  if (isDefault) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).address.updateMany({
      where: { userId: session.userId },
      data: { isDefault: false },
    });
  }

  // If this is the first address, make it default automatically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = await (prisma as any).address.count({ where: { userId: session.userId } });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await (prisma as any).address.create({
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
