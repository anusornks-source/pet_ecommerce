import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (isNextResponse(auth)) return auth;

  const { id: productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
  }

  const list = await prisma.adDesign.findMany({
    where: { productId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, state: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ success: true, data: list });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id: productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, state } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ success: false, error: "name required" }, { status: 400 });
  }
  if (state === undefined || state === null) {
    return NextResponse.json({ success: false, error: "state required" }, { status: 400 });
  }

  const design = await prisma.adDesign.create({
    data: {
      productId,
      name: name.trim(),
      state: state as object,
    },
  });
  return NextResponse.json({ success: true, data: design });
}
