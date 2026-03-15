import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import { ProductValidationStatus } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId, payload } = auth;
  const isAdmin = payload.role === "ADMIN";

  const body = await request.json();
  const { productIds, validationStatus } = body;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "productIds ต้องเป็น array ที่ไม่ว่าง" },
      { status: 400 }
    );
  }

  const validStatuses = Object.values(ProductValidationStatus);
  if (!validationStatus || !validStatuses.includes(validationStatus as ProductValidationStatus)) {
    return NextResponse.json(
      { success: false, error: "validationStatus ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const where = isAdmin ? { id: { in: productIds } } : { id: { in: productIds }, shopId };
  const { count } = await prisma.product.updateMany({
    where,
    data: { validationStatus: validationStatus as ProductValidationStatus },
  });

  return NextResponse.json({ success: true, data: { updated: count } });
}
