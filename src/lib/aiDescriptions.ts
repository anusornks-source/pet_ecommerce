import Anthropic from "@anthropic-ai/sdk";

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/**
 * Generate Thai product name from English name.
 * Used during import when source has name (EN) but no name_th.
 */
export async function generateNameTh(nameEn: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY || !nameEn?.trim()) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Translate this pet product name to Thai. Reply with ONLY the Thai name, nothing else. Keep it natural and SEO-friendly for Thai shoppers.

Product name (English): ${nameEn.trim()}`,
        },
      ],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Generate full Thai product description (HTML) for product detail page.
 * Used during import when source has description but no description_th.
 */
export async function generateFullDescTh(
  name: string,
  sourceDescription: string
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const cleanDesc = stripHtml(sourceDescription).slice(0, 2000);
  if (!cleanDesc && !name) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `คุณเป็นนักเขียนคอนเทนต์ร้านขายของออนไลน์ภาษาไทย

ชื่อสินค้า: ${name || "ไม่ระบุ"}
รายละเอียดสินค้า (ต้นฉบับ): ${cleanDesc || "ไม่ระบุ"}

เขียนคำอธิบายสินค้าภาษาไทยแบบเต็ม สำหรับหน้ารายละเอียดสินค้า
กฎ:
- เป็นภาษาไทยทั้งหมด
- ใช้ HTML ได้ (<b>, <br>, <ul>, <li>, <p>) แต่ไม่ต้องมี <html>/<body>
- เริ่มด้วย paragraph แนะนำสินค้า
- มีรายการจุดเด่นหรือสเปก (ใช้ <ul><li>)
- เขียนให้น่าดึงดูด กระชับ ได้ใจความ
- ไม่ต้องมีวลีเชิญชวนซื้อแบบโฆษณา`,
        },
      ],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Generate full English product description (HTML) for product detail page.
 * Used during import when source has raw description.
 */
export async function generateFullDescEn(
  name: string,
  sourceDescription: string
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const cleanDesc = stripHtml(sourceDescription).slice(0, 2000);
  if (!cleanDesc && !name) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are an online pet shop content writer.

Product name: ${name || "N/A"}
Product details (source): ${cleanDesc || "N/A"}

Write a full English product description for the product detail page.
Rules:
- English only
- Use HTML (<b>, <br>, <ul>, <li>, <p>) but not <html>/<body>
- Start with an introductory paragraph
- Include a bullet-point list of key features or specs (<ul><li>)
- Engaging, concise, informative
- No advertising sales pitch`,
        },
      ],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}
