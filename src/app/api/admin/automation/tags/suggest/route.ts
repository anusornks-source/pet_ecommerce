import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

type TagField = "name" | "nameEn" | "slug" | "icon";

interface SuggestRequestBody {
  target: TagField;
  context?: {
    name?: string;
    nameEn?: string;
    slug?: string;
    icon?: string;
  };
  aiModel?: "claude" | "gpt";
}

async function callOpenAI(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("AI returned empty response");
  return text.replace(/^"|"$/g, "").trim();
}

async function callClaude(prompt: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("AI returned empty response");
  return text.replace(/^"|"$/g, "").trim();
}

function buildPrompt(target: TagField, ctx: SuggestRequestBody["context"]): string {
  const baseContext = `
You are helping an admin create product tags for a Thai pet ecommerce platform.
Existing values (may be empty):
- Thai name (name): ${ctx?.name ?? "-"}
- English name (nameEn): ${ctx?.nameEn ?? "-"}
- Slug: ${ctx?.slug ?? "-"}
- Icon (emoji): ${ctx?.icon ?? "-"}
`.trim();

  if (target === "name") {
    return `${baseContext}

Goal: Suggest a concise, marketing-friendly Thai tag name for ecommerce badges (เช่น "ขายดี", "สินค้ามาใหม่").
If English name or slug is provided, use them as meaning hints.

Return ONLY the Thai name as plain text. Do not include quotes or explanations.`;
  }

  if (target === "nameEn") {
    return `${baseContext}

Goal: Suggest a short English tag name suitable for URL/filters (เช่น "bestseller", "new-arrival").
Use lowercase words separated by spaces or hyphens. Keep it 1–3 words.

Return ONLY the English name as plain text. Do not include quotes or explanations.`;
  }

  if (target === "slug") {
    return `${baseContext}

Goal: Suggest a URL-friendly slug for this tag.
Rules:
- lowercase a–z, numbers, and hyphen only
- no spaces
- should be based on the English name if available, otherwise the Thai meaning (transliterated).

Return ONLY the slug as plain text (e.g. bestseller, new-arrival). Do not include quotes or explanations.`;
  }

  // icon
  return `${baseContext}

Goal: Suggest ONE emoji that visually represents this tag (เช่น 🔥 สำหรับขายดี, 🆕 สำหรับของใหม่).

Return ONLY a single emoji character. Do not include any other text.`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  try {
    const { target, context, aiModel = "claude" } = (await request.json()) as SuggestRequestBody;

    if (!target || !["name", "nameEn", "slug", "icon"].includes(target)) {
      return NextResponse.json({ success: false, error: "Invalid target" }, { status: 400 });
    }

    const prompt = buildPrompt(target, context);
    const text = aiModel === "gpt" ? await callOpenAI(prompt) : await callClaude(prompt);

    return NextResponse.json({ success: true, target, value: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI suggest failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

