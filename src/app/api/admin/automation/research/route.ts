import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { getGoogleTrends, getCJBestsellers, buildTikTokTrendPrompt, buildAITrendPrompt, TrendKeyword } from "@/lib/trendSources";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

type AIModel = "claude" | "gpt";
type TrendSource = "google" | "cj" | "tiktok" | "ai";

interface LogEntry {
  time: string;
  step: string;
  status: "ok" | "error" | "info";
  detail: string;
  durationMs?: number;
}

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

// ─── AI abstraction ─────────────────────────────────────────────

async function aiComplete(model: AIModel, prompt: string, maxTokens = 500): Promise<string> {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (model === "gpt") {
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ยังไม่ได้ตั้งค่า");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const res = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        });
        return res.choices[0]?.message?.content?.trim() ?? "";
      }

      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      });
      return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    } catch (err) {
      const isOverloaded = err instanceof Error && (err.message.includes("overloaded") || err.message.includes("529"));
      if (isOverloaded && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("AI call failed after retries");
}

function parseJsonArray<T>(text: string, fallback: T[] = []): T[] {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : fallback;
  } catch {
    return fallback;
  }
}

// ─── Main handler ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const {
    niche,
    sources = ["ai"] as TrendSource[],
    aiModel = "claude" as AIModel,
  } = await request.json();

  const logs: LogEntry[] = [];
  const log = (step: string, status: LogEntry["status"], detail: string, durationMs?: number) => {
    logs.push({ time: ts(), step, status, detail, durationMs });
  };

  log("init", "info", `Niche: "${niche}", Sources: [${sources.join(",")}], Model: ${aiModel}`);

  if (!niche?.trim()) {
    return NextResponse.json({ success: false, error: "กรุณาระบุ niche/หมวดหมู่", logs }, { status: 400 });
  }

  try {
    // ── Step 1: Gather trend keywords from selected sources ──────

    const allTrends: TrendKeyword[] = [];
    const sourceResults: Record<string, TrendKeyword[]> = {};
    const sourcePromises: Promise<void>[] = [];

    if (sources.includes("google")) {
      sourcePromises.push(
        (async () => {
          const t0 = Date.now();
          try {
            const kws = await getGoogleTrends(niche.trim());
            sourceResults.google = kws;
            allTrends.push(...kws);
            log("source:google", "ok", `${kws.length} keywords found`, Date.now() - t0);
          } catch (e) {
            sourceResults.google = [];
            log("source:google", "error", e instanceof Error ? e.message : "Unknown error", Date.now() - t0);
          }
        })()
      );
    }

    if (sources.includes("cj")) {
      sourcePromises.push(
        (async () => {
          const t0 = Date.now();
          try {
            const kws = await getCJBestsellers(niche.trim());
            sourceResults.cj = kws;
            allTrends.push(...kws);
            log("source:cj", "ok", `${kws.length} keywords found`, Date.now() - t0);
          } catch (e) {
            sourceResults.cj = [];
            log("source:cj", "error", e instanceof Error ? e.message : "Unknown error", Date.now() - t0);
          }
        })()
      );
    }

    if (sources.includes("tiktok")) {
      sourcePromises.push(
        (async () => {
          const t0 = Date.now();
          try {
            const prompt = buildTikTokTrendPrompt(niche.trim());
            const text = await aiComplete(aiModel, prompt, 400);
            const parsed = parseJsonArray<{ keyword: string; why: string }>(text);
            const kws: TrendKeyword[] = parsed
              .filter((p) => p.keyword?.trim())
              .map((p) => ({ keyword: p.keyword, source: "TikTok Trending", trending: true }));
            sourceResults.tiktok = kws;
            allTrends.push(...kws);
            log("source:tiktok", "ok", `${kws.length} keywords generated via AI (${aiModel})`, Date.now() - t0);
          } catch (e) {
            sourceResults.tiktok = [];
            log("source:tiktok", "error", e instanceof Error ? e.message : "Unknown error", Date.now() - t0);
          }
        })()
      );
    }

    if (sources.includes("ai")) {
      sourcePromises.push(
        (async () => {
          const t0 = Date.now();
          try {
            const prompt = buildAITrendPrompt(niche.trim());
            const text = await aiComplete(aiModel, prompt, 600);
            const parsed = parseJsonArray<{ keyword: string; reason: string }>(text);
            const kws: TrendKeyword[] = parsed.map((p) => ({
              keyword: p.keyword,
              source: `AI (${aiModel === "gpt" ? "GPT" : "Claude"})`,
              trending: true,
            }));
            sourceResults.ai = kws;
            allTrends.push(...kws);
            log("source:ai", "ok", `${kws.length} keywords generated (${aiModel})`, Date.now() - t0);
          } catch (e) {
            sourceResults.ai = [];
            log("source:ai", "error", e instanceof Error ? e.message : "Unknown error", Date.now() - t0);
          }
        })()
      );
    }

    await Promise.all(sourcePromises);
    log("sources", "info", `Total raw keywords: ${allTrends.length}, Sources completed: ${Object.keys(sourceResults).length}`);

    // Deduplicate keywords
    const seenKw = new Set<string>();
    const uniqueKeywords: TrendKeyword[] = [];
    for (const tk of allTrends) {
      if (!tk.keyword?.trim()) continue;
      const norm = tk.keyword.toLowerCase().trim();
      if (seenKw.has(norm)) continue;
      seenKw.add(norm);
      uniqueKeywords.push(tk);
    }
    log("dedup", "info", `Unique keywords after dedup: ${uniqueKeywords.length}`);

    // Fallback if no keywords — use niche directly + common variants (no AI needed)
    if (uniqueKeywords.length === 0) {
      const nicheVal = niche.trim();
      const fallbackKws = [
        nicheVal,
        `pet ${nicheVal}`,
        `${nicheVal} for dogs`,
        `${nicheVal} for cats`,
        `${nicheVal} accessories`,
      ];
      for (const kw of fallbackKws) {
        uniqueKeywords.push({ keyword: kw, source: "Fallback" });
      }
      log("fallback", "info", `Using ${fallbackKws.length} fallback keywords from niche "${nicheVal}"`);
    }

    log("result", "ok", `Done — ${uniqueKeywords.length} trending keywords`);

    return NextResponse.json({
      success: true,
      data: { keywords: uniqueKeywords, sourceResults, logs },
    });
  } catch (err) {
    log("fatal", "error", err instanceof Error ? err.message : "Research failed");
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Research failed",
      logs,
    });
  }
}
