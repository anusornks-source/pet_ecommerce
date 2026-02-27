import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data: stores });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { name, address, phone, openHours, image, remark, lat, lng } = body;

  if (!name || !address || !phone || !openHours || lat == null || lng == null) {
    return NextResponse.json(
      { success: false, error: "กรุณากรอกข้อมูลที่จำเป็น" },
      { status: 400 }
    );
  }

  const store = await prisma.store.create({
    data: {
      name,
      address,
      phone,
      openHours,
      image: image || null,
      remark: remark || null,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    },
  });

  return NextResponse.json({ success: true, data: store }, { status: 201 });
}
