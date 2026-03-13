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
  // Banner EN fields
  badge_en: ({ badge_th }) =>
    `Translate this short Thai banner badge text to natural English: "${badge_th}". Keep emojis. Reply with ONLY the English text, nothing else.`,
  title_en: ({ title_th }) =>
    `Translate this Thai banner headline to concise English: "${title_th}". Reply with ONLY the English text, nothing else.`,
  titleHighlight_en: ({ titleHighlight_th }) =>
    `Translate this Thai banner highlight text to punchy English: "${titleHighlight_th}". Reply with ONLY the English text, nothing else.`,
  subtitle_en: ({ subtitle_th }) =>
    `Translate this Thai banner subtitle to natural English: "${subtitle_th}". Reply with ONLY the English text, nothing else.`,
  ctaLabel_en: ({ ctaLabel_th }) =>
    `Translate this Thai call-to-action button label to short English: "${ctaLabel_th}". Keep emojis. Reply with ONLY the English text, nothing else.`,
  secondaryCtaLabel_en: ({ secondaryCtaLabel_th }) =>
    `Translate this Thai secondary button label to short English: "${secondaryCtaLabel_th}". Keep emojis. Reply with ONLY the English text, nothing else.`,
  // Banner TH fields
  badge_th: ({ badge }) =>
    `Translate this short banner badge text to natural Thai: "${badge}". Keep emojis. Reply with ONLY the Thai text, nothing else.`,
  title_th: ({ title }) =>
    `Translate this banner headline to natural Thai (short): "${title}". Reply with ONLY the Thai text, nothing else.`,
  titleHighlight_th: ({ titleHighlight }) =>
    `Translate this banner highlight text to natural Thai (short, punchy): "${titleHighlight}". Reply with ONLY the Thai text, nothing else.`,
  subtitle_th: ({ subtitle }) =>
    `Translate this banner subtitle to natural Thai: "${subtitle}". Reply with ONLY the Thai text, nothing else.`,
  ctaLabel_th: ({ ctaLabel }) =>
    `Translate this call-to-action button label to natural Thai (short): "${ctaLabel}". Keep emojis. Reply with ONLY the Thai text, nothing else.`,
  secondaryCtaLabel_th: ({ secondaryCtaLabel }) =>
    `Translate this secondary button label to natural Thai (short): "${secondaryCtaLabel}". Keep emojis. Reply with ONLY the Thai text, nothing else.`,
  // Shelf fields
  shelf_name: ({ name_th, sourceType }) =>
    name_th
      ? `Translate this Thai shelf name to concise English: "${name_th}". Reply with ONLY the English text, nothing else.`
      : `Suggest a short catchy English name for a product shelf (pet ecommerce). Type: ${sourceType || "manual"}. Max ~25 chars, emoji ok. Reply with ONLY the text.`,
  shelf_name_th: ({ name, sourceType }) =>
    name
      ? `Translate this shelf name to natural Thai (short): "${name}". Reply with ONLY the Thai text, nothing else.`
      : `Suggest a short catchy Thai name for a product shelf (pet ecommerce). Type: ${sourceType || "manual"}. Max ~20 chars, emoji ok. Reply with ONLY the text.`,
  shelf_slug: ({ name, name_th }) =>
    `Generate a URL-friendly slug for: "${name || name_th || "shelf"}". Rules: lowercase, hyphens only, no spaces. Reply with ONLY the slug.`,
  shelf_description: ({ description_th }) =>
    description_th
      ? `Translate this Thai badge to natural English: "${description_th}". Keep emojis. Reply with ONLY the English text.`
      : `Suggest a short badge text in English for a product shelf (max ~25 chars, emoji ok). Reply with ONLY the text.`,
  shelf_description_th: ({ description }) =>
    description
      ? `Translate this badge to natural Thai: "${description}". Keep emojis. Reply with ONLY the Thai text.`
      : `Suggest a short badge text in Thai for a product shelf (max ~25 chars, emoji ok). Reply with ONLY the text.`,
  // Supplier Product fields
  sp_name: ({ name_th }) =>
    name_th
      ? `Translate this Thai product name to concise English: "${name_th}". Reply with ONLY the English text, nothing else.`
      : `Suggest a short product name in English for pet ecommerce (max ~60 chars). Reply with ONLY the text.`,
  sp_name_th: ({ name }) =>
    name
      ? `Translate this product name to natural Thai: "${name}". Reply with ONLY the Thai text, nothing else.`
      : `Suggest a short product name in Thai for pet ecommerce (max ~50 chars). Reply with ONLY the text.`,
  sp_description: ({ description_th, sourceDescription, name, name_th }) => {
    const th = description_th || sourceDescription || "";
    return th
      ? `You are generating a FULL English product description from Thai source content (may contain HTML).\n\nSource:\n${th}\n\nRequirements:\n- Output HTML ONLY (no markdown, no plain text).\n- Use <p> for paragraphs and <ul><li> for bullet lists.\n- First, write a summary paragraph (2-3 sentences).\n- Then add a 'Highlights/Features' section as a bullet list, capturing EVERY important point from the source (do NOT drop bullets).\n- At the START of each <li>, add ONE short relevant emoji icon (e.g. ✅, 🐶, ✂️, 💡) that matches the meaning of that bullet.\n- Keep the meaning faithful to the original, but use natural English.\n- Do NOT include section titles like 'Highlights/Features' in Thai.\n- Reply with ONLY the HTML.`
      : `Write a full English product description in HTML for this product: "${name || name_th || "pet product"}".\nOutput HTML only using <p> and <ul><li>. Include 1 summary paragraph and a bullet list of 4–7 key features, and add ONE relevant emoji at the start of each <li>.`;
  },
  sp_description_th: ({ description, sourceDescription, name, name_th }) => {
    const en = description || sourceDescription || "";
    return en
      ? `You are generating a FULL Thai product description from English/HTML source content.\n\nSource:\n${en}\n\nข้อกำหนด:\n- ตอบเป็น HTML เท่านั้น (ห้าม markdown, ห้าม plain text)\n- ใช้ <p> สำหรับย่อหน้า และ <ul><li> สำหรับ bullet\n- ย่อหน้าแรก: สรุปสินค้า 2-3 ประโยค\n- จากนั้นทำหัวข้อคุณสมบัติ/ไฮไลท์เป็น bullet list โดยต้องเก็บทุกประเด็นสำคัญจากต้นฉบับ (ห้ามทำหาย)\n- ที่จุดเริ่มต้นของแต่ละ <li> ให้ใส่อีโมจิ 1 ตัวที่สื่อความหมายของ bullet นั้น (เช่น ✅, 🐶, ✂️, 💡 ฯลฯ)\n- ภาษาต้องเป็นไทยธรรมชาติ อ่านลื่น\n- ห้ามใส่หัวข้อภาษาอังกฤษ เช่น 'Highlights/Features'\n- ตอบกลับมาเป็น HTML อย่างเดียว`
      : `เขียนคำอธิบายสินค้าแบบเต็มเป็นภาษาไทยสำหรับสินค้า "${name_th || name || "สินค้า pet"}" ในรูปแบบ HTML โดยใช้ <p> และ <ul><li> มีทั้งย่อหน้าอธิบาย และ bullet คุณสมบัติ 4–7 ข้อ และใส่อีโมจิ 1 ตัวต้นแต่ละ bullet ตอบเป็น HTML อย่างเดียว`;
  },
  sp_shortDescription: ({ shortDescription_th, sourceDescription, name, name_th }) => {
    const src = shortDescription_th || sourceDescription || "";
    return src
      ? `Based on this Thai source (may contain HTML), write a ONE-LINE short product description in English (max ~120 chars):\n\n${src}\n\nFocus on key benefits only. Reply with ONLY the English text.`
      : `Write a one-line short product description in English for: "${name || name_th || "pet product"}" (max ~120 chars). Be specific. Reply with ONLY the text.`;
  },
  sp_shortDescription_th: ({ shortDescription, sourceDescription, name, name_th }) => {
    const src = shortDescription || sourceDescription || "";
    return src
      ? `Based on this source (may contain HTML), write a ONE-LINE short product description in Thai (max ~100 chars):\n\n${src}\n\nFocus on key benefits only. Reply with ONLY the Thai text.`
      : `Write a one-line short product description in Thai for: "${name || name_th || "pet product"}" (max ~100 chars). Be specific. Reply with ONLY the text.`;
  },
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
    // ปรับจำนวน token ตามชนิด field ให้คำอธิบายไม่ถูกตัดสั้น
    const maxTokens =
      field === "sp_description" || field === "sp_description_th"
        ? 600
        : field === "sp_shortDescription" || field === "sp_shortDescription_th"
          ? 160
          : 50;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: PROMPTS[field](ctx) }],
    });

    let value = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // บางครั้งโมเดลจะห่อผลลัพธ์ด้วย ```html … ``` ให้ลอก wrapper ออก
    value = value.replace(/^```(?:html|json)?\s*/i, "").replace(/```$/i, "").trim();

    return NextResponse.json({ success: true, value });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
}
