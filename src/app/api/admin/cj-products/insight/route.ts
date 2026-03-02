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

// GET /api/admin/cj-products/insight?pid=xxx
// Returns stock + shipping insight + badge evaluation for a CJ product
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
    const hasFastShipping = shippingOptions.some(
      (o) => o.deliveryDays !== null && o.deliveryDays.min < 10
    );
    const hasTrackingShipping = shippingOptions.some((o) => o.hasTracking);
    const isRecommended = hasStock && hasFastShipping && hasTrackingShipping;

    return NextResponse.json({
      success: true,
      data: {
        totalStock,
        variantCount: detail.variants.length,
        shippingOptions,
        badges: { hasStock, hasFastShipping, hasTracking: hasTrackingShipping },
        isRecommended,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch insight";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
