import { NextRequest, NextResponse } from "next/server";
import { getCJProductDetail } from "@/lib/cjDropshipping";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

// GET /api/admin/cj-products/detail?pid=xxx
// Returns product detail only (freight is fetched separately by client)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const pid = request.nextUrl.searchParams.get("pid");
  if (!pid) return NextResponse.json({ success: false, error: "pid required" }, { status: 400 });

  try {
    const detail = await getCJProductDetail(pid);

    // Parse images
    let images: string[] = [];
    if (Array.isArray(detail.productImageSet) && detail.productImageSet.length > 0) {
      images = detail.productImageSet;
    } else if (typeof detail.productImage === "string" && detail.productImage.startsWith("[")) {
      try { images = JSON.parse(detail.productImage); } catch { images = []; }
    }

    // Parse variants
    const keyOrder = (detail.productKeyEn ?? "").toLowerCase().split("-");
    const variants = (detail.variants ?? []).map((v) => {
      const keyParts = (v.variantKey ?? "").split("-");
      let size: string | null = null;
      let color: string | null = null;
      if (keyOrder.length > 0 && keyParts.length > 0) {
        keyOrder.forEach((keyName, idx) => {
          const val = keyParts[idx]?.trim() || null;
          if (!val) return;
          if (keyName.includes("color") || keyName.includes("colour")) color = val;
          else if (keyName.includes("size")) size = val;
        });
      }
      if (!size && !color && v.variantKey) size = v.variantKey;
      return {
        vid: v.vid,
        label: [size, color].filter(Boolean).join(" / ") || v.variantKey || "Default",
        priceUSD: v.variantSellPrice,
        stock: v.inventoryNum ?? 0,
        variantImage: v.variantImage ?? null,
      };
    });

    const totalStock = (detail.variants ?? []).reduce((sum, v) => sum + (v.inventoryNum ?? 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        pid: detail.pid,
        productNameEn: detail.productNameEn,
        description: detail.description ?? "",
        categoryName: detail.categoryName,
        images,
        variants,
        totalStock,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch detail";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
