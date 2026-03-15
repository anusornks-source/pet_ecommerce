import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { SUPPLIER_SEARCH_PAGE_SIZE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const limit = Math.min(Number(searchParams.get("limit")) || SUPPLIER_SEARCH_PAGE_SIZE, 100);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
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
    const skip = (page - 1) * limit;
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        select: { id: true, name: true, nameTh: true, imageUrl: true },
      }),
      prisma.supplier.count({ where }),
    ]);
    return NextResponse.json({ success: true, data: suppliers, total, page, pageSize: limit });
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    take: where ? limit : undefined,
    include: {
      _count: { select: { products: true, supplierProducts: true } },
      products: {
        include: {
          product: {
            select: { id: true, name: true, name_th: true, images: true },
          },
        },
      },
      supplierProducts: {
        select: {
          id: true,
          name: true,
          name_th: true,
          images: true,
          productId: true,
          supplierPrice: true,
          validationStatus: true,
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
