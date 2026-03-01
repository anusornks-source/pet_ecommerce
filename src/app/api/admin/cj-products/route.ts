import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { searchCJProducts, getCJProductDetail } from "@/lib/cjDropshipping";

// GET /api/admin/cj-products?keyword=xxx&page=1
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const keyword = request.nextUrl.searchParams.get("keyword") ?? "";
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1");

  if (!keyword.trim()) {
    return NextResponse.json({ success: true, data: { list: [], total: 0 } });
  }

  try {
    const result = await searchCJProducts(keyword.trim(), page);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Search failed",
    });
  }
}

// POST /api/admin/cj-products — import product to DB
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { pid, categoryId, petType } = await request.json();

  if (!pid || !categoryId) {
    return NextResponse.json({ success: false, error: "pid และ categoryId จำเป็น" }, { status: 400 });
  }

  try {
    const detail = await getCJProductDetail(pid);

    // Parse variants
    const variants = (detail.variants ?? []).map((v) => {
      // variantProperty like "Color:Red;Size:M"
      const props: Record<string, string> = {};
      (v.variantProperty ?? "").split(";").forEach((part) => {
        const [key, val] = part.split(":");
        if (key && val) props[key.trim().toLowerCase()] = val.trim();
      });
      return {
        size: props["size"] ?? null,
        color: props["color"] ?? null,
        price: v.variantPrice ?? 0,
        stock: v.variantStock ?? 0,
        sku: v.variantSku ?? null,
        cjVid: v.vid,
      };
    });

    const product = await prisma.product.create({
      data: {
        name: detail.productNameEn,
        description: detail.description ?? "",
        price: variants[0]?.price ?? 0,
        stock: variants.reduce((s, v) => s + v.stock, 0),
        images: detail.productImages ?? [],
        categoryId,
        petType: petType || null,
        active: false, // ให้ admin ตรวจสอบ+เปิดเอง
        cjProductId: detail.pid,
        variants: variants.length > 0 ? { create: variants } : undefined,
      },
    });

    return NextResponse.json({ success: true, data: { id: product.id, name: product.name } });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Import failed",
    });
  }
}
