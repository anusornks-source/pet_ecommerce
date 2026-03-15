import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const design = await prisma.adDesign.findUnique({
    where: { id },
    select: { id: true, productId: true, name: true, note: true, state: true, createdAt: true, updatedAt: true },
  });
  if (!design) {
    return NextResponse.json({ success: false, error: "AdDesign not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: design });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const design = await prisma.adDesign.findUnique({ where: { id } });
  if (!design) {
    return NextResponse.json({ success: false, error: "AdDesign not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, note, state } = body;
  const data: { name?: string; note?: string | null; state?: object } = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "name must be non-empty string" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (note !== undefined) data.note = typeof note === "string" ? (note.trim() || null) : null;
  if (state !== undefined) data.state = state as object;

  const updated = await prisma.adDesign.update({
    where: { id },
    data,
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const design = await prisma.adDesign.findUnique({ where: { id } });
  if (!design) {
    return NextResponse.json({ success: false, error: "AdDesign not found" }, { status: 404 });
  }

  await prisma.adDesign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
