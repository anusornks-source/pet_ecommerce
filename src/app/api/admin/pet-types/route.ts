import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const petTypes = await prisma.petType.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ success: true, data: petTypes });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { name, slug, icon, order } = await request.json();
  if (!name || !slug) {
    return NextResponse.json({ success: false, error: "name และ slug จำเป็นต้องมี" }, { status: 400 });
  }

  const petType = await prisma.petType.create({
    data: { name, slug, icon: icon || null, order: order ?? 0 },
  });
  return NextResponse.json({ success: true, data: petType }, { status: 201 });
}
