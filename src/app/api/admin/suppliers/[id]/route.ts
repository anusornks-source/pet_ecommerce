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
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              name_th: true,
              images: true,
              price: true,
              stock: true,
            },
          },
        },
      },
    },
  });

  if (!supplier) {
    return NextResponse.json({ success: false, error: "ไม่พบซัพพลายเออร์" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: supplier });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { name, nameTh, contact, website, note } = body;

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) {
    return NextResponse.json({ success: false, error: "ไม่พบซัพพลายเออร์" }, { status: 404 });
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name?.trim() || supplier.name }),
      ...(nameTh !== undefined && { nameTh: nameTh?.trim() || null }),
      ...(contact !== undefined && { contact: contact?.trim() || null }),
      ...(website !== undefined && { website: website?.trim() || null }),
      ...(note !== undefined && { note: note?.trim() || null }),
    },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) {
    return NextResponse.json({ success: false, error: "ไม่พบซัพพลายเออร์" }, { status: 404 });
  }

  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
