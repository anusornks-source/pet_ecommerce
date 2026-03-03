import { prisma } from "@/lib/prisma";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export interface CJListItem {
  pid: string;
  productNameEn: string;
  productImage: string;
  sellPrice: number;
  categoryName: string;
  inventoryNum?: number;
  productSales?: number;
  productRating?: number;
  productVideoSet?: string[];
  productImageSet?: string[];
}

export interface CJVariantDetail {
  vid: string;
  variantSku: string;
  variantSellPrice: number;   // actual CJ field (was variantPrice)
  inventoryNum: number | null; // actual CJ field (was variantStock)
  variantProperty: string;    // often "[]" — use variantKey instead
  variantKey: string;         // e.g. "Yellow-XS", "Purple-S"
  variantImage?: string;
}

export interface CJProductDetail {
  pid: string;
  productNameEn: string;
  description: string;
  productImageSet: string[]; // actual CJ field (was productImages)
  productImage: string;      // JSON string of array (fallback)
  productKeyEn: string;      // e.g. "Color-Size" — guides variant parsing
  categoryName: string;
  variants: CJVariantDetail[];
}

export async function searchCJProducts(keyword: string, page = 1): Promise<{ list: CJListItem[]; total: number }> {
  const token = await getCJToken();
  const params = new URLSearchParams({ pageNum: String(page), pageSize: "100", productNameEn: keyword });
  const res = await fetch(`${CJ_BASE}/product/list?${params}`, {
    headers: { "CJ-Access-Token": token },
  });
  const data = await res.json();
  if (!data.result) throw new Error(data.message || "CJ search failed");
  return { list: data.data?.list ?? [], total: data.data?.total ?? 0 };
}

// CJ sends vid as a large integer (>53-bit) — parse as text first to preserve precision
function parseCJJson(text: string) {
  // Convert numeric vid values to strings before JSON.parse to avoid float rounding
  const safe = text.replace(/"vid"\s*:\s*(\d{10,})/g, '"vid":"$1"');
  return JSON.parse(safe);
}

export async function getCJProductDetail(pid: string): Promise<CJProductDetail> {
  const token = await getCJToken();
  const res = await fetch(`${CJ_BASE}/product/query?pid=${pid}`, {
    headers: { "CJ-Access-Token": token },
  });
  const data = parseCJJson(await res.text());
  if (!data.result || !data.data) throw new Error(data.message || "CJ product not found");
  return data.data as CJProductDetail;
}

// Returns a map of { vid -> stock } for the given variant IDs
// Queries in chunks of 5 to stay within CJ API limits
export async function getCJInventory(vids: string[]): Promise<Record<string, number>> {
  if (vids.length === 0) return {};
  const unique = [...new Set(vids)];
  const map: Record<string, number> = {};

  try {
    const token = await getCJToken();
    // CJ API only supports single vid per request; retry with backoff on failure
    const delays = [150, 500, 1000]; // ms between retries
    for (const vid of unique) {
      let success = false;
      for (let attempt = 0; attempt < delays.length && !success; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, delays[attempt]));
        const res = await fetch(`${CJ_BASE}/product/stock/queryByVid?vid=${vid}`, {
          headers: { "CJ-Access-Token": token },
        });
        const data = parseCJJson(await res.text());
        if (data.result && Array.isArray(data.data)) {
          for (const item of data.data) {
            const stock = item.storageNum ?? item.totalInventoryNum ?? item.quantity ?? item.remainNum ?? 0;
            const itemVid = item.vid ?? item.variantId ?? item.skuId;
            if (itemVid) map[itemVid] = stock;
          }
          success = true;
        }
      }
      await new Promise((r) => setTimeout(r, 150)); // base delay between vids
    }
  } catch (err) {
    console.error("[CJ Inventory] error:", err);
  }

  return map;
}

export async function getCJToken(): Promise<string> {
  // Check DB for a valid cached token (persists across serverless instances)
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (
    settings?.cjAccessToken &&
    settings.cjTokenExpiresAt &&
    settings.cjTokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)
  ) {
    return settings.cjAccessToken;
  }

  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) throw new Error("CJ_API_KEY is not configured in .env");

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  const data = await res.json();

  if (!data.result || !data.data?.accessToken) {
    throw new Error(`CJ Auth failed: ${data.message || JSON.stringify(data)}`);
  }

  const token = data.data.accessToken as string;
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days (token valid 15 days)

  // Save to DB so all serverless instances share the same token
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", cjAccessToken: token, cjTokenExpiresAt: expiresAt },
    update: { cjAccessToken: token, cjTokenExpiresAt: expiresAt },
  });

  return token;
}

interface CJProduct {
  vid: string;
  quantity: number;
}

interface CJOrderInput {
  orderNumber: string;
  shippingCustomerName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingCountry: string;
  shippingCountryCode: string;
  shippingZip: string;
  logisticName: string;
  products: CJProduct[];
  remark?: string;
}

