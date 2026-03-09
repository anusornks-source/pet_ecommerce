import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

async function aiComplete(model: "claude" | "gpt", prompt: string, maxTokens = 2000): Promise<string> {
  if (model === "gpt") {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  }

  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { shopId, aiModel = "claude", painPoints } = await request.json();

  try {
    // Gather shop context
    const shop = shopId ? await prisma.shop.findUnique({ where: { id: shopId }, select: { usePetType: true } }) : null;

    const [categories, products, petTypes] = await Promise.all([
      prisma.category.findMany({
        where: shopId ? { shopCategories: { some: { shopId } } } : undefined,
        select: { name: true },
        take: 20,
      }),
      prisma.product.findMany({
        where: shopId ? { shopId } : undefined,
        select: { name: true, name_th: true, category: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      shop?.usePetType
        ? prisma.petType.findMany({ select: { name: true }, orderBy: { order: "asc" } })
        : Promise.resolve([]),
    ]);

    const catNames = categories.map((c) => c.name).join(", ");
    const petNames = petTypes.map((p) => p.name).join(", ");
    const productSample = products
      .slice(0, 20)
      .map((p) => `${p.name_th || p.name} (${p.category?.name ?? "uncategorized"})`)
      .join("\n");

    const petContext = petNames ? `\nPet types sold: ${petNames}` : "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const painPointContext = Array.isArray(painPoints) && painPoints.length > 0
      ? `\n\nPain Points discovered (use as context to generate targeted niches):\n${painPoints.map((pp: any) => `- ${pp.painPoint || pp.painPoint_en} → keyword: ${pp.nicheKeyword}`).join("\n")}\n\nGenerate niches that specifically address these pain points.`
      : "";

    const prompt = `You are an ecommerce product strategist. Analyze this shop's data and suggest profitable niche keywords for product research on CJ Dropshipping.

Shop categories: ${catNames || "none yet"}${petContext}
Recent products:
${productSample || "No products yet"}${painPointContext}

Generate 12 niche keyword suggestions. Mix these types:
- Gaps: niches the shop is missing but should have
- Trending: currently hot pet product niches
- Seasonal: upcoming seasonal opportunities
- Upsell: complementary products to existing inventory

Each suggestion should be a short, specific search phrase (2-4 words) suitable for product sourcing on CJ (English keywords).
Also provide a Thai translation of both the niche and reason.

Return ONLY a JSON array:
[{"niche": "keyword phrase in English", "niche_th": "คำแปลภาษาไทย", "type": "gap|trending|seasonal|upsell", "reason": "short reason why in English", "reason_th": "เหตุผลสั้นๆ ภาษาไทย"}]`;

    const rawText = await aiComplete(aiModel, prompt, 2000);
    // Strip markdown code blocks if present
    const text = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let match = text.match(/\[[\s\S]*\]/);
    // If truncated (no closing bracket), try to fix
    if (!match && text.includes("[")) {
      const partial = text.slice(text.indexOf("[")).replace(/,\s*$/, "").replace(/}\s*$/, "}]");
      try { match = [partial]; JSON.parse(partial); } catch { match = null; }
    }
    const suggestions = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ success: true, data: suggestions });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate suggestions",
    });
  }
}
