import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const store = await prisma.store.findUnique({ where: { id } });

  if (!store) {
    return NextResponse.json({ success: false, error: "ไม่พบสาขา" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: store });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { name, address, phone, openHours, image, remark, lat, lng } = body;

  const store = await prisma.store.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(openHours !== undefined && { openHours }),
      ...(image !== undefined && { image: image || null }),
      ...(remark !== undefined && { remark: remark || null }),
      ...(lat !== undefined && { lat: parseFloat(lat) }),
      ...(lng !== undefined && { lng: parseFloat(lng) }),
    },
  });

  return NextResponse.json({ success: true, data: store });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  await prisma.store.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
