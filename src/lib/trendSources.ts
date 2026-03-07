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

  // Try global queries first (no geo = more data), then TH-specific
  const queries = [niche, `${niche} pet`, `${niche} dog`, `${niche} cat`];

  for (const query of queries) {
    if (results.length >= 8) break;
    try {
      // Try without geo restriction first — much more likely to return data
      const relatedData = await googleTrends.relatedQueries({ keyword: query });
      const parsed = JSON.parse(relatedData);

      const topQueries = parsed?.default?.rankedList?.[0]?.rankedKeyword ?? [];
      for (const item of topQueries.slice(0, 3)) {
        if (!item.query || results.some((r) => r.keyword.toLowerCase() === item.query.toLowerCase())) continue;
        results.push({ keyword: item.query, source: "Google Trends (Top)", volume: item.value ?? null });
      }

      const risingQueries = parsed?.default?.rankedList?.[1]?.rankedKeyword ?? [];
      for (const item of risingQueries.slice(0, 3)) {
        if (!item.query || results.some((r) => r.keyword.toLowerCase() === item.query.toLowerCase())) continue;
        results.push({ keyword: item.query, source: "Google Trends (Rising)", volume: item.value ?? null, trending: true });
      }
    } catch {
      // This query variant failed, try next
    }
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

// ─── 3. TikTok Trending (AI-powered) ────────────────────────────
// TikTok Creative Center API requires authenticated session — not accessible server-side.
// We use AI to generate TikTok-style trending product keywords instead.
export function buildTikTokTrendPrompt(niche: string): string {
  return `You are a TikTok trend analyst for the pet products niche.

Based on what's trending on TikTok right now for: "${niche}"

Think about:
- Viral pet product videos (ASMR unboxing, pet reaction videos, before/after)
- Hashtags like #PetsOfTikTok #CatTok #DogTok that amplify pet products
- Impulse-buy products that perform well in short video ads
- Products that create strong emotional reactions (cute, funny, impressive)

Generate exactly 6 specific product keywords that are trending on TikTok.
Return ONLY a JSON array:
[{"keyword": "product keyword", "why": "why it trends on TikTok"}]`;
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
