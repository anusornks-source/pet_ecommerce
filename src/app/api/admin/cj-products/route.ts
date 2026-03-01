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

  const { pid, categoryId, petType, priceFactor = 3, usdToThb = 36 } = await request.json();

  if (!pid || !categoryId) {
    return NextResponse.json({ success: false, error: "pid และ categoryId จำเป็น" }, { status: 400 });
  }

  try {
    const detail = await getCJProductDetail(pid);

    // Extract images embedded in description HTML, strip <img> tags
    const { cleaned: description, urls: descImages } = extractImgUrls(detail.description ?? "");

    // Merge CJ productImages + description images (deduplicated)
    const existingImages = new Set(detail.productImages ?? []);
    const allImages = [
      ...(detail.productImages ?? []),
      ...descImages.filter((u) => !existingImages.has(u)),
    ];

    // Parse variants — variantPrice from CJ is in USD
    const variants = (detail.variants ?? []).map((v) => {
      const props: Record<string, string> = {};
      (v.variantProperty ?? "").split(";").forEach((part) => {
        const [key, val] = part.split(":");
        if (key && val) props[key.trim().toLowerCase()] = val.trim();
      });
      const costUSD = v.variantPrice ?? 0;
      return {
        size: props["size"] ?? null,
        color: props["color"] ?? null,
        price: Math.ceil(costUSD * usdToThb * priceFactor), // sell price in THB
        stock: v.variantStock ?? 0,
        sku: v.variantSku ?? null,
        cjVid: v.vid,
        costUSD, // keep for reference (not in schema, just for calculation)
      };
    });

    const costPriceUSD = variants[0]?.costUSD ?? 0;
    const sellPrice = variants[0]?.price ?? Math.ceil(costPriceUSD * usdToThb * priceFactor);

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
