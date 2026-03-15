import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductValidationStatus } from "@/generated/prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id, active: true, validationStatus: ProductValidationStatus.Approved },
    include: {
      category: true,
      petType: true,
      variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
      tags: true,
    },
  });

  if (!product) {
    return NextResponse.json(
      { success: false, error: "ไม่พบสินค้า" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: product });
}
