import { NextRequest, NextResponse } from "next/server";
import { getCJToken } from "@/lib/cjDropshipping";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

function parseDeliveryDays(s: string): { min: number; max: number } | null {
  const match = s.match(/(\d+)(?:\s*[-~]\s*(\d+))?/);
  if (!match) return null;
  const min = parseInt(match[1]);
  const max = match[2] ? parseInt(match[2]) : min;
  return { min, max };
}

function inferWarehouseType(name: string): "CN" | "US" {
  const n = name.toLowerCase();
  if (n.includes("us") || n.includes("usa")) return "US";
  return "CN";
}

function isTracked(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("epacket") || n.includes("cjpacket") || n.includes("cj packet");
}

// GET /api/admin/cj-products/freight?pid=xxx
// Fetches CJ freight options with retry on rate-limit
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const pid = request.nextUrl.searchParams.get("pid");
  if (!pid) return NextResponse.json({ success: false, error: "pid required" }, { status: 400 });

  // Retry up to 4 times with 1.5s between attempts
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));

    try {
      const token = await getCJToken();
      const res = await fetch(`${CJ_BASE}/logistic/freightCalculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
        body: JSON.stringify({ startCountryCode: "CN", endCountryCode: "TH", quantity: 1, weight: 0.3, pid }),
      });
      const data = await res.json();

      if (!data.result) {
        const msg: string = data.message ?? "";
        // Rate limit — retry
        if (msg.toLowerCase().includes("too many") && attempt < 3) continue;
        // Other error or final attempt — return empty
        console.warn(`[CJ Freight] pid=${pid} attempt=${attempt} error: ${msg}`);
        return NextResponse.json({ success: true, data: { shippingOptions: [], bestShipping: null, badges: { hasStock: false, hasFastShipping: false, hasTracking: false } } });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawOptions: any[] = Array.isArray(data.data) ? data.data : [];
      const shippingOptions = rawOptions.map((opt) => ({
        logisticName: opt.logisticName ?? "",
        priceUSD: Number(opt.logisticPrice ?? 0),
        deliveryTime: opt.logisticTime ?? opt.ageTime ?? "",
        deliveryDays: parseDeliveryDays(opt.logisticTime ?? opt.ageTime ?? ""),
        warehouseType: inferWarehouseType(opt.logisticName ?? ""),
        hasTracking: isTracked(opt.logisticName ?? ""),
      }));

      const hasFastShipping = shippingOptions.some((o) => o.deliveryDays !== null && o.deliveryDays.min < 10);
      const hasTracking = shippingOptions.some((o) => o.hasTracking);

      const withDays = shippingOptions.filter((o) => o.deliveryDays !== null);
      const tracked = withDays.filter((o) => o.hasTracking);
      const pool = tracked.length > 0 ? tracked : withDays;
      const bestShipping = pool.length > 0
        ? pool.reduce((a, b) => (a.deliveryDays!.min <= b.deliveryDays!.min ? a : b))
        : null;

      return NextResponse.json({
        success: true,
        data: {
          shippingOptions,
          bestShipping,
          badges: { hasFastShipping, hasTracking },
        },
      });
    } catch (err) {
      console.error(`[CJ Freight] attempt=${attempt}`, err);
      if (attempt === 3) break;
    }
  }

  return NextResponse.json({ success: true, data: { shippingOptions: [], bestShipping: null, badges: { hasFastShipping: false, hasTracking: false } } });
}
