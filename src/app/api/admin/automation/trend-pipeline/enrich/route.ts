import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

async function aiComplete(model: "claude" | "gpt", prompt: string, maxTokens = 800): Promise<string> {
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

  const { candidateIds, aiModel = "claude", shopId } = await request.json();

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return NextResponse.json({ success: false, error: "candidateIds required" }, { status: 400 });
  }

  // Get shop categories for suggestion
  const categories = shopId
    ? await prisma.category.findMany({
        where: { shopCategories: { some: { shopId } } },
        select: { name: true },
      })
    : await prisma.category.findMany({ select: { name: true }, take: 20 });

  const catNames = categories.map((c) => c.name).join(", ");

  const results = [];

  for (const id of candidateIds) {
    const candidate = await prisma.trendCandidate.findUnique({ where: { id } });
    if (!candidate || candidate.status !== "approved") continue;

    const prompt = `You are a Thai pet ecommerce product specialist.

Product from ${candidate.platformSource}: "${candidate.productName}"
Category: "${candidate.category || "unknown"}"

Generate:
1. name_th: ชื่อสินค้าภาษาไทย (เป็นธรรมชาติ SEO-friendly)
2. description: English product description (2-3 sentences, persuasive)
3. description_th: คำอธิบายสินค้าภาษาไทย (2-3 ประโยค น่าซื้อ)
4. suggestedCategory: Best matching category from: [${catNames || "General"}]
5. suggestedPetType: Which pet type? (Dog/Cat/Fish/Bird/Rabbit/All)
6. suggestedPrice: Estimated retail price in Thai Baht (number only)
7. nicheKeyword: English keyword (2-4 words) for CJ Dropshipping search

Return ONLY JSON:
{"name_th": "...", "description": "...", "description_th": "...", "suggestedCategory": "...", "suggestedPetType": "...", "suggestedPrice": 299, "nicheKeyword": "..."}`;

    try {
      const raw = await aiComplete(aiModel, prompt, 800);
      const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      const enriched = match ? JSON.parse(match[0]) : null;

      if (enriched) {
        const updated = await prisma.trendCandidate.update({
          where: { id },
          data: {
            name_th: enriched.name_th ?? null,
            description: enriched.description ?? null,
            description_th: enriched.description_th ?? null,
            suggestedCategory: enriched.suggestedCategory ?? null,
            suggestedPetType: enriched.suggestedPetType ?? null,
            suggestedPrice: enriched.suggestedPrice ? Number(enriched.suggestedPrice) : null,
            nicheKeyword: enriched.nicheKeyword ?? null,
            status: "enriched",
            enrichedAt: new Date(),
          },
        });
        results.push({ id, success: true, data: updated });
      } else {
        results.push({ id, success: false, error: "AI returned invalid JSON", raw });
      }
    } catch (err) {
      results.push({ id, success: false, error: err instanceof Error ? err.message : "Enrich failed" });
    }
  }

  return NextResponse.json({ success: true, results });
}
