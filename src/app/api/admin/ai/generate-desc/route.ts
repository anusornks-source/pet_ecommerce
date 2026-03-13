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

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const rawDesc = sourceDescription || description || "";
  const cleanDesc = stripHtml(rawDesc).slice(0, 2000);

  const isEn = lang === "en";

  const prompt = isEn
    ? `You are an online pet shop content writer.

Product name: ${name || "N/A"}
Product details (source): ${cleanDesc || "N/A"}

Write a rich, detailed English product description for the product detail page.
Rules:
- English only
- Output HTML ONLY (no markdown, no plain text)
- Use <p> for paragraphs and <ul><li> for bullet lists (no <html>/<body>)
- Start with 1–2 introductory paragraphs (total 3–6 sentences)
- Then include a detailed bullet-point list of key features or specs (<ul><li>) with at least 6–10 bullets
- At the START of each <li>, add ONE short relevant emoji icon (e.g. ✅, 🐶, ✂️, 💡) that matches the meaning of that bullet
- Be faithful to the source details (do not invent new technical facts)
- Engaging, informative, but not too short
- No aggressive advertising sales pitch`
    : `คุณเป็นนักเขียนคอนเทนต์ร้านขายของออนไลน์ภาษาไทย

ชื่อสินค้า: ${name || "ไม่ระบุ"}
รายละเอียดสินค้า (ต้นฉบับ): ${cleanDesc || "ไม่ระบุ"}

เขียนคำอธิบายสินค้าภาษาไทยแบบเต็ม สำหรับหน้ารายละเอียดสินค้า
กฎ:
- เป็นภาษาไทยทั้งหมด
- แสดงผลเป็น HTML เท่านั้น (ไม่ใช้ markdown / plain text)
- ใช้ <p> สำหรับย่อหน้า และ <ul><li> สำหรับ bullet list (ไม่ต้องมี <html>/<body>)
- เริ่มด้วย 1–2 ย่อหน้าแนะนำสินค้า (รวมประมาณ 3–6 ประโยค) โดยเล่าให้เห็นภาพการใช้งานจริง
- จากนั้นทำรายการจุดเด่นหรือสเปกสินค้าเป็น bullet list (ใช้ <ul><li>) อย่างละเอียด อย่างน้อย 6–10 bullet ครอบคลุมคุณสมบัติ การใช้งาน วัสดุ ขนาด การดูแลรักษา ฯลฯ
- ที่จุดเริ่มต้นของแต่ละ <li> ให้ใส่อีโมจิ 1 ตัวที่สื่อความหมายของ bullet นั้น (เช่น ✅, 🐶, ✂️, 💡 ฯลฯ)
- เขียนให้ใกล้เคียงข้อมูลต้นฉบับมากที่สุด (ไม่แต่งเรื่องใหม่เกินจริง)
- ให้ความยาวรวมของคำอธิบายค่อนข้างยาวและละเอียด ไม่ควรสรุปสั้น ๆ แค่ไม่กี่บรรทัด
- ไม่นำเสนอแบบโฆษณาจัดหนัก`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1100,
      messages: [{ role: "user", content: prompt }],
    });

    let text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // บางครั้งโมเดลจะห่อผลลัพธ์ด้วย ```html … ``` ให้ลอก wrapper ออก
    text = text.replace(/^```(?:html|json)?\s*/i, "").replace(/```$/i, "").trim();

    return NextResponse.json({ success: true, description: text });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
}
