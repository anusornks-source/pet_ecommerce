import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  const pack = await prisma.productMarketingPack.findUnique({
    where: { id },
    include: {
      product: {
        select: { name: true, name_th: true, images: true, price: true, category: { select: { name: true } } },
      },
    },
  });

  if (!pack) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: pack });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  await prisma.productMarketingPack.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
