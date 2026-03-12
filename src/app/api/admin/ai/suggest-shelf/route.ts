import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า" }, { status: 500 });
  }

  const body = await request.json();
  const { sourceType, hint } = body as { sourceType?: string; hint?: string };

  const typeHint =
    sourceType === "best_seller"
      ? "สินค้าขายดี (best sellers)"
      : sourceType === "featured"
        ? "สินค้าแนะนำ (featured/recommended)"
        : hint || "ชั้นวางสินค้าทั่วไป";

  const prompt = `Suggest content for a product shelf section on a Thai pet ecommerce store.
Type: ${typeHint}

Reply with ONLY a valid JSON object (no markdown, no extra text):
{"name":"English name (short, emoji ok)","name_th":"ชื่อภาษาไทย (สั้น, มี emoji ได้)","slug":"url-slug-lowercase-hyphens","description":"English badge (short)","description_th":"คำอธิบาย badge ไทย (สั้น)"}

Rules:
- name: catchy English name, max ~25 chars, emoji ok
- name_th: catchy Thai name, max ~20 chars, emoji ok
- slug: lowercase, hyphens only, no spaces, max ~30 chars
- description, description_th: optional short badge, max ~25 chars each`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as {
      name?: string;
      name_th?: string;
      slug?: string;
      description?: string;
      description_th?: string;
    };

    const name = String(parsed?.name ?? "").trim() || "Featured Products";
    const name_th = String(parsed?.name_th ?? "").trim() || null;
    const slug = String(parsed?.slug ?? "")
      .toLowerCase()
      .replace(/[^\w-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "featured";
    const description = String(parsed?.description ?? "").trim() || null;
    const description_th = String(parsed?.description_th ?? "").trim() || null;

    return NextResponse.json({ success: true, data: { name, name_th, slug, description, description_th } });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
}
