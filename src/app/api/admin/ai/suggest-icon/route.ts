import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { name, name_th } = await request.json();

  if (!name && !name_th) {
    return NextResponse.json({ success: false, error: "ต้องระบุชื่อหมวดหมู่" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า" }, { status: 500 });
  }

  const label = name_th || name;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: `Reply with exactly ONE emoji that best represents this product category: "${label}". Only output the emoji character, nothing else.`,
        },
      ],
    });

    const emoji = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return NextResponse.json({ success: true, icon: emoji });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "AI generation failed",
    });
  }
}
