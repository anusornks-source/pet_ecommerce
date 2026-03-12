import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const minimal = searchParams.get("minimal") === "true"; // for select/search: id, name, nameTh, imageUrl only

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { nameTh: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  if (minimal) {
    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
      select: { id: true, name: true, nameTh: true, imageUrl: true },
    });
    return NextResponse.json({ success: true, data: suppliers });
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    take: where ? limit : undefined,
    include: {
      _count: { select: { products: true } },
      products: {
        include: {
          product: {
            select: { id: true, name: true, name_th: true, images: true },
          },
        },
      },
    },
  });
  return NextResponse.json({ success: true, data: suppliers });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { name, nameTh, imageUrl, tel, email, contact, website, note } = body;

  if (!name?.trim()) {
    return NextResponse.json({ success: false, error: "กรุณากรอกชื่อ" }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: name.trim(),
      nameTh: nameTh?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      tel: tel?.trim() || null,
      email: email?.trim() || null,
      contact: contact?.trim() || null,
      website: website?.trim() || null,
      note: note?.trim() || null,
    },
  });
  return NextResponse.json({ success: true, data: supplier });
}
