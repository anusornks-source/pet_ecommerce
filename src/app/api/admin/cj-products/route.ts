import { NextRequest, NextResponse } from "next/server";
import { Prisma, FulfillmentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";
import { searchCJProducts, getCJProductDetail, getCJProductDetailBySku, getCJInventory } from "@/lib/cjDropshipping";
import Anthropic from "@anthropic-ai/sdk";

async function generateShortDesc(name: string, sourceDescription: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const clean = sourceDescription.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `คุณเป็นนักเขียนคอนเทนต์ร้านขายของออนไลน์ภาษาไทย\n\nชื่อสินค้า: ${name}\nรายละเอียด: ${clean}\n\nเขียนคำอธิบายสั้นๆ ภาษาไทย ไม่เกิน 2-3 ประโยค (ไม่เกิน 120 ตัวอักษร) เน้นจุดเด่นหลัก ตอบเป็น plain text เท่านั้น`,
      }],
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return text || null;
  } catch {
    return null;
  }
}

// GET /api/admin/cj-products?keyword=xxx&page=1
// GET /api/admin/cj-products?pid=xxx  — lookup by PID directly
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const pid = request.nextUrl.searchParams.get("pid") ?? "";
  const sku = request.nextUrl.searchParams.get("sku") ?? "";
  const keyword = request.nextUrl.searchParams.get("keyword") ?? "";
  // CJ API max offset = 6000, pageSize = 100 → max page 60
  const page = Math.min(60, Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1")));

  // Helper: turn a CJProductDetail into a list item
  const detailToItem = (detail: Awaited<ReturnType<typeof getCJProductDetail>>) => ({
    pid: detail.pid,
    productNameEn: detail.productNameEn,
    productImage: Array.isArray(detail.productImageSet) && detail.productImageSet.length > 0
      ? detail.productImageSet[0]
      : detail.productImage,
    sellPrice: detail.variants?.[0]?.variantSellPrice ?? 0,
    categoryName: detail.categoryName,
  });

  // PID lookup mode — fetch product detail and return as single-item list
  if (pid.trim()) {
    try {
      const detail = await getCJProductDetail(pid.trim());
      return NextResponse.json({ success: true, data: { list: [detailToItem(detail)], total: 1 } });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: err instanceof Error ? err.message : "PID not found",
      });
    }
  }

  // Variant SKU lookup mode — uses /product/query?variantSku=xxx
  if (sku.trim()) {
    try {
      const detail = await getCJProductDetailBySku(sku.trim());
      return NextResponse.json({ success: true, data: { list: [detailToItem(detail)], total: 1 } });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: err instanceof Error ? err.message : "SKU not found",
      });
    }
  }

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
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { pid, categoryId, petTypeId, priceFactor = 3, usdToThb = 36, fallbackCostUSD = 0, deliveryDays, warehouseCountry } = await request.json();

  if (!pid || !categoryId) {
    return NextResponse.json({ success: false, error: "pid และ categoryId จำเป็น" }, { status: 400 });
  }

  try {
    const detail = await getCJProductDetail(pid);

    // sourceDescription = original CJ HTML (keep for admin reference)
    // description starts empty — admin fills in Thai-friendly copy
    const sourceDescription = detail.description ?? "";

    // Use productImageSet (array) as primary source; fallback: parse productImage JSON string
    let allImages: string[] = [];
    if (Array.isArray(detail.productImageSet) && detail.productImageSet.length > 0) {
      allImages = detail.productImageSet;
    } else if (typeof detail.productImage === "string" && detail.productImage.startsWith("[")) {
      try { allImages = JSON.parse(detail.productImage); } catch { allImages = []; }
    }

    // Fetch CJ inventory for all variant vids (best-effort — falls back to 0 if unavailable)
    const vids = (detail.variants ?? []).map((v) => v.vid).filter(Boolean);
    const inventoryMap = await getCJInventory(vids);

    // Fetch display stock range from settings
    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    const displayStockMin = settings?.displayStockMin ?? 50;
    const displayStockMax = settings?.displayStockMax ?? 100;
    const randomStock = () => Math.floor(Math.random() * (displayStockMax - displayStockMin + 1)) + displayStockMin;

    // productKeyEn tells us the attribute order, e.g. "Color-Size" or "Size" or "Color"
    const keyOrder = (detail.productKeyEn ?? "").toLowerCase().split("-");

    // Parse variants — variantSellPrice from CJ is in USD
    const variants = (detail.variants ?? []).map((v) => {
      // variantKey = "Yellow-XS", "Purple-S" etc. Split and map using keyOrder
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

      // Fallback: if still empty, use raw variantKey as size label
      if (!size && !color && v.variantKey) size = v.variantKey;

      // Parse CJ variantProperty JSON → [{name, value}] attributes
      let attributes: { name: string; value: string }[] | null = null;
      try {
        const props = JSON.parse(v.variantProperty || "[]");
        if (Array.isArray(props) && props.length > 0) {
          const parsed = props
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((p: any) => ({
              name: String(p.property ?? p.name ?? "").trim(),
              value: String(p.propertyValue ?? p.value ?? "").trim(),
            }))
            .filter((a) => a.name && a.value);
          if (parsed.length > 0) attributes = parsed;
        }
      } catch { /* ignore */ }

      // Use fallbackCostUSD if variantSellPrice is 0 or missing
      const costUSD = v.variantSellPrice || fallbackCostUSD;
      return {
        size,
        color,
        price: Math.ceil(costUSD * usdToThb * priceFactor), // sell price in THB
        stock: randomStock(), // display stock shown to customers
        cjStock: inventoryMap[v.vid] ?? v.inventoryNum ?? null, // real CJ warehouse stock
        sku: v.variantSku ?? null,
        cjVid: v.vid,
        variantImage: v.variantImage ?? null,
        attributes: attributes ?? Prisma.JsonNull,
        fulfillmentMethod: FulfillmentMethod.CJ,
        costUSD,
      };
    });

    const costPriceUSD = variants[0]?.costUSD || fallbackCostUSD;
    const sellPrice = variants[0]?.price || Math.ceil(costPriceUSD * usdToThb * priceFactor);

    const variantData = variants.map(({ costUSD: _c, ...rest }) => rest);

    // Generate short description with AI (best-effort, non-blocking)
    const shortDescription = await generateShortDesc(detail.productNameEn, sourceDescription);

    const product = await prisma.product.create({
      data: {
        name: detail.productNameEn,
        description: sourceDescription,
        shortDescription,
        sourceDescription,
        price: sellPrice,
        normalPrice: sellPrice,
        stock: variantData.reduce((s, v) => s + (v.stock as number), 0),
        images: allImages,
        shopId,
        categoryId,
        petTypeId: petTypeId || null,
        active: false,
        cjProductId: detail.pid,
        costPrice: costPriceUSD,
        source: "CJ",
        fulfillmentMethod: FulfillmentMethod.CJ,
        sourceData: detail as object,
        ...(deliveryDays !== undefined && { deliveryDays: Number(deliveryDays) }),
        ...(warehouseCountry && { warehouseCountry: String(warehouseCountry) }),
        variants: variantData.length > 0 ? { create: variantData } : undefined,
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
