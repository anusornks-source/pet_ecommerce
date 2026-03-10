import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

async function aiComplete(model: "claude" | "gpt", prompt: string, maxTokens = 500): Promise<string> {
  if (model === "gpt") {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini", max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001", max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { candidateIds, aiModel = "claude" } = await request.json();

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return NextResponse.json({ success: false, error: "candidateIds required" }, { status: 400 });
  }

  const results = [];

  for (const id of candidateIds) {
    const candidate = await prisma.trendCandidate.findUnique({ where: { id } });
    if (!candidate || candidate.status !== "pending") continue;

    const prompt = `You are a pet ecommerce analyst for the Thai market.

Score this product trending on ${candidate.platformSource}:
Product: "${candidate.productName}"
Category: "${candidate.category || "unknown"}"
Sales: "${candidate.salesVolume || "unknown"}"

Rate each 1-10:
- trendScore: Is this hot right now? (10 = viral)
- marketFit: Does this fit Thai pet shop customers? (10 = perfect fit)
- marginPotential: Can we profit from dropshipping this? (10 = high margin)
- competition: How crowded is this niche? (10 = low competition = good opportunity)

Also calculate overallScore as weighted average: trend*0.3 + marketFit*0.3 + margin*0.2 + competition*0.2

Return ONLY JSON:
{"trendScore": 8, "marketFit": 7, "marginPotential": 6, "competition": 5, "overallScore": 6.8, "aiAnalysis": "วิเคราะห์สั้นๆ ภาษาไทย 1-2 ประโยค"}`;

    try {
      const raw = await aiComplete(aiModel, prompt, 400);
      const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      const scores = match ? JSON.parse(match[0]) : null;

      if (scores) {
        const updated = await prisma.trendCandidate.update({
          where: { id },
          data: {
            trendScore: scores.trendScore ?? null,
            marketFit: scores.marketFit ?? null,
            marginPotential: scores.marginPotential ?? null,
            competition: scores.competition ?? null,
            overallScore: scores.overallScore ?? null,
            aiAnalysis: scores.aiAnalysis ?? null,
            status: "scored",
            scoredAt: new Date(),
          },
        });
        results.push({ id, success: true, scores, data: updated });
      } else {
        results.push({ id, success: false, error: "AI returned invalid JSON", raw });
      }
    } catch (err) {
      results.push({ id, success: false, error: err instanceof Error ? err.message : "Score failed" });
    }
  }

  return NextResponse.json({ success: true, results });
}
