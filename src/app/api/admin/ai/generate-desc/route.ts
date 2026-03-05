import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { name, description, sourceDescription } = await request.json();

  if (!name && !description && !sourceDescription) {
    return NextResponse.json({ success: false, error: "ต้องมีข้อมูลสินค้าอย่างน้อย 1 อย่าง" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า" }, { status: 500 });
  }

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const rawDesc = sourceDescription || description || "";
  const cleanDesc = stripHtml(rawDesc).slice(0, 2000);

  const prompt = `คุณเป็นนักเขียนคอนเทนต์ร้านขายของออนไลน์ภาษาไทย

ชื่อสินค้า: ${name || "ไม่ระบุ"}
รายละเอียดสินค้า (ต้นฉบับ): ${cleanDesc || "ไม่ระบุ"}

เขียนคำอธิบายสินค้าภาษาไทยแบบเต็ม สำหรับหน้ารายละเอียดสินค้า
กฎ:
- เป็นภาษาไทยทั้งหมด
- ใช้ HTML ได้ (<b>, <br>, <ul>, <li>, <p>) แต่ไม่ต้องมี <html>/<body>
- เริ่มด้วย paragraph แนะนำสินค้า
- มีรายการจุดเด่นหรือสเปก (ใช้ <ul><li>)
- เขียนให้น่าดึงดูด กระชับ ได้ใจความ
- ไม่ต้องมีวลีเชิญชวนซื้อแบบโฆษณา`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return NextResponse.json({ success: true, description: text });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
}
