import { NextRequest, NextResponse } from "next/server";
import { getCJProductDetail, getCJToken } from "@/lib/cjDropshipping";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

// Direct freight fetch that THROWS on error (unlike getCJFreight which swallows)
async function fetchFreightOrThrow(pid: string) {
  const token = await getCJToken();
  const res = await fetch(`${CJ_BASE}/logistic/freightCalculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
    body: JSON.stringify({ startCountryCode: "CN", endCountryCode: "TH", quantity: 1, weight: 0.3, pid }),
  });
  const data = await res.json();
  if (!data.result) throw new Error(data.message || "CJ freight failed");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(data.data) ? data.data : []) as any[];
}

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

  // Retry helper — CJ enforces QPS 1/sec; retry on rate-limit response
  async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (i < retries - 1 && msg.toLowerCase().includes("too many")) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Max retries exceeded");
  }

  try {
    // Sequential with retry — CJ rate limit is 1 req/sec
    const detail = await withRetry(() => getCJProductDetail(pid));
    await new Promise((r) => setTimeout(r, 1100));
    // Use fetchFreightOrThrow so retry catches rate-limit errors (getCJFreight swallows them)
    const freightRaw = await withRetry(() => fetchFreightOrThrow(pid)).catch(() => []);
    const freight = freightRaw.map((opt) => ({
      logisticName: opt.logisticName ?? "",
      logisticPrice: Number(opt.logisticPrice ?? 0),
      deliveryTime: opt.logisticTime ?? opt.ageTime ?? "",
    }));

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
