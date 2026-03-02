import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { ids } = await request.json();
  if (!Array.isArray(ids)) {
    return NextResponse.json({ success: false, error: "ids required" }, { status: 400 });
  }

  await Promise.all(
    ids.map((id: string, index: number) =>
      prisma.shelf.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ success: true });
}
