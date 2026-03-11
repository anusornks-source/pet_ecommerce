import { MarketingAssetType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function extractFilenameFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const name = path.split("/").pop();
    return name && name.length > 0 ? decodeURIComponent(name) : null;
  } catch {
    return null;
  }
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PetShop/1.0; +https://petshop)",
  Accept: "image/*",
};

async function fetchImageMetadata(url: string): Promise<{
  contentType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
} | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: FETCH_HEADERS,
    });
    if (!res.ok) return null;
    const contentLength = res.headers.get("content-length");
    const maxBytes = 15 * 1024 * 1024; // 15MB
    if (contentLength && parseInt(contentLength, 10) > maxBytes) return null;
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
    const buf = Buffer.from(await res.arrayBuffer());
    const sizeBytes = buf.length;
    if (sizeBytes > maxBytes) return null;

    let width: number | null = null;
    let height: number | null = null;
    if (contentType && ALLOWED_IMAGE_TYPES.includes(contentType)) {
      try {
        const meta = await sharp(buf).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      } catch {
        // ignore
      }
    }
    return { contentType, sizeBytes, width, height };
  } catch {
    return null;
  }
}

/**
 * Sync product images (and optionally variant images) to MarketingAsset.
 * Creates MarketingAsset records for URLs that don't already exist for this product.
 * Fetches metadata (contentType, size, dimensions) when possible for display consistency.
 */
export async function syncProductImagesToMarketingAssets(
  productId: string,
  shopId: string,
  imageUrls: string[]
): Promise<{ created: number; skipped: number }> {
  const urls = [...new Set(imageUrls)].filter((u) => typeof u === "string" && u.trim().length > 0);
  if (urls.length === 0) return { created: 0, skipped: 0 };

  const existing = await prisma.marketingAsset.findMany({
    where: { productId, url: { in: urls } },
    select: { url: true },
  });
  const existingUrls = new Set(existing.map((e) => e.url));
  const toCreate = urls.filter((u) => !existingUrls.has(u));

  if (toCreate.length === 0) return { created: 0, skipped: urls.length };

  const results = await Promise.allSettled(
    toCreate.map(async (url) => {
      const meta = await fetchImageMetadata(url);
      const filename = meta ? extractFilenameFromUrl(url) : null;
      return {
        url,
        type: MarketingAssetType.IMAGE,
        productId,
        shopId,
        filename,
        contentType: meta?.contentType ?? null,
        sizeBytes: meta?.sizeBytes ?? null,
        width: meta?.width ?? null,
        height: meta?.height ?? null,
      };
    })
  );

  const data = results.map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean) as {
    url: string;
    type: typeof MarketingAssetType.IMAGE;
    productId: string;
    shopId: string;
    filename: string | null;
    contentType: string | null;
    sizeBytes: number | null;
    width: number | null;
    height: number | null;
  }[];

  if (data.length > 0) {
    await prisma.marketingAsset.createMany({ data });
  }

  return { created: data.length, skipped: urls.length - toCreate.length };
}

/**
 * Enrich MarketingAssets that have null metadata by fetching from URL.
 * Updates contentType, sizeBytes, width, height, filename.
 */
export async function enrichMarketingAssetMetadata(
  productId: string
): Promise<{ updated: number; failed: number }> {
  const assets = await prisma.marketingAsset.findMany({
    where: {
      productId,
      type: MarketingAssetType.IMAGE,
      OR: [{ contentType: null }, { sizeBytes: null }],
    },
    select: { id: true, url: true },
  });

  let updated = 0;
  let failed = 0;

  for (const asset of assets) {
    try {
      const meta = await fetchImageMetadata(asset.url);
      if (!meta) {
        failed++;
        continue;
      }
      const filename = extractFilenameFromUrl(asset.url);
      await prisma.marketingAsset.update({
        where: { id: asset.id },
        data: {
          filename,
          contentType: meta.contentType,
          sizeBytes: meta.sizeBytes,
          width: meta.width,
          height: meta.height,
        },
      });
      updated++;
    } catch (err) {
      console.error("[enrich asset]", asset.id, asset.url, err);
      failed++;
    }
  }

  return { updated, failed };
}
