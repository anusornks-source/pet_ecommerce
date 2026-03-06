import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPTS: Record<string, (ctx: Record<string, string>) => string> = {
  name_th: ({ name }) =>
    `Translate this product category name to Thai (short, natural): "${name}". Reply with ONLY the Thai text, nothing else.`,
  name_en: ({ name_th }) =>
    `Translate this Thai product category name to concise English: "${name_th}". Reply with ONLY the English text, nothing else.`,
  slug: ({ name, name_th }) =>
    `Generate a URL-friendly slug for this category: "${name || name_th}". Rules: lowercase, hyphens only, no spaces, no special chars. Reply with ONLY the slug, nothing else.`,
};

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { field, ...ctx } = body as { field: string } & Record<string, string>;

  if (!PROMPTS[field]) {
    return NextResponse.json({ success: false, error: "Unknown field" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า" }, { status: 500 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{ role: "user", content: PROMPTS[field](ctx) }],
    });

    const value = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return NextResponse.json({ success: true, value });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
}
