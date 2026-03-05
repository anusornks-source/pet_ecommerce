import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { name, description, sourceDescription, lang = "th" } = await request.json();

  if (!name && !description && !sourceDescription) {
    return NextResponse.json({ success: false, error: "ต้องมีข้อมูลสินค้าอย่างน้อย 1 อย่าง" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า" }, { status: 500 });
  }

  // Strip HTML tags for cleaner input
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const rawDesc = sourceDescription || description || "";
  const cleanDesc = stripHtml(rawDesc).slice(0, 1500); // limit tokens

  const isEn = lang === "en";

  const prompt = isEn
    ? `You are an online pet shop content writer.

Product name: ${name || "N/A"}
Product details (source): ${cleanDesc || "N/A"}

Write a short English description for display on a product card.
Rules:
- Maximum 2-3 sentences (under 120 characters)
- English only
- Highlight the main feature or benefit
- Short, concise, no sales pitch
- Plain text only — no HTML, no markdown, no quotes`
    : `คุณเป็นนักเขียนคอนเทนต์ร้านขายของออนไลน์ภาษาไทย

ชื่อสินค้า: ${name || "ไม่ระบุ"}
รายละเอียดสินค้า (ต้นฉบับ): ${cleanDesc || "ไม่ระบุ"}

เขียนคำอธิบายสั้นๆ ภาษาไทย สำหรับแสดงบน product card ในหน้าร้านค้าออนไลน์
กฎ:
- ไม่เกิน 2-3 ประโยค (ไม่เกิน 120 ตัวอักษร)
- เป็นภาษาไทยทั้งหมด ไม่มีภาษาอังกฤษ
- เน้นจุดเด่นหรือประโยชน์หลักของสินค้า
- สั้น กระชับ น่าอ่าน ไม่ต้องมีวลีเชิญชวนซื้อ
- ตอบเป็น plain text เท่านั้น ไม่มี HTML ไม่มี markdown ไม่มีเครื่องหมายคำพูด`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return NextResponse.json({ success: true, shortDescription: text });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
}
