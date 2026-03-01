import { prisma } from "@/lib/prisma";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export interface CJListItem {
  pid: string;
  productNameEn: string;
  productImage: string;
  sellPrice: number;
  categoryName: string;
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
  const params = new URLSearchParams({ pageNum: String(page), pageSize: "20", productNameEn: keyword });
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
    console.log("[CJ Inventory] map:", map);
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

export async function createCJOrder(input: CJOrderInput): Promise<{ cjOrderId: string }> {
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
    payType: 2, // use CJ balance
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

  if (!data.result || !data.data?.orderId) {
    throw new Error(`CJ createOrder failed: ${data.message || JSON.stringify(data)}`);
  }

  return { cjOrderId: data.data.orderId as string };
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
