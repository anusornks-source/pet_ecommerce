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

  const items = keywords as { id: string; niche: string; niche_th?: string }[];
  const list = items.map((k) => {
    if (!k.niche?.trim() && k.niche_th) return `- [${k.id}] TH:"${k.niche_th}" → need EN`;
    return `- [${k.id}] EN:"${k.niche}" → need TH`;
  }).join("\n");

  const prompt = `You are a Thai pet product ecommerce specialist.

For each keyword below, fill in ONLY the missing field (EN or TH). Do NOT change existing values.
- If "need TH": translate the EN keyword into natural Thai for Thai pet ecommerce customers
- If "need EN": translate the Thai keyword into a concise English product keyword

Keywords:
${list}

Return ONLY a JSON array (include only the field that needs to be filled):
[{"id": "...", "niche_th": "..."} or {"id": "...", "niche": "..."}]`;

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

    const enhanced: { id: string; niche?: string; niche_th?: string }[] = JSON.parse(match[0]);

    // Only update the field that was missing — never overwrite existing values
    await Promise.all(
      enhanced.map((e) => {
        const data: { niche?: string; niche_th?: string | null } = {};
        if (e.niche_th !== undefined) data.niche_th = e.niche_th?.trim() || null;
        if (e.niche !== undefined) data.niche = e.niche?.trim() || undefined;
        if (Object.keys(data).length === 0) return null;
        return prisma.nicheKeyword.update({ where: { id: e.id }, data }).catch(() => null);
      })
    );

    return NextResponse.json({ success: true, data: enhanced });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "AI enhance failed" },
      { status: 500 }
    );
  }
}
