import { searchCJProducts } from "@/lib/cjDropshipping";

export interface TrendKeyword {
  keyword: string;
  source: string;
  volume?: number | null;      // search volume or popularity score
  trending?: boolean;          // is it currently trending up
  trendScore?: number | null;  // AI estimated score 1-10
  momentum?: "rising" | "peak" | "stable" | null; // trend momentum
}

export interface TrendInterest {
  avg: number;           // average interest score 0-100
  peak: number;          // peak score in period
  trend: "up" | "down" | "stable";
  trendPct: number;      // % change first half vs second half
  dataPoints: number[];  // last 12 weekly values for sparkline
}

// ─── 1. Google Trends ───────────────────────────────────────────
function classifyGoogleError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("DOCTYPE") || msg.includes("<HEAD>") || msg.includes("not valid JSON")) {
    return "Google blocked the request (rate limited / CAPTCHA). Try again later.";
  }
  return msg;
}

export async function getGoogleTrends(niche: string, lang: "en" | "th" = "en"): Promise<TrendKeyword[]> {
  const googleTrends = await import("google-trends-api");
  const results: TrendKeyword[] = [];
  const errors: string[] = [];

  // Use only 2 queries to reduce rate-limit risk; add delay between them
  const queries =
    lang === "th"
      ? [niche, `${niche} สัตว์เลี้ยง`]
      : [niche, `${niche} pet`];

  const geoOptions = lang === "th" ? { hl: "th", geo: "TH" } : {};

  for (const query of queries) {
    if (results.length >= 8) break;
    try {
      const relatedData = await googleTrends.relatedQueries({ keyword: query, ...geoOptions });
      const parsed = JSON.parse(relatedData);

      const topQueries = parsed?.default?.rankedList?.[0]?.rankedKeyword ?? [];
      for (const item of topQueries.slice(0, 4)) {
        if (!item.query || results.some((r) => r.keyword.toLowerCase() === item.query.toLowerCase())) continue;
        results.push({ keyword: item.query, source: "Google Trends (Top)", volume: item.value ?? null });
      }

      const risingQueries = parsed?.default?.rankedList?.[1]?.rankedKeyword ?? [];
      for (const item of risingQueries.slice(0, 4)) {
        if (!item.query || results.some((r) => r.keyword.toLowerCase() === item.query.toLowerCase())) continue;
        results.push({ keyword: item.query, source: "Google Trends (Rising)", volume: item.value ?? null, trending: true });
      }
      // Small delay before next query to avoid rate limiting
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      errors.push(classifyGoogleError(e));
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new Error(errors[0]);
  }

  return results;
}

// ─── 1b. Google Trends Interest Over Time ───────────────────────
export async function getGoogleTrendsInterest(niche: string, lang: "en" | "th" = "en"): Promise<TrendInterest | null> {
  const googleTrends = await import("google-trends-api");
  const geoOptions = lang === "th" ? { geo: "TH" } : {};
  try {
    const raw = await googleTrends.interestOverTime({
      keyword: niche,
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      ...geoOptions,
    });
    const parsed = JSON.parse(raw);
    const timeline = parsed?.default?.timelineData ?? [];
    const values: number[] = timeline
      .map((d: { value: number[] }) => d.value?.[0] ?? 0)
      .filter((v: number) => v >= 0);

    if (values.length === 0) return null;

    const nonZero = values.filter((v) => v > 0);
    if (nonZero.length === 0) return null;

    const avg = Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length);
    const peak = Math.max(...nonZero);

    // Compare first half vs second half to detect trend direction
    const mid = Math.floor(values.length / 2);
    const firstAvg = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondAvg = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
    const trendPct = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;
    const trend: "up" | "down" | "stable" = trendPct > 10 ? "up" : trendPct < -10 ? "down" : "stable";

    const dataPoints = values.slice(-12);

    return { avg, peak, trend, trendPct, dataPoints };
  } catch {
    return null;
  }
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
export function buildTikTokTrendPrompt(niche: string, lang: "en" | "th" = "en"): string {
  if (lang === "th") {
    return `คุณคือนักวิเคราะห์เทรนด์ TikTok สำหรับสินค้าสัตว์เลี้ยง

วิเคราะห์สิ่งที่กำลัง trending บน TikTok ตอนนี้สำหรับ: "${niche}"

คิดถึง:
- วิดีโอสินค้าสัตว์เลี้ยงที่ viral (ASMR unboxing, ปฏิกิริยาของสัตว์, before/after)
- แฮชแท็กอย่าง #สัตว์เลี้ยง #แมว #สุนัข
- สินค้าที่ขายได้ดีในโฆษณาวิดีโอสั้น

สร้าง keyword สินค้า 6 คำที่กำลัง trending บน TikTok โดยตอบเป็นภาษาไทย
Return ONLY a JSON array:
[{"keyword": "ชื่อสินค้าภาษาไทย", "why": "เหตุผลสั้นๆ", "trend_score": 1-10, "momentum": "rising"|"peak"|"stable"}]`;
  }
  return `You are a TikTok trend analyst for the pet products niche.

Based on what's trending on TikTok right now for: "${niche}"

Think about:
- Viral pet product videos (ASMR unboxing, pet reaction videos, before/after)
- Hashtags like #PetsOfTikTok #CatTok #DogTok that amplify pet products
- Impulse-buy products that perform well in short video ads
- Products that create strong emotional reactions (cute, funny, impressive)

Generate exactly 6 specific product keywords that are trending on TikTok.
For each keyword, estimate its viral potential:
- trend_score: 1-10 (10 = extremely viral right now)
- momentum: "rising" (gaining fast), "peak" (at maximum now), "stable" (consistently trending)

Return ONLY a JSON array:
[{"keyword": "product keyword", "why": "why it trends on TikTok", "trend_score": 8, "momentum": "rising"}]`;
}

// ─── 4. AI Web Search (via Claude/GPT knowledge) ───────────────
export function buildAITrendPrompt(niche: string, lang: "en" | "th" = "en"): string {
  if (lang === "th") {
    return `คุณคือนักวิเคราะห์เทรนด์สินค้าสัตว์เลี้ยงและผู้เชี่ยวชาญ dropshipping

วิเคราะห์สินค้าสัตว์เลี้ยงที่กำลัง trending สำหรับ: "${niche}"

พิจารณา:
- สินค้าสัตว์เลี้ยงที่ viral บน Social media
- เทรนด์ตามฤดูกาลและวันหยุดที่กำลังจะมาถึง
- นวัตกรรมการดูแลสัตว์เลี้ยงใหม่ๆ
- สิ่งที่เจ้าของสัตว์เลี้ยงในไทยกำลังค้นหา

สร้าง keyword สินค้า 8 คำที่กำลัง trending ตอบเป็นภาษาไทย
Return ONLY a JSON array:
[{"keyword": "ชื่อสินค้าภาษาไทย", "reason": "เหตุผลสั้นๆ", "trend_score": 1-10, "momentum": "rising"|"peak"|"stable"}]`;
  }
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

For each keyword, estimate its trend strength:
- trend_score: 1-10 (10 = hottest right now)
- momentum: "rising" (gaining fast), "peak" (at maximum now), "stable" (consistently trending)

Return ONLY a JSON array of objects:
[{"keyword": "product keyword", "reason": "why this is trending", "trend_score": 7, "momentum": "rising"}]`;
}
