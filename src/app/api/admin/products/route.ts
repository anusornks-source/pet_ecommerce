import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: products });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const {
    name,
    description,
    price,
    stock,
    images,
    categoryId,
    petType,
    featured,
    variants = [],
  } = body;

  if (!name || !description || price == null || stock == null || !categoryId) {
    return NextResponse.json(
      { success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
      { status: 400 }
    );
  }

  type VariantInput = { size?: string; color?: string; price: string; stock: string; sku?: string };
  const product = await prisma.product.create({
    data: {
      name,
      description,
      price: parseFloat(price),
      stock: parseInt(stock),
      images: Array.isArray(images) ? images : [],
      categoryId,
      petType: petType || null,
      featured: !!featured,
      ...(variants.length > 0 && {
        variants: {
          create: variants.map((v: VariantInput) => ({
            size: v.size || null,
            color: v.color || null,
            price: parseFloat(v.price) || 0,
            stock: parseInt(v.stock) || 0,
            sku: v.sku || null,
          })),
        },
      }),
    },
    include: { category: true, variants: true },
  });

  return NextResponse.json({ success: true, data: product }, { status: 201 });
}
