import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

async function aiComplete(model: "claude" | "gpt", prompt: string, maxTokens = 2500): Promise<string> {
  if (model === "gpt") {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  }

  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { shopId, aiModel = "claude" } = await request.json();

  try {
    const shop = shopId
      ? await prisma.shop.findUnique({
          where: { id: shopId },
          select: { name: true, description: true, description_th: true, usePetType: true },
        })
      : null;

    const [categories, products, petTypes] = await Promise.all([
      prisma.category.findMany({
        where: shopId ? { shopCategories: { some: { shopId } } } : undefined,
        select: { name: true },
        take: 20,
      }),
      prisma.product.findMany({
        where: shopId ? { shopId } : undefined,
        select: { name: true, name_th: true, category: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      shop?.usePetType
        ? prisma.petType.findMany({ select: { name: true }, orderBy: { order: "asc" } })
        : Promise.resolve([]),
    ]);

    const catNames = categories.map((c) => c.name).join(", ");
    const petNames = petTypes.map((p) => p.name).join(", ");
    const productSample = products
      .slice(0, 20)
      .map((p) => `${p.name_th || p.name} (${p.category?.name ?? "uncategorized"})`)
      .join("\n");

    const prompt = `คุณคือนักวิจัยตลาดสินค้าสัตว์เลี้ยงสำหรับร้านค้าไทย

ข้อมูลร้านค้า:
ชื่อร้าน: ${shop?.name || "ไม่ระบุ"}
รายละเอียดร้าน: ${shop?.description_th || shop?.description || "ไม่ระบุ"}
หมวดหมู่ที่มีอยู่แล้ว: ${catNames || "ยังไม่ระบุ"}
ประเภทสัตว์เลี้ยง: ${petNames || "ทั่วไป"}
สินค้าล่าสุด (${products.length} รายการ):
${productSample || "ยังไม่มีสินค้า"}

งาน:
1. วิเคราะห์ Pain Points (ปัญหา/ความต้องการ) ของเจ้าของสัตว์เลี้ยงชาวไทย
2. สำหรับแต่ละ Pain Point ให้ระบุว่า ร้านนี้แก้ปัญหาได้แล้วหรือไม่ (shopCanSolve)
   - true = ร้านมีหมวดหมู่/สินค้าที่ตอบสนองได้แล้ว
   - false = ยังเป็น gap / โอกาสใหม่

สร้าง 12 Pain Points กระจาย 5 หมวด: สุขภาพและการดูแล, ความสะดวกและการจัดการ, ความสวยงามและแฟชั่น, โภชนาการและอาหาร, ของเล่นและกิจกรรม

Return ONLY a JSON array (ไม่ต้องมีข้อความอื่น):
[{
  "category": "หมวดหมู่ภาษาไทย",
  "painPoint": "English description of the pain point (1-2 sentences)",
  "painPoint_th": "คำอธิบาย Pain Point ภาษาไทย (1-2 ประโยค)",
  "severity": "high|medium|low",
  "productOpportunity": "สินค้าที่แก้ปัญหานี้ได้ (ภาษาไทย)",
  "nicheKeyword": "english keyword for CJ search (2-4 words)",
  "shopCanSolve": true or false
}]

หลักเกณฑ์:
- severity: high = ปัญหาที่เจ้าของส่วนใหญ่เจอบ่อย, medium = เจอเป็นบางครั้ง, low = เจอน้อยแต่มีมูลค่าสูง
- nicheKeyword ต้องเป็นภาษาอังกฤษเท่านั้น เหมาะสำหรับค้นหาสินค้าบน CJ Dropshipping
- shopCanSolve: ดูจากหมวดหมู่และสินค้าที่มีอยู่ ถ้าร้านมีสินค้าที่ตอบโจทย์ pain point นี้แล้ว = true
- เน้นปัญหาจริงที่เจ้าของสัตว์เลี้ยงเจอในชีวิตประจำวัน`;

    const rawText = await aiComplete(aiModel, prompt, 4000);
    const text = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let painPoints: unknown[] = [];
    let parseError: string | null = null;

    // Try 1: Full JSON array match
    let match = text.match(/\[[\s\S]*\]/);

    // Try 2: Truncated JSON — attempt to close it
    if (!match && text.includes("[")) {
      let partial = text.slice(text.indexOf("["));
      // Remove trailing comma or incomplete object
      partial = partial.replace(/,\s*$/, "");
      // If it ends mid-object, try closing it
      if (!partial.endsWith("]")) {
        // Close any open object
        if (partial.includes("{") && !partial.endsWith("}")) {
          partial = partial.slice(0, partial.lastIndexOf("{"));
          partial = partial.replace(/,\s*$/, "");
        }
        if (!partial.endsWith("]")) partial += "]";
      }
      try {
        painPoints = JSON.parse(partial);
        match = [partial];
      } catch (e) {
        parseError = `JSON parse failed: ${e instanceof Error ? e.message : "unknown"}`;
      }
    }

    if (match && painPoints.length === 0) {
      try {
        painPoints = JSON.parse(match[0]);
      } catch (e) {
        parseError = `JSON parse failed: ${e instanceof Error ? e.message : "unknown"}`;
      }
    }

    return NextResponse.json({
      success: true,
      data: painPoints,
      _raw: rawText,
      _parseError: parseError,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate pain points",
    });
  }
}
