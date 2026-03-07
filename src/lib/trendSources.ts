import { searchCJProducts } from "@/lib/cjDropshipping";

export interface TrendKeyword {
  keyword: string;
  source: string;
  volume?: number | null;      // search volume or popularity score
  trending?: boolean;          // is it currently trending up
}

// ─── 1. Google Trends ───────────────────────────────────────────
export async function getGoogleTrends(niche: string): Promise<TrendKeyword[]> {
  const googleTrends = await import("google-trends-api");
  const results: TrendKeyword[] = [];

  // Try multiple queries: niche alone, niche + pet, niche + dog/cat
  const queries = [niche, `${niche} pet`, `${niche} dog`, `${niche} cat`];

  for (const query of queries) {
    if (results.length >= 8) break;
    try {
      const relatedData = await googleTrends.relatedQueries({
        keyword: query,
        geo: "TH",
      });

      const parsed = JSON.parse(relatedData);

      // Top queries
      const topQueries = parsed?.default?.rankedList?.[0]?.rankedKeyword ?? [];
      for (const item of topQueries.slice(0, 3)) {
        if (!item.query || results.some((r) => r.keyword.toLowerCase() === item.query.toLowerCase())) continue;
        results.push({
          keyword: item.query,
          source: "Google Trends (Top)",
          volume: item.value ?? null,
        });
      }

      // Rising queries
      const risingQueries = parsed?.default?.rankedList?.[1]?.rankedKeyword ?? [];
      for (const item of risingQueries.slice(0, 3)) {
        if (!item.query || results.some((r) => r.keyword.toLowerCase() === item.query.toLowerCase())) continue;
        results.push({
          keyword: item.query,
          source: "Google Trends (Rising)",
          volume: item.value ?? null,
          trending: true,
        });
      }
    } catch {
      // This query variant failed, try next
    }
  }

  // If still nothing, try daily trends as last resort
  if (results.length === 0) {
    try {
      const dailyData = await googleTrends.dailyTrends({ geo: "TH" });
      const parsed = JSON.parse(dailyData);
      const searches = parsed?.default?.trendingSearchesDays?.[0]?.trendingSearches ?? [];

      const nicheLC = niche.toLowerCase();
      const petTerms = ["pet", "dog", "cat", "animal", "puppy", "kitten", nicheLC];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const s of searches.slice(0, 20) as any[]) {
        const title = (s.title?.query ?? "").toLowerCase();
        const related = (s.relatedQueries ?? []).map((q: { query: string }) => q.query.toLowerCase()).join(" ");
        const combined = `${title} ${related}`;
        if (petTerms.some((t) => combined.includes(t))) {
          results.push({
            keyword: s.title?.query ?? "",
            source: "Google Trends (Daily)",
            volume: parseInt(s.formattedTraffic?.replace(/[^0-9]/g, "") ?? "0") || null,
            trending: true,
          });
        }
        if (results.length >= 5) break;
      }
    } catch { /* ignore */ }
  }

  return results;
}

// ─── 2. CJ Bestsellers ─────────────────────────────────────────
export async function getCJBestsellers(niche: string): Promise<TrendKeyword[]> {
  try {
    const result = await searchCJProducts(niche, 1);
    const sorted = [...result.list]
      .filter((item) => (item.productSales ?? 0) > 0)
      .sort((a, b) => (b.productSales ?? 0) - (a.productSales ?? 0));

    const keywords: TrendKeyword[] = sorted.slice(0, 5).map((item) => ({
      keyword: item.productNameEn,
      source: "CJ Bestseller",
      volume: item.productSales ?? null,
    }));

    // Also try related sub-niches
    const subNiches = [`${niche} popular`, `${niche} hot selling`];
    for (const sub of subNiches) {
      try {
        const subResult = await searchCJProducts(sub, 1);
        const topItem = subResult.list[0];
        if (topItem && !keywords.some((k) => k.keyword === topItem.productNameEn)) {
          keywords.push({
            keyword: topItem.productNameEn,
            source: "CJ Bestseller",
            volume: topItem.productSales ?? null,
          });
        }
      } catch { /* skip */ }
      await new Promise((r) => setTimeout(r, 200));
    }

    return keywords.slice(0, 7);
  } catch {
    return [];
  }
}

// ─── 3. TikTok Creative Center ──────────────────────────────────
export async function getTikTokTrends(niche: string): Promise<TrendKeyword[]> {
  try {
    const res = await fetch(
      `https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=7&page=1&limit=20&country_code=TH&sort_by=popular&keyword=${encodeURIComponent(niche)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      }
    );

    if (!res.ok) throw new Error(`TikTok API ${res.status}`);
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hashtags = (data?.data?.list ?? []) as any[];
    const results: TrendKeyword[] = hashtags
      .slice(0, 5)
      .map((h) => ({
        keyword: h.hashtag_name ?? "",
        source: "TikTok Trending",
        volume: h.publish_cnt ?? h.video_views ?? null,
        trending: (h.trend ?? 0) > 0,
      }))
      .filter((r) => r.keyword);

    return results;
  } catch {
    // Fallback: try trending products endpoint
    try {
      const res = await fetch(
        `https://ads.tiktok.com/creative_radar_api/v1/popular_trend/product/list?period=7&page=1&limit=20&country_code=TH&industry_id=0&keyword=${encodeURIComponent(niche + " pet")}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
          },
        }
      );

      if (!res.ok) return [];
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const products = (data?.data?.list ?? []) as any[];
      return products.slice(0, 5).map((p) => ({
        keyword: p.product_name ?? p.title ?? "",
        source: "TikTok Products",
        volume: p.order_cnt ?? p.video_views ?? null,
        trending: true,
      })).filter((r) => r.keyword);
    } catch {
      return [];
    }
  }
}

// ─── 4. AI Web Search (via Claude/GPT knowledge) ───────────────
export function buildAITrendPrompt(niche: string): string {
  return `You are a pet product trend analyst and dropshipping expert.

Analyze current trending products for the pet niche: "${niche}"

Consider:
- Social media viral pet products (TikTok, Instagram)
- Seasonal trends and upcoming holidays
- Emerging pet care innovations
- Products with high perceived value but low manufacturing cost
- What pet owners are currently searching for

Generate exactly 8 specific, searchable product keywords for sourcing from CJ Dropshipping.
Focus on products that are trending NOW or about to trend.

Return ONLY a JSON array of objects:
[{"keyword": "product keyword", "reason": "why this is trending"}]`;
}
