import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { productId, lang = "th" } = await request.json();

  if (!productId) {
    return NextResponse.json({ success: false, error: "กรุณาเลือกสินค้า" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า" }, { status: 500 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, petType: true, tags: true, variants: { take: 10 } },
  });

  if (!product) {
    return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
  }

  const isEn = lang === "en";
  const langInstruction = isEn ? "Write everything in English." : "เขียนทุกอย่างเป็นภาษาไทย";

  // Build product context
  const ctx = [
    `Product: ${product.name}${product.name_th ? ` (${product.name_th})` : ""}`,
    `Price: ${product.price} THB`,
    product.category ? `Category: ${product.category.name}` : "",
    product.petType ? `Pet type: ${product.petType.name}` : "",
    product.tags?.length ? `Tags: ${product.tags.map((t) => t.name).join(", ")}` : "",
    product.shortDescription ? `Short desc: ${product.shortDescription}` : "",
    product.variants?.length ? `Variants: ${product.variants.map((v) => [v.size, v.color].filter(Boolean).join("/")).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const desc = stripHtml(product.description ?? product.sourceDescription ?? "").slice(0, 1500);
  const fullCtx = `${ctx}\n\nDescription: ${desc}`;

  try {
    const [hooksRes, captionsRes, anglesRes, ugcRes, thumbRes] = await Promise.all([
      // 1. Marketing Hooks
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `You are a direct-response marketing expert for pet products.

${fullCtx}

Generate 5 attention-grabbing marketing hooks for this product. Each hook should be 1-2 sentences, designed to stop scrolling on social media. ${langInstruction}

Return ONLY a JSON array of strings: ["hook1", "hook2", ...]`,
        }],
      }),

      // 2. Social Media Captions
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `You are a social media manager for a pet shop.

${fullCtx}

Write social media captions for 3 platforms. ${langInstruction}

Return ONLY a JSON object:
{
  "facebook": "caption with hashtags...",
  "instagram": "caption with hashtags...",
  "line": "short caption for LINE..."
}`,
        }],
      }),

      // 3. Ad Angles
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `You are a performance marketing strategist for pet products.

${fullCtx}

Create 4 different advertising angles for this product. Each angle should target a different customer motivation (e.g., health, convenience, emotion, value). ${langInstruction}

Return ONLY a JSON array:
[{"angle": "angle name", "headline": "ad headline", "body": "ad body text 2-3 sentences"}, ...]`,
        }],
      }),

      // 4. UGC Script
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `You are a UGC (user-generated content) creator for pet products.

${fullCtx}

Write a casual, authentic UGC-style video script (30-60 seconds). Include:
- Hook (first 3 seconds)
- Problem/pain point
- Product reveal & demo
- Results/benefits
- Call to action

${langInstruction}
Return the script as plain text with section labels.`,
        }],
      }),

      // 5. Thumbnail Texts
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `You are a thumbnail designer for pet product content.

${fullCtx}

Suggest 5 short, punchy thumbnail/banner text options (max 5-8 words each). These should work as overlay text on product images. ${langInstruction}

Return ONLY a JSON array of strings: ["text1", "text2", ...]`,
        }],
      }),
    ]);

    const extractText = (msg: Anthropic.Message) =>
      msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();

    const parseJsonArray = (text: string, fallback: string[] = []): string[] => {
      try {
        const match = text.match(/\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : fallback;
      } catch {
        return fallback;
      }
    };

    const parseJsonObject = <T>(text: string, fallback: T): T => {
      try {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : fallback;
      } catch {
        return fallback;
      }
    };

    const hooks = parseJsonArray(extractText(hooksRes));
    const captions = parseJsonObject(extractText(captionsRes), { facebook: "", instagram: "", line: "" });
    const adAngles = parseJsonArray(extractText(anglesRes)) as unknown as { angle: string; headline: string; body: string }[];
    const ugcScript = extractText(ugcRes);
    const thumbnailTexts = parseJsonArray(extractText(thumbRes));

    return NextResponse.json({
      success: true,
      data: {
        hooks,
        captions,
        adAngles: Array.isArray(adAngles) ? adAngles : [],
        ugcScript,
        thumbnailTexts,
        productName: product.name,
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Creative generation failed",
    });
  }
}
