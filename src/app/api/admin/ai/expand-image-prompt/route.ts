import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * POST /api/admin/ai/expand-image-prompt
 * รับโจทย์สั้น ๆ (เช่น "พื้นหลังขาว" "ทำให้ดูสวยขึ้น") แล้วให้ AI คิด prompt ละเอียดสำหรับ image generation
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { task, productContext, textLang } = body as {
    task?: string;
    productContext?: string | { name?: string; name_th?: string; price?: number; normalPrice?: number; shortDescription?: string };
    textLang?: "th" | "en";
  };

  if (!task || typeof task !== "string" || !task.trim()) {
    return NextResponse.json({ success: false, error: "กรุณาระบุโจทย์" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า" }, { status: 500 });
  }

  let contextStr = "";
  if (productContext) {
    if (typeof productContext === "string") {
      contextStr = productContext;
    } else {
      const parts: string[] = [];
      if (productContext.name) parts.push(`Name (EN): ${productContext.name}`);
      if (productContext.name_th) parts.push(`Name (TH): ${productContext.name_th}`);
      if (productContext.price != null) parts.push(`Price: ฿${productContext.price.toLocaleString()}`);
      if (productContext.normalPrice != null) parts.push(`Normal price: ฿${productContext.normalPrice.toLocaleString()}`);
      if (productContext.shortDescription) parts.push(`Short: ${productContext.shortDescription.slice(0, 200)}`);
      contextStr = parts.join(". ");
    }
  }

  const langNote = textLang === "th"
    ? "TEXT LANGUAGE: Use THAI for any text overlay (product name, labels). Use name_th from context for product name."
    : "TEXT LANGUAGE: Use ENGLISH for any text overlay (product name, labels). Use name from context for product name.";

  const systemPrompt = `You are an expert at writing image generation prompts for product photography.
Given a short user request (โจทย์) in Thai or English, output a detailed, effective prompt in English for img2img / product photo editing.
The prompt will be used with fal.ai or similar image models to modify an existing product photo.

${langNote}

IMPORTANT - When the user asks to add price tag (แปะป้ายราคา), product info, or text overlay:
- Use the EXACT product data provided (name, price) in the prompt so the image model knows what to render
- For product name: use name_th if text language is Thai, use name if English
- Example (Thai): "add a clean price tag overlay showing ฿399, product name in Thai: กระเป๋าใส่สัตว์เลี้ยง"
- Example (English): "add a clean price tag overlay showing ฿399, product name: Portable Pet Carrier"
- Include the actual price in Thai Baht format (฿XXX)

For other requests (background, filter, etc.):
- Focus on: background, lighting, shadows, filters, style, composition
- Use clear visual terms (e.g. "pure white studio", "soft natural shadow", "vintage film filter")

Rules:
- Output ONLY the prompt text, nothing else (no quotes, no explanation)
- Keep it concise but specific (1-2 sentences, under 100 words)
- Do NOT add "product photo" or "professional" unless the user asks for it`;

  const langHint = textLang ? `\nText overlay language: ${textLang === "th" ? "Thai" : "English"}` : "";
  const userContent = contextStr
    ? `Product context: ${contextStr}${langHint}\n\nUser's short request (โจทย์): "${task.trim()}"\n\nGenerate the image prompt:`
    : `User's short request (โจทย์): "${task.trim()}"\n\nGenerate the image prompt:`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const prompt = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!prompt) {
      return NextResponse.json({ success: false, error: "AI ไม่ได้สร้าง prompt" });
    }

    return NextResponse.json({ success: true, prompt });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
}
