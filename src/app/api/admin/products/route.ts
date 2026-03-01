import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const source = searchParams.get("source") || "";       // "CJ" | "own" | ""
  const active = searchParams.get("active") || "";       // "true" | "false" | ""
  const categoryId = searchParams.get("categoryId") || "";
  const petType = searchParams.get("petType") || "";     // slug e.g. "dog"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (source === "CJ") where.source = "CJ";
  if (source === "own") where.source = null;
  if (active === "true") where.active = true;
  if (active === "false") where.active = false;
  if (categoryId) where.categoryId = categoryId;
  if (petType) where.petType = { slug: petType };

  const products = await prisma.product.findMany({
    where,
    include: { category: true, petType: true },
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
    shortDescription,
    price,
    stock,
    images,
    categoryId,
    petTypeId,
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
      shortDescription: shortDescription || null,
      price: parseFloat(price),
      stock: parseInt(stock),
      images: Array.isArray(images) ? images : [],
      categoryId,
      petTypeId: petTypeId || null,
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
    include: { category: true, petType: true, variants: true },
  });

  return NextResponse.json({ success: true, data: product }, { status: 201 });
}
