import { NextRequest, NextResponse } from "next/server";
import { getCJProductDetail, getCJFreight } from "@/lib/cjDropshipping";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

function parseDeliveryDays(s: string): { min: number; max: number } | null {
  const match = s.match(/(\d+)(?:\s*[-~]\s*(\d+))?/);
  if (!match) return null;
  const min = parseInt(match[1]);
  const max = match[2] ? parseInt(match[2]) : min;
  return { min, max };
}

function inferWarehouseType(name: string): "CN" | "US" | "LOCAL" {
  const n = name.toLowerCase();
  if (n.includes("us") || n.includes("usa")) return "US";
  return "CN";
}

function isTracked(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("epacket") || n.includes("cjpacket") || n.includes("cj packet");
}

// GET /api/admin/cj-products/detail?pid=xxx
// Returns full product detail + insight combined
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const pid = request.nextUrl.searchParams.get("pid");
  if (!pid) return NextResponse.json({ success: false, error: "pid required" }, { status: 400 });

  try {
    const [detail, freight] = await Promise.all([
      getCJProductDetail(pid),
      getCJFreight(pid, 1),
    ]);

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

    // Insight
    const totalStock = detail.variants.reduce((sum, v) => sum + (v.inventoryNum ?? 0), 0);
    const shippingOptions = freight.map((opt) => ({
      logisticName: opt.logisticName,
      priceUSD: opt.logisticPrice,
      deliveryTime: opt.deliveryTime,
      deliveryDays: parseDeliveryDays(opt.deliveryTime),
      warehouseType: inferWarehouseType(opt.logisticName),
      hasTracking: isTracked(opt.logisticName),
    }));

    const hasStock = totalStock > 100;
    const hasFastShipping = shippingOptions.some((o) => o.deliveryDays !== null && o.deliveryDays.min < 10);
    const hasTrackingShipping = shippingOptions.some((o) => o.hasTracking);
    const isRecommended = hasStock && hasFastShipping && hasTrackingShipping;

    // Best shipping option for display + auto-fill
    const withDays = shippingOptions.filter((o) => o.deliveryDays !== null);
    const tracked = withDays.filter((o) => o.hasTracking);
    const pool = tracked.length > 0 ? tracked : withDays;
    const bestShipping = pool.length > 0
      ? pool.reduce((a, b) => (a.deliveryDays!.min <= b.deliveryDays!.min ? a : b))
      : null;

    return NextResponse.json({
      success: true,
      data: {
        pid: detail.pid,
        productNameEn: detail.productNameEn,
        description: detail.description ?? "",
        categoryName: detail.categoryName,
        images,
        variants,
        insight: {
          totalStock,
          shippingOptions,
          badges: { hasStock, hasFastShipping, hasTracking: hasTrackingShipping },
          isRecommended,
          bestShipping,
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch detail";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
