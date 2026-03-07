import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function PUT(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: "ids required" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id: string, i: number) =>
      prisma.heroBanner.updateMany({ where: { id, shopId }, data: { order: i } })
    )
  );

  return NextResponse.json({ success: true });
}
