import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { ProductValidationStatus } from "@/generated/prisma/client";

const VALID_STATUSES = Object.values(ProductValidationStatus);

/** GET - List all supplier products (across all suppliers) */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId");
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const PAGE_SIZE = 50;

  const where: { supplierId?: string; validationStatus?: ProductValidationStatus; OR?: object[] } = {};
  if (supplierId) where.supplierId = supplierId;
  if (status && VALID_STATUSES.includes(status as ProductValidationStatus)) {
    where.validationStatus = status as ProductValidationStatus;
  }
  if (search.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { name_th: { contains: search.trim(), mode: "insensitive" } },
      { supplierSku: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const orderBy =
    sort === "oldest" ? { createdAt: "asc" as const } :
    sort === "name_asc" ? { name: "asc" as const } :
    sort === "name_desc" ? { name: "desc" as const } :
    sort === "price_asc" ? { supplierPrice: "asc" as const } :
    sort === "price_desc" ? { supplierPrice: "desc" as const } :
    { createdAt: "desc" as const };

  const [list, total] = await Promise.all([
    prisma.supplierProduct.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, nameTh: true, imageUrl: true } },
        category: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.supplierProduct.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: list, total, page, pageSize: PAGE_SIZE });
}
