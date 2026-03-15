import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import { ProductValidationStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { searchParams } = new URL(request.url);
  const filterShopId = searchParams.get("shopId") || "";

  const where =
    shopId === "all"
      ? filterShopId ? { shopId: filterShopId } : {}
      : { shopId };

  const counts = await prisma.product.groupBy({
    by: ["validationStatus"],
    where,
    _count: { id: true },
  });

  const stats: Record<string, number> = {
    [ProductValidationStatus.Lead]: 0,
    [ProductValidationStatus.Qualified]: 0,
    [ProductValidationStatus.Approved]: 0,
    [ProductValidationStatus.Rejected]: 0,
  };
  counts.forEach((r) => {
    stats[r.validationStatus] = r._count.id;
  });

  return NextResponse.json({ success: true, data: stats });
}
