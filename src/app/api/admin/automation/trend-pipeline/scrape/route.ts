import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { scrapeTikTokTopProducts } from "@/lib/tiktokScraper";
import { PlatformSource } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { shopId, region = "TH", period = "7", limit = 20, platformSource = "TIKTOK" } = await request.json();

  try {
    let products: { productName: string; productImage: string | null; category: string | null; sourceUrl: string | null; salesVolume: string | null }[] = [];
    let scrapeError: string | undefined;

    if (platformSource === "TIKTOK") {
      const result = await scrapeTikTokTopProducts(region, period, limit);
      products = result.products;
      scrapeError = result.error;
    }
    // Future: add SHOPEE, FACEBOOK, etc. scrapers here

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        scraped: 0,
        skipped: 0,
        error: scrapeError || "No products found",
      });
    }

    // Dedup: skip products that already exist for this shop
    let scraped = 0;
    let skipped = 0;
    const created = [];

    for (const p of products) {
      const existing = await prisma.trendCandidate.findFirst({
        where: { shopId: shopId ?? null, productName: p.productName },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const candidate = await prisma.trendCandidate.create({
        data: {
          shopId: shopId ?? null,
          platformSource: platformSource as PlatformSource,
          productName: p.productName,
          productImage: p.productImage,
          category: p.category,
          sourceUrl: p.sourceUrl,
          salesVolume: p.salesVolume,
          status: "pending",
          scrapedAt: new Date(),
        },
      });

      created.push(candidate);
      scraped++;
    }

    return NextResponse.json({
      success: true,
      data: created,
      scraped,
      skipped,
      error: scrapeError,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Scrape failed",
    });
  }
}
