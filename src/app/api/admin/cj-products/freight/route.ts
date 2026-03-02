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

const COUNTRY_FLAG: Record<string, string> = {
  CN: "🇨🇳", US: "🇺🇸", HK: "🇭🇰", DE: "🇩🇪", GB: "🇬🇧",
  AU: "🇦🇺", JP: "🇯🇵", KR: "🇰🇷", FR: "🇫🇷", CA: "🇨🇦",
};
const COUNTRY_NAME: Record<string, string> = {
  CN: "China", US: "USA", HK: "Hong Kong", DE: "Germany", GB: "UK",
  AU: "Australia", JP: "Japan", KR: "Korea", FR: "France", CA: "Canada",
};

// Resolve warehouse country code from CJ response fields, fallback to name inference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveWarehouse(opt: any): string {
  // CJ may return startCountryCode, warehouseType, or warehouse info in logisticName
  const code: string =
    opt.startCountryCode ??
    opt.warehouseCode ??
    opt.warehouseType ??
    "";
  if (code && code.length === 2) return code.toUpperCase();
  // Fallback: infer from logistic name
  const n = (opt.logisticName ?? "").toLowerCase();
  if (n.includes("us ") || n.includes("usa") || n.startsWith("us")) return "US";
  if (n.includes("hk") || n.includes("hong kong")) return "HK";
  if (n.includes("de") || n.includes("germany")) return "DE";
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
  const vid = request.nextUrl.searchParams.get("vid"); // first variant vid
  if (!pid) return NextResponse.json({ success: false, error: "pid required" }, { status: 400 });

  // Retry up to 4 times with 1.5s between attempts
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));

    try {
      const token = await getCJToken();
      const res = await fetch(`${CJ_BASE}/logistic/freightCalculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
        body: JSON.stringify({
          startCountryCode: "CN",
          endCountryCode: "TH",
          quantity: 1,
          weight: 0.3,
          pid,
          // CJ requires vid or variantSku inside products array
          ...(vid ? { products: [{ vid, quantity: 1 }] } : {}),
        }),
      });
      const data = await res.json();

      if (!data.result) {
        const msg: string = data.message ?? "";
        // Rate limit — retry
        if (msg.toLowerCase().includes("too many") && attempt < 3) continue;
        // Other API error (not rate limit) — return failure
        console.warn(`[CJ Freight] pid=${pid} attempt=${attempt} error: ${msg}`);
        return NextResponse.json({ success: false, error: msg || "CJ freight API error" }, { status: 502 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawOptions: any[] = Array.isArray(data.data) ? data.data : [];
      const shippingOptions = rawOptions.map((opt) => {
        const warehouseCode = resolveWarehouse(opt);
        const deliveryTimeStr = opt.logisticTime ?? opt.ageTime ?? "";
        return {
          logisticName: opt.logisticName ?? "",
          priceUSD: Number(opt.logisticPrice ?? 0),
          deliveryTime: deliveryTimeStr,
          deliveryDays: parseDeliveryDays(deliveryTimeStr),
          warehouseCode,
          warehouseFlag: COUNTRY_FLAG[warehouseCode] ?? "🌐",
          warehouseName: COUNTRY_NAME[warehouseCode] ?? warehouseCode,
          hasTracking: isTracked(opt.logisticName ?? ""),
        };
      });

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

  // All retries exhausted (rate limit persisted) — return explicit failure
  return NextResponse.json({ success: false, error: "CJ rate limit — ลองอีกครั้ง" }, { status: 429 });
}