export async function createCJOrder(input: CJOrderInput, orderId?: string): Promise<{ cjOrderId: string }> {
  const token = await getCJToken();
  const logisticName = process.env.CJ_LOGISTIC_NAME || "CJPACKET";

  const body = {
    orderNumber: input.orderNumber,
    shippingCountry: input.shippingCountry || "Thailand",
    shippingCountryCode: input.shippingCountryCode || "TH",
    shippingProvince: input.shippingProvince || "",
    shippingCity: input.shippingCity || "",
    shippingAddress: input.shippingAddress,
    shippingCustomerName: input.shippingCustomerName,
    shippingPhone: input.shippingPhone,
    shippingZip: input.shippingZip || "",
    logisticName: input.logisticName || logisticName,
    products: input.products,
    remark: input.remark || "",
    fromCountryCode: "CN",
    payType: 2,
  };

  const res = await fetch(`${CJ_BASE}/shopping/order/createOrderV2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  // Log API call (best-effort — never blocks order flow)
  try {
    await prisma.cjApiLog.create({
      data: {
        orderId: orderId ?? null,
        action: "createOrder",
        request: body as object,
        response: data as object,
        success: !!data.result,
        error: data.result ? null : (data.message ?? JSON.stringify(data)),
      },
    });
  } catch { /* swallow log errors */ }

  // Order created but balance insufficient — orderId exists, treat as partial success
  if (!data.result && data.data?.orderId) {
    return { cjOrderId: data.data.orderId as string, warning: data.message } as { cjOrderId: string; warning?: string };
  }

  if (!data.result || !data.data?.orderId) {
    throw new Error(`CJ createOrder failed: ${data.message || JSON.stringify(data)}`);
  }

  return { cjOrderId: data.data.orderId as string };
}

export interface CJFreightOption {
  logisticName: string;
  logisticPrice: number; // USD
  deliveryTime: string;
}

// Returns freight options for a CJ product shipped CN→TH
// weightKg defaults to 0.3 kg per unit × quantity (rough estimate for small pet products)
export async function getCJFreight(
  pid: string,
  quantity: number,
  weightKgPerUnit = 0.3
): Promise<CJFreightOption[]> {
  try {
    const token = await getCJToken();
    const res = await fetch(`${CJ_BASE}/logistic/freightCalculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
      body: JSON.stringify({
        startCountryCode: "CN",
        endCountryCode: "TH",
        quantity,
        weight: Math.max(0.1, weightKgPerUnit * quantity),
        pid,
      }),
    });
    const data = await res.json();
    if (!data.result || !Array.isArray(data.data)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data as any[]).map((opt) => ({
      logisticName: opt.logisticName ?? "",
      logisticPrice: Number(opt.logisticPrice ?? 0),
      deliveryTime: opt.logisticAging ?? opt.logisticTime ?? opt.ageTime ?? opt.deliveryTime ?? opt.estimatedDeliveryTime ?? opt.shippingTime ?? opt.days ?? "",
    }));
  } catch {
    return [];
  }
}

// Cancels a CJ order (only works for orders in CREATED/UNPAID status)
// Returns { success, message }
export async function cancelCJOrder(cjOrderId: string, orderId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getCJToken();
    const reqBody = { orderId: cjOrderId };

    const res = await fetch(`${CJ_BASE}/shopping/order/deleteOrder`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
      body: JSON.stringify(reqBody),
    });
    const data = await res.json();

    // Log API call (best-effort)
    try {
      await prisma.cjApiLog.create({
        data: {
          orderId: orderId ?? null,
          action: "cancelOrder",
          request: reqBody as object,
          response: data as object,
          success: !!data.result,
          error: data.result ? null : (data.message ?? JSON.stringify(data)),
        },
      });
    } catch { /* swallow */ }

    return {
      success: !!data.result,
      message: data.message ?? (data.result ? "ยกเลิกสำเร็จ" : "ยกเลิกไม่สำเร็จ"),
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function getCJOrderStatus(cjOrderId: string): Promise<string | null> {
  try {
    const token = await getCJToken();

    const res = await fetch(`${CJ_BASE}/shopping/order/getOrderDetail?orderId=${cjOrderId}`, {
      headers: { "CJ-Access-Token": token },
    });

    const data = await res.json();
    return data.data?.orderStatus ?? null;
  } catch {
    return null;
  }
}

export interface CJTrackingInfo {
  cjStatus: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
}

// Fetches latest CJ order status + tracking number from CJ order detail API
export async function getCJTrackingInfo(cjOrderId: string, orderId?: string): Promise<CJTrackingInfo> {
  try {
    const token = await getCJToken();
    const res = await fetch(`${CJ_BASE}/shopping/order/getOrderDetail?orderId=${cjOrderId}`, {
      headers: { "CJ-Access-Token": token },
    });
    const data = await res.json();

    // Log API call (best-effort)
    try {
      await prisma.cjApiLog.create({
        data: {
          orderId: orderId ?? null,
          action: "syncTracking",
          request: { cjOrderId } as object,
          response: data as object,
          success: !!data.result,
          error: data.result ? null : (data.message ?? null),
        },
      });
    } catch { /* swallow */ }

    if (!data.result || !data.data) return { cjStatus: null, trackingNumber: null, trackingCarrier: null };

    const order = data.data;
    return {
      cjStatus: order.orderStatus ?? null,
      trackingNumber: order.trackingNumber ?? order.trackingId ?? null,
      trackingCarrier: order.logisticName ?? order.shippingCarrier ?? null,
    };
  } catch {
    return { cjStatus: null, trackingNumber: null, trackingCarrier: null };
  }
}
