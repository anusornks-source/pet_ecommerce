import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { searchCJProducts, getCJProductDetail } from "@/lib/cjDropshipping";

// Extract <img src="..."> URLs from HTML and return cleaned text + image URLs
function extractImgUrls(html: string): { cleaned: string; urls: string[] } {
  const urls: string[] = [];
  const cleaned = html.replace(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi, (_, src) => {
    urls.push(src);
    return "";
  });
  return { cleaned: cleaned.trim(), urls };
}

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

  const { pid, categoryId, petType, priceFactor = 3, usdToThb = 36, fallbackCostUSD = 0 } = await request.json();

  if (!pid || !categoryId) {
    return NextResponse.json({ success: false, error: "pid และ categoryId จำเป็น" }, { status: 400 });
  }

  try {
    const detail = await getCJProductDetail(pid);

    // Extract images embedded in description HTML, strip <img> tags
    const { cleaned: description, urls: descImages } = extractImgUrls(detail.description ?? "");

    // Use productImageSet (array) as primary source; fallback: parse productImage JSON string
    let mainImages: string[] = [];
    if (Array.isArray(detail.productImageSet) && detail.productImageSet.length > 0) {
      mainImages = detail.productImageSet;
    } else if (typeof detail.productImage === "string" && detail.productImage.startsWith("[")) {
      try { mainImages = JSON.parse(detail.productImage); } catch { mainImages = []; }
    }

    // Merge main images + description images (deduplicated)
    const existingImages = new Set(mainImages);
    const allImages = [
      ...mainImages,
      ...descImages.filter((u) => !existingImages.has(u)),
    ];

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

      // Use fallbackCostUSD if variantSellPrice is 0 or missing
      const costUSD = v.variantSellPrice || fallbackCostUSD;
      return {
        size,
        color,
        price: Math.ceil(costUSD * usdToThb * priceFactor), // sell price in THB
        stock: v.inventoryNum ?? 0,
        sku: v.variantSku ?? null,
        cjVid: v.vid,
        costUSD,
      };
    });

    const costPriceUSD = variants[0]?.costUSD || fallbackCostUSD;
    const sellPrice = variants[0]?.price || Math.ceil(costPriceUSD * usdToThb * priceFactor);

    const variantData = variants.map(({ costUSD: _c, ...rest }) => rest);

    const product = await prisma.product.create({
      data: {
        name: detail.productNameEn,
        description,
        price: sellPrice,
        stock: variantData.reduce((s, v) => s + v.stock, 0),
        images: allImages,
        categoryId,
        petType: petType || null,
        active: false,
        cjProductId: detail.pid,
        costPrice: costPriceUSD,
        source: "CJ",
        sourceData: detail as object,
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
