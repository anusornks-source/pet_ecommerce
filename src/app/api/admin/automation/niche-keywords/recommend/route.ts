import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id, niche, niche_th, aiModel = "claude" } = await request.json();
  if (!id || !niche?.trim()) {
    return NextResponse.json({ success: false, error: "id and niche required" }, { status: 400 });
  }

  const nicheLabel = niche_th ? `${niche} (${niche_th})` : niche;

  const prompt = `คุณเป็นที่ปรึกษา dropshipping สัตว์เลี้ยงในตลาดไทย

Niche keyword: "${nicheLabel}"

วิเคราะห์และแนะนำ (ตอบภาษาไทย, กระชับ):

**สินค้าที่ควรขาย** (3-5 รายการ)
ระบุสินค้าที่น่าขายในนิชนี้ พร้อมเหตุผลสั้นๆ

**Pain point ของลูกค้า**
ปัญหาหลักที่เจ้าของสัตว์เลี้ยงเจอ ที่สินค้าในนิชนี้แก้ได้

**ขั้นตอนต่อไป**
ควรทำอะไรต่อ? (research keyword ไหน, ดู competitor ไหน, ทดสอบ ad แบบไหน)

ตอบแบบกระชับ bullet points ไม่เกิน 200 คำ`;

  try {
    let text = "";

    if (aiModel === "gpt") {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      });
      text = res.choices[0]?.message?.content?.trim() ?? "";
    } else {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      });
      text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    }

    if (!text) throw new Error("AI returned empty response");

    await prisma.nicheKeyword.update({
      where: { id },
      data: { aiRecommendation: text },
    });

    return NextResponse.json({ success: true, aiRecommendation: text });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "AI recommend failed" },
      { status: 500 }
    );
  }
}
