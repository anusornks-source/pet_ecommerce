import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { keywords, aiModel = "claude" } = await request.json();

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json({ success: false, error: "No keywords" }, { status: 400 });
  }

  const list = keywords.map((k: { id: string; niche: string }) => `- [${k.id}] ${k.niche}`).join("\n");

  const prompt = `You are a pet product ecommerce specialist helping with product keyword optimization.

For each keyword below, provide:
1. A clean, searchable EN product keyword (concise, good for dropshipping search)
2. Thai translation suitable for Thai pet product ecommerce

Keywords:
${list}

Return ONLY a JSON array:
[{"id": "...", "niche": "clean EN keyword", "niche_th": "คีย์เวิร์ดภาษาไทย"}]`;

  try {
    let text = "";

    if (aiModel === "gpt") {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });
      text = res.choices[0]?.message?.content?.trim() ?? "";
    } else {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });
      text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    }

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("AI returned invalid JSON");

    const enhanced: { id: string; niche: string; niche_th: string }[] = JSON.parse(match[0]);

    // Patch all keywords in DB
    await Promise.all(
      enhanced.map((e) =>
        prisma.nicheKeyword.update({
          where: { id: e.id },
          data: { niche: e.niche?.trim() || undefined, niche_th: e.niche_th?.trim() || null },
        }).catch(() => null)
      )
    );

    return NextResponse.json({ success: true, data: enhanced });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "AI enhance failed" },
      { status: 500 }
    );
  }
}
